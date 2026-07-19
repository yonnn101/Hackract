import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import NotificationPanel from '../components/NotificationPanel.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid,
  FiFolder,
  FiShoppingBag,
  FiFileText,
  FiSettings,
  FiMessageSquare,
  FiPlus,
  FiBell,
  FiSearch,
  FiMenu,
  FiX,
  FiLogOut,
  FiShield,
  FiPenTool,
  FiMonitor,
  FiUser,
} from 'react-icons/fi';
import { ROLES, isOrgAdminMember } from '../utils/roles.js';
const HackerLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasAnyRole } = useAuth();
  const { unreadCount, unreadMessagesCount } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const unreadChatCount = unreadMessagesCount;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.fullName || user?.handle || 'Operative';
  const userInitial = displayName[0]?.toUpperCase() || 'H';

  const navItems = [
    { icon: FiGrid, label: 'Dashboard', route: '/hacker-dashboard' },
    { icon: FiFolder, label: 'Projects', route: '/projects' },
    { icon: FiShoppingBag, label: 'Engagements', route: '/engagements' },
    { icon: FiShield, label: 'Findings', route: '/findings' },
    { icon: FiMessageSquare, label: 'Messages', route: '/messages', badge: unreadChatCount },
    { icon: FiFileText, label: 'Reports', route: '/hacker-reports' },
    { icon: FiUser, label: 'Profile', route: '/hacker-profile' },
    { icon: FiSettings, label: 'Settings', route: '/hacker-settings' },
    { icon: FiPenTool, label: 'Legal Agreement', route: '/execute-agreement' },
  ];

  if (hasAnyRole(ROLES.ORG_ADMIN)) {
    navItems.push({ icon: FiMonitor, label: 'Org Dashboard', route: '/dashboard' });
  }

  const isActive = (route) => {
    if (route === '/hacker-dashboard') return location.pathname === '/hacker-dashboard';
    return location.pathname.startsWith(route);
  };

  // Current page label for the header
  const currentPage = navItems.find(n => isActive(n.route))?.label ?? 'Hackract';

  return (
    <div className="flex h-screen bg-[#050505] text-gray-300 font-sans selection:bg-[#00c477]/30 overflow-hidden">

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#050505] border-r border-white/5 flex flex-col justify-between transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          {/* Logo & mobile close */}
          <div className="p-6 flex justify-between items-center">
            <h1
              className="text-2xl font-bold tracking-wider text-[#00c477] cursor-pointer"
              onClick={() => navigate('/hacker-dashboard')}
            >
              Hackract
            </h1>
            <button
              className="lg:hidden text-gray-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FiX size={24} />
            </button>
          </div>

          {/* User card */}
          <div
            className="mx-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10 flex items-center space-x-3 cursor-pointer hover:bg-white/8 transition-colors"
            onClick={() => navigate('/hacker-profile')}
          >
            <div className="w-10 h-10 rounded-full bg-[#00c477]/20 flex items-center justify-center text-[#00c477] font-bold text-sm shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-sm truncate">{displayName}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Operative</div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              <button
                key={item.route}
                onClick={() => { navigate(item.route); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left ${isActive(item.route)
                  ? 'bg-[#00c477]/10 text-[#00c477] border-l-2 border-[#00c477]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <item.icon className={isActive(item.route) ? 'text-[#00c477]' : ''} />
                <span className="font-medium flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="ml-auto w-4 h-4 rounded-full bg-[#00c477] text-black text-[9px] font-black flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom actions */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => navigate('/projects')}
            className="w-full bg-[#00c477] text-black font-bold py-3 rounded-xl hover:bg-[#00c477]/90 transition-all shadow-[0_0_15px_rgba(0,255,136,0.3)] flex items-center justify-center gap-2"
          >
            <FiPlus size={16} /> New Project
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            <FiLogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="flex justify-between items-center p-4 lg:p-5 border-b border-white/5 bg-[#050505] z-30 shrink-0">
          <div className="flex items-center flex-1 gap-4">
            {/* Mobile hamburger */}
            <button
              className="lg:hidden text-gray-400 hover:text-white p-2 rounded-xl border border-white/10"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <FiMenu size={20} />
            </button>

            {/* Page title on mobile */}
            <span className="text-white font-semibold lg:hidden">{currentPage}</span>
          </div>

          <div className="flex items-center space-x-4 relative">
            <button
              className="relative text-gray-400 hover:text-white transition-colors hidden sm:block"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            >
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#00c477] rounded-full" />
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
            <div
              className="flex items-center space-x-2 border-l border-white/10 pl-4 cursor-pointer"
              onClick={() => navigate('/hacker-profile')}
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-white">{displayName}</div>
                <div className="text-xs text-gray-500">Operative</div>
              </div>
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-[#00c477]/20 border border-[#00c477]/30 flex items-center justify-center text-[#00c477] font-bold text-sm">
                {userInitial}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default HackerLayout;
