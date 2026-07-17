import { useState, useCallback, useRef, useEffect } from 'react';
import { useAgentSocket } from './useAgentSocket';
import * as agentApi from '../services/agent.service';

const formatTime = () =>
  new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const wsEventToLog = (event) => {
  const time = formatTime();
  const { type, content = '', meta = {} } = event;

  if (type === 'done') return null;

  switch (type) {
    case 'status':
      return { time, message: content, level: 'info' };
    case 'thinking':
    case 'thought':
      return { time, message: content?.slice(0, 200) || 'Thinking…', level: 'thinking' };
    case 'tool':
      return {
        time,
        message: meta.tool_name ? `Tool: ${meta.tool_name}` : content,
        level: 'tool',
      };
    case 'terminal_stream':
      return { time, message: content, level: 'terminal', stream: true };
    case 'response':
      return { time, message: content, level: 'response' };
    case 'error':
      return { time, message: content, level: 'error' };
    default:
      return { time, message: content || type, level: 'info' };
  }
};

/**
 * Manages an AI agent scan session: create/resume DB session, stream via Socket.io → Python proxy.
 */
export default function useScanSession({
  sessionId: initialSessionId,
  pentestId,
  name,
  onLogsChange,
  onStatusChange,
}) {
  const [sessionId, setSessionId] = useState(initialSessionId || null);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('Idle');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const pendingMessageRef = useRef(null);

  const pushLog = useCallback((entry) => {
    setLogs((prev) => {
      const last = prev[prev.length - 1];
      if (entry.stream && last?.stream && last.level === 'terminal') {
        const merged = [...prev];
        merged[merged.length - 1] = {
          ...last,
          message: last.message + entry.message,
        };
        return merged;
      }
      return [...prev, entry];
    });
  }, []);

  const handleAgentEvent = useCallback((event) => {
    const entry = wsEventToLog(event);
    if (entry) pushLog(entry);

    if (event.type === 'error') {
      setError(event.content || 'Agent error');
    }

    if (event.type === 'status' && event.content === 'Processing...') {
      setError('');
      setStatus('Running');
      setProcessing(true);
    }
    if (event.type === 'response' || event.type === 'error') {
      setStatus(event.type === 'error' ? 'Error' : 'Idle');
      setProcessing(false);
    }
  }, [pushLog]);

  const { status: socketStatus, sendMessage, stop: stopSocket } = useAgentSocket(sessionId, handleAgentEvent);

  // Keep stable refs to parent callbacks so we don't cause effect re-triggers
  const onLogsChangeRef = useRef(onLogsChange);
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onLogsChangeRef.current = onLogsChange; }, [onLogsChange]);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  useEffect(() => {
    if (initialSessionId && initialSessionId !== sessionId) {
      setSessionId(initialSessionId);
    }
  }, [initialSessionId, sessionId]);

  useEffect(() => {
    if (socketStatus !== 'online' || !sessionId || !pendingMessageRef.current) return;
    const text = pendingMessageRef.current;
    pendingMessageRef.current = null;
    if (sendMessage(text)) return;
    pendingMessageRef.current = text;
  }, [socketStatus, sessionId, sendMessage]);

  // Notify parent of log updates after state has settled to avoid setState-in-render
  useEffect(() => {
    // Only notify parent when logs actually changed to avoid update loops
    if (logs && logs.length) {
      try {
        const prev = onLogsChangeRef._lastEmittedLogs;
        const cur = JSON.stringify(logs);
        if (prev !== cur) {
          onLogsChangeRef.current?.(logs);
          onLogsChangeRef._lastEmittedLogs = cur;
        }
      } catch (e) {
        // fallback: emit without comparison if stringify fails
        onLogsChangeRef.current?.(logs);
      }
    }
  }, [logs]);

  // Notify parent when status changes
  useEffect(() => {
    // Only notify parent when status changed to avoid update loops
    try {
      const prev = onStatusChangeRef._lastEmittedStatus;
      if (prev !== status) {
        onStatusChangeRef.current?.(status);
        onStatusChangeRef._lastEmittedStatus = status;
      }
    } catch (e) {
      onStatusChangeRef.current?.(status);
    }
  }, [status]);

  const initialize = useCallback(async (objective) => {
    try {
      setError('');
      setStatus('Initializing');
      onStatusChange?.('Initializing');

      let id = sessionId;
      if (!id) {
        const agent = await agentApi.createAgentSession({
          pentestId,
          name: name || 'Workflow Agent',
        });
        id = agent.id;
        setSessionId(id);
      }

      if (pentestId) {
        await agentApi.deployAgent(id, pentestId).catch(() => {});
      }

      pushLog({ time: formatTime(), message: `Session ${id} ready`, level: 'info' });

      const objectiveText = (objective || '').trim();
      if (objectiveText) {
        pushLog({ time: formatTime(), message: `Objective: ${objectiveText}`, level: 'info' });
        setProcessing(true);
        setStatus('Running');
        onStatusChange?.('Running');

        pendingMessageRef.current = objectiveText;
        if (sendMessage(objectiveText)) {
          pendingMessageRef.current = null;
        }
      } else {
        setStatus('Ready');
        onStatusChange?.('Ready');
      }

      return id;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to initialize agent';
      setError(msg);
      pushLog({ time: formatTime(), message: msg, level: 'error' });
      setStatus('Error');
      onStatusChange?.('Error');
      throw err;
    }
  }, [sessionId, pentestId, name, sendMessage, pushLog, onStatusChange]);

  const send = useCallback(async (message) => {
    const text = (message || '').trim();
    if (!text || !sessionId) return false;

    setError('');
    pushLog({ time: formatTime(), message: `> ${text}`, level: 'info' });
    setProcessing(true);
    setStatus('Running');
    onStatusChange?.('Running');

    if (sendMessage(text)) return true;

    try {
      await agentApi.streamChatWithAgent(sessionId, text, handleAgentEvent);
    } catch {
      try {
        const result = await agentApi.chatWithAgent(sessionId, text);
        handleAgentEvent({ type: 'response', content: result?.response || 'Completed' });
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to send message to agent';
        setError(msg);
        pushLog({ time: formatTime(), message: msg, level: 'error' });
        setStatus('Error');
        onStatusChange?.('Error');
        throw err;
      }
    }

    if (processing) {
      setProcessing(false);
      setStatus('Idle');
      onStatusChange?.('Idle');
    }
    return true;
  }, [sessionId, sendMessage, pushLog, onStatusChange, handleAgentEvent, processing]);

  const stop = useCallback(async () => {
    setError('');
    stopSocket();
    if (sessionId) {
      await agentApi.stopAgent(sessionId).catch(() => {});
    }
    pushLog({ time: formatTime(), message: 'Agent stopped', level: 'info' });
    setProcessing(false);
    setStatus('Idle');
    onStatusChange?.('Idle');
  }, [sessionId, stopSocket, pushLog, onStatusChange]);

  const loadHistory = useCallback(async () => {
    if (!sessionId) return;
    try {
      setError('');
      const data = await agentApi.getAgentLogs(sessionId);
      const fromDb = (data.dbMessages || []).map((m) => ({
        time: m.ts ? new Date(m.ts).toLocaleTimeString('en-US', { hour12: false }) : formatTime(),
        message: m.content,
        level: m.role === 'assistant' ? 'response' : 'info',
      }));
      const fromPy = (data.pythonHistory || []).map((m) => ({
        time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-US', { hour12: false }) : formatTime(),
        message: m.content,
        level: m.role === 'assistant' ? 'response' : 'info',
      }));
      const merged = [...fromDb, ...fromPy];
      if (merged.length) {
        setLogs(merged);
        onLogsChange?.(merged);
      }
    } catch (err) {
      const msg = err.message || 'Could not load agent history';
      setError(msg);
      console.warn('Could not load agent history', err);
    }
  }, [sessionId, onLogsChange]);

  return {
    sessionId,
    logs,
    status,
    processing,
    socketStatus,
    initialize,
    send,
    stop,
    loadHistory,
    setLogs,
    error,
    setError,
  };
}
