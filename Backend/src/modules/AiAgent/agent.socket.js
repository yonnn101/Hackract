import { WebSocket } from 'ws';
import prisma from '../../database/prismaClient.js';
import { getPythonWsUrl } from './agent.proxy.js';

const pythonSockets = new Map();

const verifyAgentAccess = async (sessionId, userId) => {
    if (!sessionId || !userId) return false;
    const agent = await prisma.aiAgent.findUnique({
        where: { id: sessionId },
        select: { userId: true },
    });
    return agent?.userId === userId;
};

const connectPythonSocket = (sessionId) => {
    if (pythonSockets.has(sessionId)) {
        const existing = pythonSockets.get(sessionId);
        if (existing.readyState <= 1) return existing;
        existing.close();
    }
    const url = getPythonWsUrl(sessionId);
    console.log('[agent.socket] connecting to python ws', { sessionId, url });
    const pyWs = new WebSocket(url);
    pythonSockets.set(sessionId, pyWs);

    pyWs.on('close', () => {
        if (pythonSockets.get(sessionId) === pyWs) {
            pythonSockets.delete(sessionId);
        }
    });

    pyWs.on('error', () => {
        console.error('[agent.socket] python ws error', { sessionId });
        try { pyWs.close(); } catch (e) {}
    });

    pyWs.on('open', () => {
        console.log('[agent.socket] python ws OPEN', { sessionId });
    });

    pyWs.on('close', (code, reason) => {
        console.log('[agent.socket] python ws CLOSED', { sessionId, code, reason: reason?.toString?.() });
    });

    pyWs.on('message', (raw) => {
        try {
            const s = raw.toString();
            console.log('[agent.socket] python -> raw message', { sessionId, snippet: s.slice ? s.slice(0,240) : String(s) });
        } catch (e) {
            console.error('[agent.socket] error logging raw python message', e);
        }
    });

    return pyWs;
};

export const setupAgentSocket = (io, decodeSocketUser) => {
    const agentNamespace = io.of('/ai-agent');

    agentNamespace.on('connection', async (socket) => {
        const { sessionId } = socket.handshake.query;
        const userId = await decodeSocketUser(socket);

        if (!sessionId) {
            socket.emit('agent-event', { type: 'error', content: 'Missing sessionId' });
            socket.disconnect();
            return;
        }

        if (!userId) {
            socket.emit('agent-event', { type: 'error', content: 'Unauthorized' });
            socket.disconnect();
            return;
        }

        const allowed = await verifyAgentAccess(sessionId, userId);
        if (!allowed) {
            socket.emit('agent-event', { type: 'error', content: 'Agent session not found or access denied' });
            socket.disconnect();
            return;
        }

        console.log(`🤖 AI Agent client connected: ${socket.id} (session: ${sessionId})`);
        console.log('[agent.socket] handshake', { id: socket.id, sessionId, headers: Object.keys(socket.handshake.headers || {}) });

        const pyWs = connectPythonSocket(sessionId);

        const relayFromPython = (raw) => {
            try {
                const payload = JSON.parse(raw.toString());
                console.log('[agent.socket] relay from python', payload?.type || 'message', (payload?.content || '').slice ? (payload.content || '').slice(0,120) : undefined);
                socket.emit('agent-event', payload);
            } catch (err) {
                console.error('[agent.socket] malformed agent response', err);
                socket.emit('agent-event', { type: 'error', content: 'Malformed agent response' });
            }
        };

        if (pyWs.readyState === WebSocket.OPEN) {
            pyWs.on('message', relayFromPython);
        } else {
            pyWs.once('open', () => {
                console.log('[agent.socket] python socket opened for session', sessionId);
                pyWs.on('message', relayFromPython);
            });
            pyWs.once('error', (err) => {
                console.error('[agent.socket] python socket error', err);
                socket.emit('agent-event', {
                    type: 'error',
                    content: 'Could not connect to AI Agent service. Is it running on port 8008?',
                });
            });
        }

        const handleClientMessage = (payload) => {
            console.log('[agent.socket] received message from client', { payloadSnippet: typeof payload === 'string' ? payload.slice(0,120) : payload?.message?.slice(0,120) });
            const text = typeof payload === 'string' ? payload : payload?.message;
            if (!text?.trim()) return;

            const send = () => {
                    console.log('[agent.socket] forwarding to python', { sessionId, text: text.slice(0,120), pyReady: pyWs.readyState });
                    try {
                        pyWs.send(JSON.stringify({ type: 'message', message: text }));
                    } catch (err) {
                        console.error('[agent.socket] failed to send to python ws', { sessionId, err: err?.message || err });
                        socket.emit('agent-event', { type: 'error', content: 'Failed to forward message to AI Agent service.' });
                    }
            };
            if (pyWs.readyState === WebSocket.OPEN) {
                send();
            } else {
                pyWs.once('open', send);
            }
        };

        socket.on('message', handleClientMessage);
        socket.on('agent-message', handleClientMessage);

        socket.on('stop', () => {
            if (pyWs.readyState === WebSocket.OPEN) {
                pyWs.send(JSON.stringify({ type: 'stop' }));
            }
        });

        socket.on('disconnect', () => {
            console.log(`🤖 AI Agent client disconnected: ${socket.id}`);
            pyWs.removeListener('message', relayFromPython);
        });
    });
};
