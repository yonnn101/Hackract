import { useEffect, useRef, useState, useCallback } from 'react';

export default function useWebSocket(sessionId, onMessage) {
  const [status, setStatus] = useState('offline');
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws/${sessionId}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus('online');
      clearTimeout(reconnectTimer.current);
    };

    ws.onclose = () => {
      setStatus('offline');
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessageRef.current(data);
      } catch { /* ignore malformed */ }
    };

    wsRef.current = ws;
  }, [sessionId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const send = useCallback((message) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ message, type: 'message' }));
    return true;
  }, []);

  const stop = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'stop' }));
  }, []);

  return { status, send, stop };
}
