import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useNotifications } from '../context/NotificationContext';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '')
    .replace('/api/v1', '') || 'http://localhost:4000';

const useNotificationSocket = (accessToken, user) => {
    const [socket, setSocket] = useState(null);
    const { addNotification } = useNotifications();

    const getPrefs = () => {
        const raw = localStorage.getItem(`hackract_notification_prefs_${user?.id || 'guest'}`);
        const saved = raw ? JSON.parse(raw) : {};
        return {
            chatMessages: true,
            projectInvitations: true,
            workflowChanges: true,
            newFinding: true,
            findingStatusChange: true,
            findingComment: true,
            ...saved
        };
    };

    useEffect(() => {
        if (!accessToken || !user) return;

        const newSocket = io(SOCKET_URL, {
            auth: { token: accessToken },
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('📡 Notification socket connected:', newSocket.id);
        });

        newSocket.on('connect_error', (err) => {
            console.error('📡 Notification socket connection error:', err.message);
        });

        // ── Global notifications ─────────────────────────────
        newSocket.on('notification', (data) => {
            const prefs = getPrefs();
            let allowed = true;
            if (data.type?.includes('INVITE') && prefs.projectInvitations === false) allowed = false;
            if (data.type?.includes('WORKFLOW') && prefs.workflowChanges === false) allowed = false;
            if (data.type === 'NEW_FINDING' && prefs.newFinding === false) allowed = false;
            if (data.type?.includes('STATUS_CHANGE') && prefs.findingStatusChange === false) allowed = false;
            if (data.type === 'FINDING_COMMENT' && prefs.findingComment === false) allowed = false;
            if (data.type === 'CHAT_MESSAGE' && prefs.chatMessages === false) allowed = false;
            
            // Suppress toast if user is actively viewing this specific conversation
            if (data.type === 'CHAT_MESSAGE' && window.activeConversationId === data.conversationId) allowed = false;

            if (!allowed) return;

            console.log('🔔 Notification received:', data);
            addNotification(data);

            // Audio chime for chat
            if (data.type === 'CHAT_MESSAGE') {
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
                    gain.gain.setValueAtTime(0, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.04);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.25);
                } catch (_) { /* audio blocked */ }
            }

            if (data.type === 'CHAT_MESSAGE') {
                const isOrg = user?.roles?.some(r => r.type === 'ORG_ADMIN');
                const isPA  = user?.roles?.some(r => r.type === 'PROJECT_ADMIN');
                const chatPath = isOrg ? '/org-messages' : isPA ? '/pa-messages' : '/messages';

                toast.custom((t) => (
                    <div
                        className={`${
                            t.visible ? 'animate-enter' : 'animate-leave'
                        } max-w-sm w-full bg-[#0d0d0d] border border-[#00c477]/20 shadow-[0_0_30px_rgba(0,196,119,0.1)] rounded-2xl pointer-events-auto flex overflow-hidden`}
                    >
                        <div className="w-1 bg-[#00c477] shrink-0" />
                        <div className="flex-1 p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center text-[#00c477] font-black text-sm shrink-0">
                                    {(data.title || '?')[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <p className="text-[12px] font-black text-white tracking-wide">{data.title}</p>
                                        <span className="text-[9px] text-gray-600 font-mono">
                                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 font-mono leading-relaxed truncate">{data.message}</p>
                                    <button
                                        onClick={() => {
                                            toast.dismiss(t.id);
                                            window.location.href = chatPath;
                                        }}
                                        className="mt-2 text-[10px] text-[#00c477] font-bold uppercase tracking-widest hover:underline"
                                    >
                                        View Message →
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => toast.dismiss(t.id)} className="px-3 text-gray-600 hover:text-white transition-colors text-lg leading-none">×</button>
                    </div>
                ), { duration: 7000, position: 'top-right' });
            } else {
                toast.custom((t) => (
                    <div
                        className={`${
                            t.visible ? 'animate-enter' : 'animate-leave'
                        } max-w-md w-full bg-[#111] border border-white/10 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5`}
                    >
                        <div className="flex-1 w-0 p-4">
                            <div className="flex items-start">
                                <div className="shrink-0 pt-0.5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                        data.type === 'INVITE_RECEIVED' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30' :
                                        data.type === 'INVITE_REJECTED' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' :
                                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    }`}>
                                        {data.type === 'INVITE_RECEIVED' ? 'M' : 'S'}
                                    </div>
                                </div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm font-bold text-white">{data.title || 'New Alert'}</p>
                                    <p className="mt-1 text-xs text-gray-400 font-mono">{data.message}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex border-l border-white/10">
                            <button
                                onClick={() => toast.dismiss(t.id)}
                                className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-white/40 hover:text-white transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ), { duration: 6000, position: 'top-right' });
            }
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [accessToken, user]);

    return socket;
};

export default useNotificationSocket;
