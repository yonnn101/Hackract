import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const STORAGE_KEYS = { ACCESS: 'hackract_access_token' };

export const useAgentSocket = (sessionId, onEvent) => {
  const [status, setStatus] = useState('offline');
  const socketRef = useRef(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!sessionId) return undefined;

    console.debug('[useAgentSocket] connecting', { socketUrl: SOCKET_URL, sessionId });
    const socket = io(`${SOCKET_URL}/ai-agent`, {
      transports: ['websocket'],
      query: { sessionId },
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.debug('[useAgentSocket] connected', { id: socket.id });
      setStatus('online');
    });
    socket.on('disconnect', (reason) => {
      console.debug('[useAgentSocket] disconnected', { reason });
      setStatus('offline');
    });
    socket.on('connect_error', (err) => {
      console.debug('[useAgentSocket] connect_error', err);
      setStatus('error');
    });

    socket.on('agent-event', (payload) => {
      console.debug('[useAgentSocket] agent-event', payload);
      onEventRef.current?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const sendMessage = useCallback((message) => {
    if (socketRef.current?.connected) {
      console.debug('[useAgentSocket] emitting message', { message: message?.slice(0,80) });
      socketRef.current.emit('message', { message });
      return true;
    }
    console.debug('[useAgentSocket] unable to emit, socket not connected');
    return false;
  }, []);

  const stop = useCallback(() => {
    socketRef.current?.emit('stop');
  }, []);

  return { status, sendMessage, stop };
};
