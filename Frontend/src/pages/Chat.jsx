import { useState, useEffect, useRef, useCallback } from 'react';
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
      <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 block"
        animate={{ y: [0, -5, 0] }} transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }} />
    ))}
  </div>
);

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (err) {
    console.debug('Notification sound disabled', err);
  }
};

export default function Chat() {
  const { user, accessToken } = useAuth();
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
    setMessages((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]);
    setConversations((prev) =>
      prev.map((c) => c.id === msg.conversationId
        ? { ...c, lastMessageAt: msg.createdAt, lastMessagePreview: msg.content?.slice(0, 80) || '📎' }
        : c).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
    );
  }, []);

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

  const { connected, joinConversation, leaveConversation: leaveConv, emitTypingStart, emitTypingStop, emitMarkRead } =
    useChatSocket({ token: accessToken, currentUserId: user?.id, onNewMessage: handleNewMessage, onPresenceUpdate: handlePresenceUpdate, onTyping: handleTyping, onStopTyping: handleStopTyping, onMessageEdited: handleMessageEdited, onMessageDeleted: handleMessageDeleted });

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
    try {
      const result = await chatApi.getMessages(conv.id);
      setMessages(result.messages); setNextCursor(result.nextCursor); setHasMore(result.hasMore);
      emitMarkRead(conv.id); chatApi.markRead(conv.id).catch(() => {});
      setConversations((prev) => prev.map((c) => c.id === conv.id
        ? { ...c, participants: c.participants?.map((p) => p.userId === user?.id ? { ...p, unreadCount: 0 } : p) } : c));
    } catch (e) { console.error(e); } finally { setLoadingMsgs(false); }
  }, [joinConversation, leaveConv, emitTypingStop, emitMarkRead, user?.id]);

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
    catch (e) { 
      console.error(e); 
      import('react-hot-toast').then(t => t.default.error('Failed to send message.'));
    }
  }, [active, replyTo, user]);

  const handleDelete = useCallback(async (messageId) => {
    if (!active) return;
    try { await chatApi.deleteMessage(active.id, messageId); setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m)); }
    catch (e) { console.error(e); }
  }, [active]);

  const startEdit = (msg) => { setEditing({ ...msg, _syncText: true }); };

  const handleInvitationSent = useCallback(async (result) => {
    if (result?.conversations) {
      setConversations(result.conversations);
    } else {
      try { setConversations(await chatApi.getConversations()); } catch { /* ignore */ }
    }
    if (result?.conversation) openConversation(result.conversation);
  }, [openConversation]);

  const activeOther = active?.type === 'DIRECT' ? active.participants?.find((p) => p.userId !== user?.id)?.user : null;
  const isOtherOnline = activeOther ? (presenceMap[activeOther.id]?.isOnline ?? false) : false;
  const lastSeen = activeOther ? presenceMap[activeOther.id]?.lastSeenAt : null;
  const typingIds = active ? Object.keys(typingMap[active.id] || {}).filter((id) => id !== user?.id) : [];

  return (
    <div className="flex h-full bg-[#0d0d0d] overflow-hidden" style={{ height: 'calc(100vh - 40px)' }}>
      <ChatSidebar user={user} conversations={conversations} active={active} presenceMap={presenceMap} connected={connected} onSelect={openConversation} loadingConvs={loadingConvs} onInvitationSent={handleInvitationSent} />

      {active ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d]">
          {/* Header */}
          <div className="px-6 py-3.5 border-b border-white/[0.05] flex items-center justify-between bg-[#0d0d0d]/80 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3">
              {active.type === 'GROUP' ? (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00c477]/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-white font-bold text-sm">{getInitials(active.name || 'G')}</div>
              ) : (<Avatar user={activeOther} size={40} showStatus isOnline={isOtherOnline} />)}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-bold text-sm leading-tight">{active.type === 'GROUP' ? active.name : (activeOther?.fullName || activeOther?.handle)}</h2>
                </div>
                <p className="text-xs font-mono mt-px">
                  {active.type === 'GROUP' ? (<span className="text-gray-600">{active.participants?.length} members</span>)
                    : isOtherOnline ? (<span className="text-[#00c477]">online now</span>)
                    : (<span className="text-gray-600">{fmtLastSeen(lastSeen)}</span>)}
                </p>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(0,196,119,0.025) 0%, transparent 65%)' }}>
            {hasMore && (
              <div className="flex justify-center py-1">
                <button onClick={loadMore} disabled={loadingMsgs} className="text-[#00c477]/70 hover:text-[#00c477] text-xs font-mono transition-colors disabled:opacity-40">
                  {loadingMsgs ? 'Loading...' : '↑ Load older messages'}
                </button>
              </div>
            )}
            {loadingMsgs && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-[#00c477]/30 border-t-[#00c477] rounded-full animate-spin" /></div>
            ) : (<>
              {messages.map((msg, idx) => {
                const prev = messages[idx - 1];
                const showDate = !prev || new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-white/[0.05]" />
                        <span className="text-[10px] font-mono text-gray-600 bg-[#161616] border border-white/[0.05] px-3 py-1 rounded-full">
                          {new Date(msg.createdAt).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 h-px bg-white/[0.05]" />
                      </div>
                    )}
                    <MessageBubble message={msg} isOwn={msg.senderId === user?.id} onReply={setReplyTo} onEdit={startEdit} onDelete={handleDelete} />
                  </div>
                );
              })}
              {typingIds.length > 0 && (
                <div className="flex items-end gap-2.5">
                  <Avatar user={active.participants?.find((p) => p.userId === typingIds[0])?.user} size={32} />
                  <div className="bg-[#1c1c1c] border border-white/[0.06] rounded-2xl rounded-bl-[6px] px-4 py-2"><TypingDots /></div>
                </div>
              )}
            </>)}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput conversationId={active.id} onSend={handleSend} onTypingStart={emitTypingStart} onTypingStop={emitTypingStop}
            editing={editing} onCancelEdit={() => setEditing(null)} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0d0d0d]">
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 text-center max-w-xs">
            <div className="w-20 h-20 rounded-[24px] bg-[#00c477]/[0.08] border border-[#00c477]/20 flex items-center justify-center shadow-[0_0_50px_rgba(0,196,119,0.08)]">
              <svg className="w-9 h-9 text-[#00c477]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight mb-2">HackRact Messaging</h2>
              <p className="text-sm text-gray-600 font-mono leading-relaxed">Real-time secure messaging between organizations and security researchers. Send text, images, files, voice and video.</p>
            </div>
            <div className="flex items-center gap-2 text-gray-700 text-xs font-mono">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              End-to-end encrypted
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
