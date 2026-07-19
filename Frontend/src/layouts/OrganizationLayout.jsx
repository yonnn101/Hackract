import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import NotificationPanel from '../components/NotificationPanel.jsx';
import {
  FiGrid, FiBriefcase, FiGlobe, FiShield, FiSettings,
  FiFileText, FiBell, FiChevronDown, FiPlus, FiCpu,
  FiActivity, FiTarget, FiZap, FiLogOut, FiMessageSquare, FiUser
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const OrganizationLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount, unreadMessagesCount } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const unreadChatCount = unreadMessagesCount;

  const orgName = user?.organization?.name || "Organization";
  const userInitial = user?.fullName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "O";

  const navItems = [
    { icon: FiGrid, label: 'DASHBOARD', route: '/dashboard' },
    { icon: FiBriefcase, label: 'PROJECTS', route: '/org-projects' },
    { icon: FiGlobe, label: 'DISCOVER', route: '/discover' },
    { icon: FiMessageSquare, label: 'MESSAGES', route: '/org-messages', badge: unreadChatCount },
    { icon: FiShield, label: 'LEGAL AGREEMENTS', route: '/legal' },
    { icon: FiUser, label: 'PROFILE', route: '/organization-profile' },
    { icon: FiSettings, label: 'SETTINGS', route: '/organization-settings' },
    { icon: FiFileText, label: 'REPORTS', route: '/reports' },
  ];

  const isActive = (route) => {
    if (route === '/legal') {
      return ['/legal', '/legal/create', '/org-agreement'].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
    }

    return location.pathname === route;
  };

  return (
    <div className="flex h-screen bg-[#050505] text-gray-400 font-sans overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#050505] border-r border-white/5 flex flex-col z-50">
        <div className="p-8 pb-12">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-black text-white tracking-[0.2em] font-mono">HACKRACT</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.route)}
              className={`w-full flex items-center gap-4 px-8 py-4 transition-all relative group ${isActive(item.route)
                  ? 'text-[#00c477]'
                  : 'text-gray-500 hover:text-white hover:bg-white/2'
                }`}
            >
              {isActive(item.route) && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 w-[3px] h-full bg-[#00c477] shadow-[0_0_15px_#00c477]"
                />
              )}
              <item.icon className={`text-lg transition-colors ${isActive(item.route) ? 'text-[#00c477]' : 'group-hover:text-white'}`} />
              <span className="text-[11px] font-black tracking-[0.2em] font-mono flex-1 text-left">{item.label}</span>
              {item.badge > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#00c477] text-black text-[9px] font-black flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sign Out Button */}
        <div className="p-8 mt-auto">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#ff3366]/10 text-[#ff3366] hover:bg-[#ff3366] hover:text-white rounded-lg transition-all font-mono font-black text-[11px] tracking-widest uppercase border border-[#ff3366]/30"
          >
            <FiLogOut className="text-lg" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* HEADER */}
        <header className="h-16 flex items-center justify-between px-10 border-b border-white/5 bg-[#050505]/50 backdrop-blur-xl z-40 sticky top-0">
          <div className="flex items-center gap-2 cursor-pointer group">
            <h2 className="text-sm font-black text-white tracking-widest uppercase font-mono group-hover:text-[#00c477] transition-colors">{orgName}</h2>
            <FiChevronDown className="text-gray-500 group-hover:text-white transition-colors" />
          </div>

          <div className="flex items-center gap-6">
            <button
              className="relative p-2 rounded-lg bg-white/2 border border-white/5 text-gray-400 hover:text-[#00c477] transition-all"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            >
              <FiBell />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff3366] text-white text-[9px] flex items-center justify-center rounded-full font-black border-2 border-[#050505]">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotificationsOpen && (
                <NotificationPanel
                  isOpen={isNotificationsOpen}
                  onClose={() => setIsNotificationsOpen(false)}
                />
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#00c477]/20 to-emerald-500/10 border border-[#00c477]/30 flex items-center justify-center font-black text-[#00c477] shadow-[0_0_10px_rgba(0,255,136,0.1)]">
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-10 bg-[#050505]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OrganizationLayout;
