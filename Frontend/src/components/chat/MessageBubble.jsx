import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import { fmtTime, fmtSize, avatarBg, isImageMime, isVideoMime } from './ChatHelpers';

const FileIcon = ({ mime, size = 18 }) => {
  const isImg = mime?.startsWith('image/');
  const isPdf = mime === 'application/pdf';
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      {isImg ? (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>)
        : isPdf ? (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15h6M9 11h6M9 7h3" /></>)
        : (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>)}
    </svg>
  );
};

export default function MessageBubble({ message, isOwn, onReply, onEdit, onDelete, groupStart = true, groupEnd = true }) {
  const [hover, setHover] = useState(false);
  const deleted = !!message.deletedAt;
  const isVoice = message.type === 'VOICE';
  const isImage = message.type === 'IMAGE' || (message.fileUrl && isImageMime(message.fileMime));
  const isVideo = message.type === 'VIDEO' || (message.fileUrl && isVideoMime(message.fileMime));
  const senderName = message.sender?.fullName || message.sender?.handle;
  const replySenderName = message.replyTo?.sender?.fullName || message.replyTo?.sender?.handle;
  const isRead = message.readBy?.some(r => r.userId !== message.senderId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex gap-2.5 items-end ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${groupStart ? 'mt-3' : 'mt-1'}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!isOwn && groupStart ? <Avatar user={message.sender} size={32} /> : <div className="w-8 shrink-0" />}

      <div className={`flex flex-col max-w-[74%] sm:max-w-[66%] ${isOwn ? 'items-end text-right' : 'items-start text-left'}`}>
        {!isOwn && groupStart && senderName && (
          <span className="text-[11px] font-semibold mb-1 ml-1 font-mono" style={{ color: avatarBg(message.sender?.id) }}>
            {senderName}
          </span>
        )}

        {/* Reply preview */}
        {message.replyTo && !deleted && (
          <button
            type="button"
            onClick={() => onReply?.(message.replyTo)}
            className={`mb-1.5 max-w-full rounded-xl px-3 py-2 border-l-2 transition-colors ${isOwn ? 'bg-black/10 border-black/20 hover:bg-black/15 text-right' : 'bg-white/5 border-[#00c477]/50 hover:bg-white/6 text-left'}`}
          >
            <p className="text-[10px] font-semibold mb-0.5" style={{ color: avatarBg(message.replyTo.sender?.id) }}>
              {replySenderName}
            </p>
            <p className={`text-xs truncate ${isOwn ? 'text-[#dcecff]/75' : 'text-gray-400'}`}>{message.replyTo.content}</p>
          </button>
        )}

        <div className="flex items-end gap-1.5">
          {/* Hover actions */}
          <AnimatePresence>
            {hover && !deleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className={`flex items-center gap-0.5 mb-1 ${isOwn ? 'order-first' : 'order-last'}`}
              >
                <button onClick={() => onReply(message)} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-gray-500 hover:text-gray-300 flex items-center justify-center transition-all" title="Reply">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                </button>
                {isOwn && (<>
                  <button onClick={() => onEdit(message)} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-gray-500 hover:text-gray-300 flex items-center justify-center transition-all" title="Edit">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button onClick={() => onDelete(message.id)} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-red-500/20 text-gray-500 hover:text-red-400 flex items-center justify-center transition-all" title="Delete">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6m5 0V4h4v2" /></svg>
                  </button>
                </>)}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bubble */}
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isOwn ? `bg-[#2b6fb6] text-white text-right ${groupEnd ? 'rounded-br-md' : 'rounded-br-2xl'} shadow-[0_8px_22px_rgba(43,111,182,0.16)]` : `bg-[#1d2732] text-gray-100 text-left ${groupEnd ? 'rounded-bl-md' : 'rounded-bl-2xl'} border border-white/6`} ${deleted ? 'opacity-40 italic' : ''}`}
            style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
          >
            {deleted ? (<span className="text-xs">Message deleted</span>) : (<>
              {/* System message */}
              {message.type === 'SYSTEM' && (
                <div className="flex items-center gap-2 text-xs opacity-70">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                  <span>{message.content}</span>
                </div>
              )}

              {/* Image */}
              {isImage && message.fileUrl && (
                <a href={message.fileUrl} target="_blank" rel="noreferrer" className="block mb-2">
                  <img src={message.fileUrl} alt={message.fileName || 'Image'} className="max-w-[280px] max-h-[200px] rounded-xl object-cover" />
                </a>
              )}

              {/* Video */}
              {isVideo && message.fileUrl && (
                <video controls className="max-w-[280px] max-h-[200px] rounded-xl mb-2" src={message.fileUrl} />
              )}

              {/* Voice message */}
              {isVoice && message.fileUrl && (
                <div className={`flex items-center gap-2 mb-1 px-2 py-1.5 rounded-xl ${isOwn ? 'bg-black/10 justify-end' : 'bg-black/20 justify-start'}`}>
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" />
                    <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <audio controls src={message.fileUrl} className="h-8 w-40" />
                  {message.audioDuration > 0 && <span className="text-[10px] opacity-60">{Math.floor(message.audioDuration / 60)}:{String(message.audioDuration % 60).padStart(2, '0')}</span>}
                </div>
              )}

              {/* File attachment (non-image/video/voice) */}
              {message.fileUrl && !isImage && !isVideo && !isVoice && (
                <a href={message.fileUrl} target="_blank" rel="noreferrer"
                  className={`flex items-center gap-2.5 mb-2 px-3 py-2 rounded-xl transition-colors ${isOwn ? 'bg-black/10 hover:bg-black/20 justify-end' : 'bg-black/20 hover:bg-black/30 justify-start'}`}>
                  <FileIcon mime={message.fileMime} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate max-w-[150px]">{message.fileName || 'File'}</p>
                    {message.fileSize && <p className={`text-[10px] ${isOwn ? 'text-[#004d2e]' : 'text-gray-500'}`}>{fmtSize(message.fileSize)}</p>}
                  </div>
                  <svg className="w-3.5 h-3.5 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </a>
              )}

              {/* Text content */}
              {message.content && message.type !== 'SYSTEM' && <span>{message.content}</span>}
            </>)}

            {/* Time + status */}
            <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {message.isEdited && !deleted && <span className={`text-[9px] ${isOwn ? 'text-[#dcecff]/75' : 'text-gray-600'}`}>edited</span>}
              <span className={`text-[10px] ${isOwn ? 'text-[#dcecff]/75' : 'text-gray-500'}`}>{fmtTime(message.createdAt)}</span>
              {isOwn && !deleted && (
                <svg className="w-3.5 h-3.5 text-[#dcecff]/80" viewBox="0 0 16 11" fill="currentColor">
                  <path d="M11.071.653a.75.75 0 0 1 .025 1.06l-6.5 7a.75.75 0 0 1-1.085 0l-3-3.5a.75.75 0 1 1 1.138-.976L4.01 7.06l5.99-6.44a.75.75 0 0 1 1.07.033Z" />
                  {isRead && (
                    <path d="M14.07.653a.75.75 0 0 1 .025 1.06l-6.5 7a.75.75 0 0 1-1.085 0 .75.75 0 0 1 0-1.06l6.5-7a.75.75 0 0 1 1.06-.025z" />
                  )}
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
