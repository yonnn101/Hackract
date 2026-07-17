import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './authContext.jsx';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id || 'guest';
    const storageKey = `hackract_notifications_${userId}`;

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Sync from localStorage whenever user changes
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        const list = saved ? JSON.parse(saved) : [];
        setNotifications(list);
        setUnreadCount(list.filter(n => !n.isRead).length);
    }, [storageKey]);

    const addNotification = useCallback((notification) => {
        const newNotification = {
            id: Date.now(),
            isRead: false,
            ...notification,
            timestamp: notification.timestamp || new Date().toISOString()
        };
        setNotifications(prev => {
            const updated = [newNotification, ...prev].slice(0, 50);
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
        setUnreadCount(prev => prev + 1);
    }, [storageKey]);

    const markAsRead = useCallback((id) => {
        setNotifications(prev => {
            const updated = prev.map(n => 
                n.id === id && !n.isRead ? { ...n, isRead: true } : n
            );
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, [storageKey]);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, isRead: true }));
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
        setUnreadCount(0);
    }, [storageKey]);

    const markChatAsRead = useCallback((conversationId) => {
        setNotifications(prev => {
            const updated = prev.map(n => 
                n.type === 'CHAT_MESSAGE' && n.conversationId === conversationId && !n.isRead 
                ? { ...n, isRead: true } 
                : n
            );
            localStorage.setItem(storageKey, JSON.stringify(updated));
            
            // Recalculate unread count
            const newUnread = updated.filter(n => !n.isRead).length;
            setUnreadCount(newUnread);
            
            return updated;
        });
    }, [storageKey]);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
        localStorage.removeItem(storageKey);
    }, [storageKey]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markChatAsRead,
            markAllAsRead,
            clearNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
