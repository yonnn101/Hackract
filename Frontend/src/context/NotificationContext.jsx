import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './authContext.jsx';
import * as notificationApi from '../api/notificationApi';
import * as chatApi from '../api/chatApi';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id;

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

    // Fetch from backend whenever user changes
    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        notificationApi.getNotifications().then((res) => {
            setNotifications(res.notifications || []);
        }).catch(console.error);

        notificationApi.getUnreadCount().then((count) => {
            setUnreadCount(count || 0);
        }).catch(console.error);

        chatApi.getUnreadMessagesCount().then((count) => {
            setUnreadMessagesCount(count || 0);
        }).catch(console.error);
    }, [userId]);

    const addNotification = useCallback((notification) => {
        // Assume notification from socket already has an ID from backend
        setNotifications(prev => [notification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
        if (notification.type === 'CHAT_MESSAGE' && window.activeConversationId !== notification.conversationId) {
            setUnreadMessagesCount(prev => prev + 1);
        }
    }, []);

    const markAsRead = useCallback((id) => {
        setNotifications(prev => prev.map(n => 
            n.id === id && !n.isRead ? { ...n, isRead: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
        notificationApi.markAsRead(id).catch(console.error);
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        notificationApi.markAllAsRead().catch(console.error);
    }, []);

    const markChatAsRead = useCallback((conversationId) => {
        setNotifications(prev => {
            let changed = false;
            const updated = prev.map(n => {
                if (n.type === 'CHAT_MESSAGE' && n.conversationId === conversationId && !n.isRead) {
                    changed = true;
                    return { ...n, isRead: true };
                }
                return n;
            });
            
            if (changed) {
                const newUnread = updated.filter(n => !n.isRead).length;
                setUnreadCount(newUnread);
                notificationApi.markChatAsRead(conversationId).catch(console.error);
            }
            return updated;
        });
        chatApi.getUnreadMessagesCount().then((count) => {
            setUnreadMessagesCount(count || 0);
        }).catch(console.error);
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
        notificationApi.clearNotifications().catch(console.error);
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            unreadMessagesCount,
            setUnreadMessagesCount,
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
