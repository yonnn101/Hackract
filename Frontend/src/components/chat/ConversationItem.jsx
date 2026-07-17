import Avatar from './Avatar';
import { fmtDate, getInitials, isOrgUser } from './ChatHelpers';

export default function ConversationItem({ conv, isActive, myId, presenceMap, onClick }) {
  const other = conv.participants?.find((p) => p.userId !== myId)?.user;
  const isGroup = conv.type === 'GROUP';
  const name = isGroup ? conv.name : (other?.fullName || other?.handle || 'Unknown');
  // presenceMap is real-time; fall back to the presence stored on the user object from DB
  const online = !isGroup && (presenceMap[other?.id]?.isOnline ?? other?.presence?.isOnline ?? false);
  const unread = conv.participants?.find((p) => p.userId === myId)?.unreadCount || 0;
  const otherIsOrg = !isGroup && isOrgUser(other);

  return (
    <button
      onClick={() => onClick(conv)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-150 text-left border-b border-white/4 relative
        ${isActive
          ? 'bg-[#00c477]/[0.07] border-l-2 border-l-[#00c477]'
          : 'hover:bg-white/3 border-l-2 border-l-transparent'}`}
    >
      {isGroup ? (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00c477]/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {getInitials(conv.name || 'G')}
        </div>
      ) : (
        <Avatar user={other} size={42} showStatus isOnline={online} />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`font-semibold text-sm truncate ${isActive ? 'text-[#00c477]' : 'text-white'}`}>
            {name}
          </span>
          <span className="text-[10px] text-gray-600 shrink-0 ml-2">{fmtDate(conv.lastMessageAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[9px] font-mono font-black uppercase tracking-wider px-1.5 py-px rounded shrink-0
            ${isGroup
              ? 'bg-purple-500/10 text-purple-400'
              : otherIsOrg
                ? 'bg-blue-500/10 text-blue-400'
                : 'bg-[#00c477]/10 text-[#00c477]'}`}>
            {isGroup ? 'group' : otherIsOrg ? 'organization' : 'researcher'}
          </span>
          <p className="text-[11px] text-gray-600 truncate flex-1 ml-1">
            {conv.lastMessagePreview || 'No messages yet'}
          </p>
          {unread > 0 && (
            <span className="bg-[#00c477] text-[#041a0f] text-[9px] font-black rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1 shrink-0">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
