import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import ConversationItem from './ConversationItem';
import * as chatApi from '../../api/chatApi';
import { isOrgUser } from './ChatHelpers';

export default function ChatSidebar({ user, conversations, active, presenceMap, connected, onSelect, loadingConvs, onInvitationSent, targetRole }) {
  const isOrg = isOrgUser(user);
  const [sideSearch, setSideSearch] = useState('');
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findResults, setFindResults] = useState([]);
  const [findLoading, setFindLoading] = useState(false);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [inviteText, setInviteText] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState(targetRole || 'ALL');

  useEffect(() => {
    setSelectedRoleFilter(targetRole || 'ALL');
  }, [targetRole]);

  /* Load ALL users when panel opens; filter on type */
  useEffect(() => {
    if (!showFind) return;
    const delay = findQuery.trim() ? 300 : 0;
    const t = setTimeout(async () => {
      setFindLoading(true);
      try {
        const roleParam = selectedRoleFilter === 'ALL' ? undefined : selectedRoleFilter;
        setFindResults(await chatApi.searchUsers(findQuery, roleParam));
      }
      catch { setFindResults([]); }
      finally { setFindLoading(false); }
    }, delay);
    return () => clearTimeout(t);
  }, [findQuery, showFind, selectedRoleFilter]);

  /* Start a direct conversation and send the first message as invitation text */
  const sendInvitation = async () => {
    if (!inviteTarget || !inviteText.trim()) return;
    try {
      const conv = await chatApi.startDirectConversation(inviteTarget.id);
      await chatApi.sendMessage(conv.id, { content: inviteText.trim(), type: 'TEXT' });
      const all = await chatApi.getConversations();
      setInviteTarget(null); setInviteText(''); setShowFind(false); setFindQuery('');
      onInvitationSent?.({ conversation: conv, conversations: all });
    } catch (e) { console.error(e); }
  };

  const filtered = conversations.filter((c) => {
    if (!sideSearch.trim()) return true;
    const q = sideSearch.toLowerCase();
    const other = c.participants?.find((p) => p.userId !== user?.id)?.user;
    const name = c.type === 'GROUP' ? c.name : (other?.fullName || other?.handle || '');
    return name?.toLowerCase().includes(q);
  });

  return (
    <>
      {/* Main sidebar */}
      <div className={`flex flex-col border-r border-white/[0.06] bg-[#111] transition-all duration-300 ${showFind ? 'w-0 overflow-hidden' : 'w-[320px] shrink-0'}`}>
        <div className="px-4 pt-5 pb-3 border-b border-white/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-white font-black text-base tracking-tight">Messages</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#00c477]' : 'bg-gray-600'}`} />
                <span className="text-[10px] font-mono text-gray-600">{connected ? 'Connected' : 'Reconnecting...'}</span>
              </div>
            </div>
            {/* Any user can search; button label changes by role */}
            <button onClick={() => setShowFind(true)}
              className="flex items-center gap-1.5 bg-[#00c477] hover:bg-[#00d485] text-[#041a0f] font-black text-[11px] px-3 py-2 rounded-xl transition-all shadow-[0_0_12px_rgba(0,196,119,0.25)] active:scale-95">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              {isOrg ? 'Contact' : 'New Chat'}
            </button>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input value={sideSearch} onChange={(e) => setSideSearch(e.target.value)} placeholder="Search conversations..."
              className="w-full bg-white/[0.04] border border-white/[0.05] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/30 transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-[#00c477]/30 border-t-[#00c477] rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 gap-4 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <p className="text-sm text-gray-600">No conversations yet</p>
              <button onClick={() => setShowFind(true)} className="text-[#00c477] text-xs font-semibold hover:underline">Find someone to chat →</button>
            </div>
          ) : filtered.map((c) => (
            <ConversationItem key={c.id} conv={c} isActive={active?.id === c.id} myId={user?.id} presenceMap={presenceMap} onClick={onSelect} />
          ))}
        </div>
        {user && (
          <div className="px-4 py-3 border-t border-white/[0.05] flex items-center gap-3">
            <Avatar user={user} size={36} showStatus isOnline />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user.fullName || user.handle}</p>
              <p className="text-[10px] text-gray-600 font-mono">@{user.handle || 'user'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Find user panel */}
      <AnimatePresence>
        {showFind && (
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}
            className="w-[320px] shrink-0 flex flex-col border-r border-white/[0.06] bg-[#111]">
            <div className="px-4 pt-5 pb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => { setShowFind(false); setFindQuery(''); setFindResults([]); setInviteTarget(null); }}
                  className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <div>
                  <h2 className="text-white font-black text-sm">Find a User</h2>
                  <p className="text-[10px] text-gray-600 font-mono">Search by name, handle or email</p>
                </div>
              </div>
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input autoFocus value={findQuery} onChange={(e) => setFindQuery(e.target.value)} placeholder="Search by name or @handle..."
                  className="w-full bg-white/[0.04] border border-white/[0.05] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/30 transition-all" />
              </div>
              {/* Role filter tabs */}
              <div className="flex gap-1 bg-white/[0.02] border border-white/[0.05] p-1 rounded-xl">
                {[
                  { label: 'All', value: 'ALL' },
                  { label: 'Hackers', value: 'PENTESTER' },
                  { label: 'Orgs', value: 'ORG_ADMIN' }
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedRoleFilter(t.value)}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-mono text-[9px] uppercase tracking-wider font-bold transition-all text-center
                      ${selectedRoleFilter === t.value
                        ? 'bg-[#00c477]/10 text-[#00c477] border border-[#00c477]/20 shadow-[0_0_8px_rgba(0,196,119,0.1)]'
                        : 'bg-transparent border border-transparent text-gray-400 hover:text-white'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {findLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div className="w-5 h-5 border-2 border-[#00c477]/30 border-t-[#00c477] rounded-full animate-spin" />
                  <p className="text-[10px] text-gray-600 font-mono">Loading users...</p>
                </div>
              ) : findResults.length === 0 ? (
                <p className="text-center text-gray-600 text-sm py-10 font-mono">
                  {findQuery.trim() ? 'No users found' : 'No registered users yet'}
                </p>
              ) : (
                <>
                  {findResults.some((u) => u.presence?.isOnline) && (
                    <p className="text-[9px] font-mono font-black uppercase tracking-widest text-[#00c477]/60 px-4 pt-3 pb-1.5">
                      ● Online — {findResults.filter((u) => u.presence?.isOnline).length} of {findResults.length}
                    </p>
                  )}
                  {findResults.map((u) => {
                    const uIsOrg = isOrgUser(u);
                    const online = u.presence?.isOnline;
                    return (
                      <button key={u.id} onClick={() => setInviteTarget(u)}
                        className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] transition-all text-left
                          ${inviteTarget?.id === u.id
                            ? 'bg-[#00c477]/[0.07] border-l-2 border-l-[#00c477]'
                            : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'}`}>
                        <Avatar user={u} size={40} showStatus isOnline={online} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-semibold text-white truncate">{u.fullName || u.handle}</p>
                            {online && <span className="w-1.5 h-1.5 rounded-full bg-[#00c477] shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-mono font-black uppercase tracking-wider px-1.5 py-px rounded
                              ${uIsOrg ? 'bg-blue-500/10 text-blue-400' : 'bg-[#00c477]/10 text-[#00c477]'}`}>
                              {uIsOrg ? 'organization' : 'researcher'}
                            </span>
                            {u.handle && <p className="text-[11px] text-gray-600 font-mono truncate">@{u.handle}</p>}
                          </div>
                        </div>
                        <span className={`text-[11px] font-semibold shrink-0 ${online ? 'text-[#00c477]' : 'text-gray-700'}`}>
                          {online ? 'Online' : 'Offline'}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
            <AnimatePresence>
              {inviteTarget && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="border-t border-white/[0.06] bg-[#0d0d0d] p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Avatar user={inviteTarget} size={32} />
                    <div><p className="text-xs font-semibold text-white">{inviteTarget.fullName}</p><p className="text-[10px] text-gray-500 font-mono">@{inviteTarget.handle}</p></div>
                    <button onClick={() => setInviteTarget(null)} className="ml-auto w-6 h-6 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                  <textarea value={inviteText} onChange={(e) => setInviteText(e.target.value)}
                    placeholder={`Hi ${inviteTarget.fullName?.split(' ')[0] || 'there'}, I'd like to connect with you...`}
                    rows={3} className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/30 resize-none transition-all mb-3" />
                  <button onClick={sendInvitation} disabled={!inviteText.trim()}
                    className="w-full bg-[#00c477] hover:bg-[#00d485] disabled:opacity-30 disabled:cursor-not-allowed text-[#041a0f] font-black text-sm py-2.5 rounded-xl transition-all shadow-[0_0_16px_rgba(0,196,119,0.25)] active:scale-[0.98]">
                    Send Invitation & Start Chat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
