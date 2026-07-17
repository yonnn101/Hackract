import { WebSocket } from 'ws';

const AI_AGENT_BASE_URL = (process.env.AI_AGENT_URL || 'http://127.0.0.1:8008').replace(/\/$/, '');
const AI_AGENT_WS_URL = (process.env.AI_AGENT_WS_URL || 'ws://127.0.0.1:8008').replace(/\/$/, '');

const parseJson = async (res) => {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return { detail: text || res.statusText };
    }
};

export const getPythonWsUrl = (sessionId) => `${AI_AGENT_WS_URL}/ws/${sessionId}`;

export const checkAgentHealth = async () => {
    const res = await fetch(`${AI_AGENT_BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    const body = await parseJson(res);
    if (!res.ok) {
        throw new Error(body.detail || `AI Agent health check failed (${res.status})`);
    }
    return body;
};

export const sendAgentMessage = async (sessionId, message) => {
    const res = await fetch(`${AI_AGENT_BASE_URL}/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: sessionId }),
        signal: AbortSignal.timeout(300000),
    });
    const body = await parseJson(res);
    if (!res.ok) {
        throw new Error(body.detail || body.message || `AI Agent request failed (${res.status})`);
    }
    return body;
};

export const stopPythonAgent = async (sessionId) => {
    const res = await fetch(`${AI_AGENT_BASE_URL}/api/session/${sessionId}/stop`, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
    });
    return parseJson(res);
};

export const getPythonSessionHistory = async (sessionId) => {
    const res = await fetch(`${AI_AGENT_BASE_URL}/api/session/${sessionId}/history`, {
        signal: AbortSignal.timeout(10000),
    });
    const body = await parseJson(res);
    if (!res.ok) {
        if (res.status === 404) return { messages: [] };
        throw new Error(body.detail || `Failed to fetch session history (${res.status})`);
    }
    return body;
};

export const clearPythonSession = async (sessionId) => {
    const res = await fetch(`${AI_AGENT_BASE_URL}/api/session/${sessionId}/clear`, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
    });
    return parseJson(res);
};

export const streamAgentMessage = async (sessionId, message, { onEvent, signal, timeoutMs = 300000 } = {}) => {
    const wsUrl = getPythonWsUrl(sessionId);

    return await new Promise((resolve, reject) => {
        let settled = false;
        const ws = new WebSocket(wsUrl);

        const cleanup = () => {
            clearTimeout(timer);
            if (signal) signal.removeEventListener('abort', onAbort);
            ws.removeAllListeners();
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };

        const finish = (err, value) => {
            if (settled) return;
            settled = true;
            cleanup();
            if (err) reject(err);
            else resolve(value);
        };

        const timer = setTimeout(() => {
            finish(new Error('AI Agent stream timed out'));
        }, timeoutMs);

        const onAbort = () => finish(new Error('Client aborted stream'));
        if (signal) {
            if (signal.aborted) return finish(new Error('Client aborted stream'));
            signal.addEventListener('abort', onAbort, { once: true });
        }

        ws.on('open', () => {
            ws.send(JSON.stringify({ message }));
        });

        ws.on('message', (raw) => {
            let payload;
            try {
                payload = JSON.parse(raw.toString());
            } catch {
                payload = { type: 'error', content: 'Malformed response from AI Agent service' };
            }

            onEvent?.(payload);

            if (payload.type === 'response') {
                return finish(null, {
                    response: payload.content || '',
                    session_id: sessionId,
                    timestamp: payload.timestamp || new Date().toISOString(),
                    status: 'SUCCESS',
                });
            }

            if (payload.type === 'error') {
                return finish(new Error(payload.content || 'AI Agent stream failed'));
            }
        });

        ws.on('error', (err) => {
            finish(new Error(err?.message || 'Failed to connect AI Agent stream'));
        });

        ws.on('close', () => {
            if (!settled) {
                finish(new Error('AI Agent stream closed before completion'));
            }
        });
    });
};
