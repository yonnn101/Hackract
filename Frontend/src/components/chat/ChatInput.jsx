import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmtDuration, fmtSize } from './ChatHelpers';
import { uploadFile } from '../../api/chatApi';

export default function ChatInput({ onSend, onTypingStart, onTypingStop, conversationId, editing, onCancelEdit, replyTo, onCancelReply }) {
  const [text, setText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recTimerRef = useRef(null);

  // Sync editing content
  if (editing && text === '' && editing._syncText) {
    setText(editing.content);
    editing._syncText = false;
    setTimeout(() => { textareaRef.current?.focus(); resizeTextarea(); }, 50);
  }

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  const handleSend = async () => {
    const content = text.trim();
    const hasContent = content || attachedFile || audioBlob;
    if (!hasContent) return;

    let fileData = null;
    if (attachedFile || audioBlob) {
      const file = audioBlob ? new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' }) : attachedFile;
      try {
        fileData = await uploadFile(file);
      } catch (e) { 
        console.error('Upload failed', e); 
        import('react-hot-toast').then(t => t.default.error('Upload failed. Please try again.'));
        return;
      }
    }

    const payload = {
      content: content || (audioBlob ? '🎤 Voice message' : attachedFile?.name || 'File'),
      type: audioBlob ? 'VOICE' : (attachedFile ? (attachedFile.type?.startsWith('image/') ? 'IMAGE' : attachedFile.type?.startsWith('video/') ? 'VIDEO' : 'FILE') : 'TEXT'),
      replyToId: replyTo?.id,
      ...(fileData && { fileUrl: fileData.fileUrl, fileName: fileData.fileName, fileSize: fileData.fileSize, fileMime: fileData.fileMime }),
      ...(audioBlob && { audioDuration: recDuration }),
    };

    onSend(payload, editing);
    setText('');
    setAttachedFile(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecDuration(0);
    onTypingStop?.(conversationId);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    resizeTextarea();
    if (e.target.value.trim()) onTypingStart?.(conversationId);
    else onTypingStop?.(conversationId);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    setAudioBlob(null);
    setAudioUrl(null);
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        import('react-hot-toast').then(t => t.default.error('Audio recording requires HTTPS or localhost connection.'));
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setRecDuration(0);
      setAttachedFile(null);
      recTimerRef.current = setInterval(() => setRecDuration((d) => d + 1), 1000);
    } catch (e) { 
      console.error('Microphone access denied', e);
      import('react-hot-toast').then(t => t.default.error('Microphone access denied or not available.'));
    }
  };

  const stopRecording = () => { clearInterval(recTimerRef.current); mediaRecorderRef.current?.stop(); };
  const cancelRecording = () => { clearInterval(recTimerRef.current); mediaRecorderRef.current?.stop(); setIsRecording(false); setRecDuration(0); setAudioBlob(null); setAudioUrl(null); };
  const canSend = !!(text.trim() || attachedFile || audioBlob);

  return (
    <div className="px-5 py-4 border-t border-white/[0.05] bg-[#0d0d0d] shrink-0">
      {/* Reply / edit banner */}
      <AnimatePresence>
        {(replyTo || editing) && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-3 mb-3 pl-3 border-l-2 border-[#00c477] bg-white/[0.03] rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono font-black text-[#00c477] uppercase tracking-widest mb-0.5">
                {editing ? 'Editing' : `↩ ${replyTo?.sender?.fullName}`}
              </p>
              <p className="text-xs text-gray-500 truncate">{editing ? editing.content : replyTo?.content}</p>
            </div>
            <button onClick={() => { if (editing) { onCancelEdit(); setText(''); } else onCancelReply(); }}
              className="w-5 h-5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-gray-500 hover:text-white transition-colors shrink-0">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attached file preview */}
      <AnimatePresence>
        {attachedFile && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-2.5 mb-3 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5">
            {attachedFile.type?.startsWith('image/') ? (
              <img src={URL.createObjectURL(attachedFile)} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center text-gray-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{attachedFile.name}</p>
              <p className="text-[10px] text-gray-500">{fmtSize(attachedFile.size)}</p>
            </div>
            <button onClick={() => setAttachedFile(null)} className="w-5 h-5 rounded-full bg-white/[0.08] hover:bg-red-500/20 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors shrink-0">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice recording preview */}
      <AnimatePresence>
        {audioUrl && !isRecording && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-3 mb-3 bg-[#00c477]/[0.06] border border-[#00c477]/20 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00c477]/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#00c477]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /></svg>
            </div>
            <audio controls src={audioUrl} className="flex-1 h-8" />
            <span className="text-xs text-[#00c477] font-mono">{fmtDuration(recDuration)}</span>
            <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }} className="w-5 h-5 rounded-full bg-white/[0.08] hover:bg-red-500/20 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors shrink-0">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording in progress */}
      <AnimatePresence>
        {isRecording && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-3 mb-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
            <motion.div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
            <span className="text-sm font-mono text-red-400">Recording — {fmtDuration(recDuration)}</span>
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={cancelRecording} className="text-xs text-gray-500 hover:text-red-400 font-mono transition-colors">Cancel</button>
              <button onClick={stopRecording} className="ml-2 flex items-center gap-1.5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>Stop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input row */}
      {!isRecording && (
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-gray-500 hover:text-gray-300 transition-all shrink-0 mb-0.5" title="Attach file">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
          </button>
          <div className="flex-1 relative">
            <textarea ref={textareaRef} value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
              placeholder={editing ? 'Edit message...' : 'Write a message...'} rows={1}
              className="w-full bg-[#1a1a1a] border border-white/[0.07] rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00c477]/30 focus:bg-[#1c1c1c] transition-all resize-none leading-relaxed"
              style={{ minHeight: '44px', maxHeight: '140px' }} />
          </div>
          {canSend ? (
            <motion.button onClick={handleSend} whileTap={{ scale: 0.92 }}
              className="w-10 h-10 rounded-xl bg-[#00c477] hover:bg-[#00d485] flex items-center justify-center text-[#041a0f] transition-all shadow-[0_0_16px_rgba(0,196,119,0.3)] shrink-0 mb-0.5" title="Send">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </motion.button>
          ) : (
            <button onClick={startRecording}
              className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-red-500/10 hover:border-red-500/30 border border-white/[0.05] flex items-center justify-center text-gray-500 hover:text-red-400 transition-all shrink-0 mb-0.5" title="Record voice">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
            </button>
          )}
        </div>
      )}
      {!isRecording && !editing && (
        <p className="text-[10px] text-gray-700 font-mono mt-2 text-center">Enter to send · Shift+Enter for new line · 🎤 for voice · 📎 for files</p>
      )}
    </div>
  );
}
