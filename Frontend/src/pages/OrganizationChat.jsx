import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useChatSocket } from '../hooks/useChatSocket';
import * as chatApi from '../api/chatApi';
import { useAuth } from '../context/authContext';
import Avatar from '../components/chat/Avatar';
import MessageBubble from '../components/chat/MessageBubble';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatInput from '../components/chat/ChatInput';
import { fmtLastSeen, getInitials } from '../components/chat/ChatHelpers';

const TypingDots = () => (
  <div className="flex items-center gap-1 py-1">
    {[0, 1, 2].map((i) => (
      <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-[#00c477] block"
        animate={{ y: [0, -5, 0] }} transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }} />
    ))}
  </div>
);

import { useNotifications } from '../context/NotificationContext';

export default function OrganizationChat() {
  const { user, accessToken } = useAuth();
  const { markChatAsRead } = useNotifications();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [presenceMap, setPresenceMap] = useState({});
  const [typingMap, setTypingMap] = useState({});
  const messagesEndRef = useRef(null);
  const prevConvId = useRef(null);

  const handleNewMessage = useCallback((msg) => {
    setMessages((prev) => {
      if (active?.id !== msg.conversationId) return prev;
      return prev.find((m) => m.id === msg.id) ? prev : [...prev, msg];
    });
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === msg.conversationId) {
          const isViewing = active?.id === msg.conversationId;
          const isSender = msg.senderId === user?.id;
          return {
            ...c,
            lastMessageAt: msg.createdAt,
            lastMessagePreview: msg.content?.slice(0, 80) || '📎',
            participants: c.participants?.map((p) =>
              p.userId === user?.id && !isSender && !isViewing
                ? { ...p, unreadCount: (p.unreadCount || 0) + 1 }
                : p
            ),
          };
        }
        return c;
      }).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0))
    );
    if (active && msg.conversationId === active.id && msg.senderId !== user?.id) {
      chatApi.markRead(active.id).catch(() => { });
      markChatAsRead(active.id);
    }
  }, [active?.id, markChatAsRead, user?.id]);

  const handlePresenceUpdate = useCallback((userId, isOnline, lastSeenAt) => {
    setPresenceMap((prev) => ({ ...prev, [userId]: { isOnline, lastSeenAt } }));
  }, []);

  const handleTyping = useCallback((userId, conversationId) => {
    if (userId === user?.id) return;
    setTypingMap((prev) => ({ ...prev, [conversationId]: { ...(prev[conversationId] || {}), [userId]: true } }));
  }, [user?.id]);

  const handleStopTyping = useCallback((userId, conversationId) => {
    setTypingMap((prev) => { const u = { ...(prev[conversationId] || {}) }; delete u[userId]; return { ...prev, [conversationId]: u }; });
  }, []);

  const handleMessageEdited = useCallback((msg) => {
    setMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m));
  }, []);

  const handleMessageDeleted = useCallback((_, messageId) => {
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m));
  }, []);

  const handleReadReceipt = useCallback((conversationId, userId, readAt) => {
    if (active?.id !== conversationId) return;
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.senderId === user?.id) {
          const alreadyRead = msg.readBy?.some((r) => r.userId === userId);
          if (!alreadyRead) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), { userId, readAt }],
            };
          }
        }
        return msg;
      })
    );
  }, [active?.id, user?.id]);

  const { connected, joinConversation, leaveConversation: leaveConv, emitTypingStart, emitTypingStop, emitMarkRead } =
    useChatSocket({
      token: accessToken,
      currentUserId: user?.id,
      onNewMessage: handleNewMessage,
      onPresenceUpdate: handlePresenceUpdate,
      onTyping: handleTyping,
      onStopTyping: handleStopTyping,
      onMessageEdited: handleMessageEdited,
      onMessageDeleted: handleMessageDeleted,
      onReadReceipt: handleReadReceipt,
    });

  useEffect(() => {
    if (!user) return;
    chatApi.getConversations().then((convs) => {
      setConversations(convs);
      const pMap = {};
      convs.forEach(c => {
        c.participants?.forEach(p => {
          if (p.user?.presence) pMap[p.user.id] = p.user.presence;
        });
      });
      setPresenceMap((prev) => ({ ...prev, ...pMap }));
    }).catch(console.error).finally(() => setLoadingConvs(false));
  }, [user]);

  // Sync active conversation globally for notification filter
  useEffect(() => {
    window.activeConversationId = active?.id || null;
    return () => {
      window.activeConversationId = null;
    };
  }, [active]);

  const openConversation = useCallback(async (conv) => {
    if (prevConvId.current) { leaveConv(prevConvId.current); emitTypingStop(prevConvId.current); }
    setActive(conv); prevConvId.current = conv.id;
    setMessages([]); setNextCursor(null); setHasMore(false); setReplyTo(null); setEditing(null);
    joinConversation(conv.id); setLoadingMsgs(true);
    markChatAsRead(conv.id);
    try {
      const result = await chatApi.getMessages(conv.id);
      setMessages(result.messages); setNextCursor(result.nextCursor); setHasMore(result.hasMore);
      emitMarkRead(conv.id); chatApi.markRead(conv.id).catch(() => { });
      setConversations((prev) => prev.map((c) => c.id === conv.id
        ? { ...c, participants: c.participants?.map((p) => p.userId === user?.id ? { ...p, unreadCount: 0 } : p) } : c));
    } catch (e) { console.error(e); } finally { setLoadingMsgs(false); }
  }, [joinConversation, leaveConv, emitTypingStop, emitMarkRead, user?.id, markChatAsRead]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || !active || loadingMsgs) return;
    setLoadingMsgs(true);
    try {
      const result = await chatApi.getMessages(active.id, nextCursor);
      setMessages((prev) => [...result.messages, ...prev]); setNextCursor(result.nextCursor); setHasMore(result.hasMore);
    } catch (e) { console.error(e); } finally { setLoadingMsgs(false); }
  }, [hasMore, nextCursor, active, loadingMsgs]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = useCallback(async (payload, editingMsg) => {
    if (!active) return;
    if (editingMsg) {
      try { const updated = await chatApi.editMessage(active.id, editingMsg.id, payload.content); setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m)); }
      catch (e) { console.error(e); }
      setEditing(null); return;
    }
    setReplyTo(null);
    try {
      const msg = await chatApi.sendMessage(active.id, payload);
      setMessages((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]);
    }
    catch (e) { console.error(e); }
  }, [active]);

  const handleDelete = useCallback(async (messageId) => {
    if (!active) return;
    try { await chatApi.deleteMessage(active.id, messageId); setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m)); }
    catch (e) { console.error(e); }
  }, [active]);

  const handleInvitationSent = useCallback(async (result) => {
    if (result?.conversations) setConversations(result.conversations);
    if (result?.conversation) openConversation(result.conversation);
  }, [openConversation]);

  const activeOther = active?.type === 'DIRECT' ? active.participants?.find((p) => p.userId !== user?.id)?.user : null;
  const isOtherOnline = activeOther ? (presenceMap[activeOther.id]?.isOnline ?? false) : false;
  const lastSeen = activeOther ? presenceMap[activeOther.id]?.lastSeenAt : null;
  const typingIds = active ? Object.keys(typingMap[active.id] || {}).filter((id) => id !== user?.id) : [];

  return (
    <div className="flex h-full bg-[#050505] overflow-hidden" style={{ height: 'calc(100vh - 40px)' }}>
      <ChatSidebar user={user} conversations={conversations} active={active} presenceMap={presenceMap} connected={connected} onSelect={openConversation} loadingConvs={loadingConvs} onInvitationSent={handleInvitationSent} targetRole="PENTESTER" />

      {active ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#050505] border-l border-white/5">
          {/* Header */}
          <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-[#050505]/80 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-4">
              {active.type === 'GROUP' ? (
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-mono font-black text-xs uppercase tracking-widest">{getInitials(active.name || 'G')}</div>
              ) : (<Avatar user={activeOther} size={42} showStatus isOnline={isOtherOnline} />)}
              <div>
                <h2 className="text-white font-black text-xs uppercase tracking-[0.2em] font-mono leading-none mb-1.5">{active.type === 'GROUP' ? active.name : (activeOther?.fullName || activeOther?.handle)}</h2>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isOtherOnline ? 'bg-[#00c477] shadow-[0_0_8px_#00c477]' : 'bg-gray-700'}`} />
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                    {isOtherOnline ? 'Active Session' : fmtLastSeen(lastSeen)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 font-mono">
            {hasMore && (
              <div className="flex justify-center pb-4">
                <button onClick={loadMore} className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 hover:text-[#00c477] transition-colors">
                  [ Load_Historical_Logs ]
                </button>
              </div>
            )}
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user?.id} onReply={setReplyTo} onEdit={(m) => setEditing(m)} onDelete={handleDelete} />
            ))}
            {typingIds.length > 0 && <div className="text-[9px] text-[#00c477] font-black uppercase tracking-widest animate-pulse">Typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput conversationId={active.id} onSend={handleSend} onTypingStart={emitTypingStart} onTypingStop={emitTypingStop}
            editing={editing} onCancelEdit={() => setEditing(null)} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#050505]">
          <div className="text-center space-y-4 max-w-sm">
            <div className="inline-flex p-4 rounded-2xl bg-white/2 border border-white/5 mb-4">
              <svg className="w-10 h-10 text-[#00c477]" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <h2 className="text-xs font-black text-white uppercase tracking-[0.4em] font-mono">Secure_Comms_v2.0</h2>
            <p className="text-[10px] text-gray-600 font-mono leading-loose uppercase tracking-widest">
              Establish encrypted tunnels with verified security researchers. Peer-to-peer data exchange active.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
