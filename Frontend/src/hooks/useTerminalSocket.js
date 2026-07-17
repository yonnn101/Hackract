import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export const useTerminalSocket = (workflowId) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const onOutputRef = useRef(null);

  useEffect(() => {
    if (!workflowId) return;

    const newSocket = io(`${SOCKET_URL}/terminal`, {
      transports: ['websocket'],
      query: { workflowId },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log(`💻 Terminal connected to project: ${workflowId}`);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('💻 Terminal disconnected');
    });

    newSocket.on('output', (data) => {
      if (onOutputRef.current) {
        onOutputRef.current(data);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [workflowId]);

  const sendInput = useCallback((data) => {
    if (socket?.connected) {
      socket.emit('input', data);
    }
  }, [socket]);

  const sendResize = useCallback((size) => {
    if (socket?.connected) {
      socket.emit('resize', size);
    }
  }, [socket]);

  const setOnOutput = useCallback((callback) => {
    onOutputRef.current = callback;
  }, []);

  return {
    isConnected,
    sendInput,
    sendResize,
    setOnOutput,
  };
};
