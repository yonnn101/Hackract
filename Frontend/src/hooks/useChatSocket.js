import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function useChatSocket({
  token,
  currentUserId,
  onNewMessage,
  onPresenceUpdate,
  onTyping,
  onStopTyping,
  onReadReceipt,
  onMessageEdited,
  onMessageDeleted,
}) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const typingTimers = useRef({});

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Chat socket connected');
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Chat socket disconnected:', reason);
      setConnected(false);
    });

    socket.on('reconnect', (attempt) => {
      console.log(`🔌 Chat socket reconnected after ${attempt} attempts`);
    });

    // ── Message events ──────────────────────────────────────────────────
    socket.on('chat:new-message', (message) => {
      onNewMessage?.(message);
    });

    socket.on('chat:message-edited', (message) => {
      onMessageEdited?.(message);
    });

    socket.on('chat:message-deleted', ({ conversationId, messageId }) => {
      onMessageDeleted?.(conversationId, messageId);
    });

    // ── Presence events ─────────────────────────────────────────────────
    socket.on('chat:presence-update', ({ userId, isOnline, lastSeenAt }) => {
      onPresenceUpdate?.(userId, isOnline, lastSeenAt);
    });

    // ── Typing events ───────────────────────────────────────────────────
    socket.on('chat:typing', ({ userId, conversationId }) => {
      onTyping?.(userId, conversationId);
    });

    socket.on('chat:stop-typing', ({ userId, conversationId }) => {
      onStopTyping?.(userId, conversationId);
    });

    // ── Read receipts ───────────────────────────────────────────────────
    socket.on('chat:read-receipt', ({ conversationId, userId, readAt }) => {
      onReadReceipt?.(conversationId, userId, readAt);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const joinConversation = useCallback((conversationId) => {
    socketRef.current?.emit('chat:join', { conversationId });
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    socketRef.current?.emit('chat:leave', { conversationId });
  }, []);

  const emitTypingStart = useCallback((conversationId) => {
    socketRef.current?.emit('chat:typing-start', { conversationId });
    // Auto-stop typing after 3 seconds of no input
    clearTimeout(typingTimers.current[conversationId]);
    typingTimers.current[conversationId] = setTimeout(() => {
      socketRef.current?.emit('chat:typing-stop', { conversationId });
    }, 3000);
  }, []);

  const emitTypingStop = useCallback((conversationId) => {
    clearTimeout(typingTimers.current[conversationId]);
    socketRef.current?.emit('chat:typing-stop', { conversationId });
  }, []);

  const emitMarkRead = useCallback((conversationId) => {
    socketRef.current?.emit('chat:mark-read', { conversationId });
  }, []);

  return {
    socket: socketRef.current,
    connected,
    joinConversation,
    leaveConversation,
    emitTypingStart,
    emitTypingStop,
    emitMarkRead,
  };
}
