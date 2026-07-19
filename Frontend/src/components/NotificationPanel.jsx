import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiCheck, FiInfo, FiAlertCircle, FiTrash2, FiMessageSquare } from 'react-icons/fi';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext.jsx';

const NotificationPanel = ({ isOpen, onClose }) => {
    const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleNotificationClick = (notif) => {
        markAsRead(notif.id);
        
        if (notif.type === 'CHAT_MESSAGE') {
            const isOrg = user?.roles?.some(r => r.type === 'ORG_ADMIN');
            const isPA  = user?.roles?.some(r => r.type === 'PROJECT_ADMIN');
            if (isOrg) navigate('/org-messages');
            else if (isPA) navigate('/pa-messages');
            else navigate('/messages');
        } else if (notif.pentestId) {
            const isOrg = user?.roles?.some(r => r.type === 'ORG_ADMIN');
            if (isOrg) {
                navigate(`/org-projects/${notif.pentestId}`);
            } else {
                navigate(`/projects/${notif.pentestId}`);
            }
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-16 right-0 w-80 sm:w-96 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-100 overflow-hidden"
        >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/2">
                <div className="flex items-center gap-2">
                    <FiBell className="text-[#00c477]" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Operations Feed</h3>
                </div>
                <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                        <button 
                            onClick={markAllAsRead}
                            className="text-[10px] text-gray-500 hover:text-white transition-colors uppercase font-bold"
                        >
                            Mark All Read
                        </button>
                    )}
                    <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
                        <FiX size={18} />
                    </button>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                            <FiBell className="text-gray-600" />
                        </div>
                        <p className="text-xs text-gray-500 font-mono">NO ACTIVE DIRECTIVES</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {notifications.map((notif) => (
                            <div 
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-4 hover:bg-white/5 transition-all cursor-pointer group relative ${!notif.isRead ? 'bg-[#00c477]/5' : ''}`}
                            >
                                {!notif.isRead && (
                                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#00c477]" />
                                )}
                                <div className="flex gap-3">
                                    <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${
                                        notif.type === 'CHAT_MESSAGE' ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' :
                                        notif.type === 'INVITE_RECEIVED' ? 'bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88]' :
                                        notif.type === 'INVITE_REJECTED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                    }`}>
                                        {notif.type === 'CHAT_MESSAGE' ? <FiMessageSquare /> :
                                         notif.type === 'INVITE_RECEIVED' ? <FiInfo /> : 
                                         notif.type === 'INVITE_REJECTED' ? <FiAlertCircle /> : <FiCheck />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[12px] font-bold text-white truncate pr-4">
                                                {notif.title}
                                            </p>
                                            <span className="text-[9px] text-gray-600 font-mono whitespace-nowrap">
                                                {new Date(notif.createdAt || notif.timestamp || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {notifications.length > 0 && (
                <div className="p-3 bg-white/2 border-t border-white/5 flex justify-center">
                    <button 
                        onClick={clearNotifications}
                        className="flex items-center gap-2 text-[10px] text-gray-600 hover:text-red-400 transition-colors uppercase font-bold"
                    >
                        <FiTrash2 size={12} /> Clear Operational Log
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default NotificationPanel;
