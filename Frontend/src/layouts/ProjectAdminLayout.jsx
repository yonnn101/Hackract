import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import NotificationPanel from '../components/NotificationPanel.jsx';
import {
  FiGrid,
  FiFolder,
  FiFileText,
  FiSettings,
  FiMessageSquare,
  FiPlus,
  FiBell,
  FiSearch,
  FiMenu,
  FiX,
  FiLogOut,
  FiPenTool,
  FiClipboard,
  FiUser,
} from 'react-icons/fi';

const ProjectAdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount, unreadMessagesCount } = useNotifications();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = user?.fullName || user?.handle || 'Project Admin';
  const userInitial = displayName[0]?.toUpperCase() || 'P';

  const navItems = [
    { icon: FiGrid,          label: 'Dashboard',    route: '/admin-dashboard' },
    { icon: FiFolder,        label: 'Projects',     route: '/pa-projects' },
    { icon: FiMessageSquare, label: 'Messages',     route: '/pa-messages', badge: unreadMessagesCount },
    { icon: FiClipboard,     label: 'Reports',      route: '/pa-reports' },
    { icon: FiPenTool,       label: 'Agreements',   route: '/pa-agreement' },
    { icon: FiUser,          label: 'Profile',      route: '/pa-profile' },
    { icon: FiSettings,      label: 'Settings',     route: '/pa-settings' },
  ];

  const isActive = (route) => {
    if (route === '/admin-dashboard') return location.pathname === '/admin-dashboard';
    return location.pathname.startsWith(route);
  };

  // Current page label for the header
  const currentPage = navItems.find(n => isActive(n.route))?.label ?? 'Hackract';

  return (
    <div className="flex h-screen bg-[#050505] text-gray-300 font-sans selection:bg-[#38bdf8]/30 overflow-hidden">

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
              className="text-2xl font-bold tracking-wider text-[#38bdf8] cursor-pointer"
              onClick={() => navigate('/admin-dashboard')}
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
            onClick={() => navigate('/pa-profile')}
          >
            <div className="w-10 h-10 rounded-full bg-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8] font-bold text-sm shrink-0">
              {userInitial}
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-sm truncate">{displayName}</div>
              <div className="text-xs text-[#38bdf8]/70 uppercase tracking-wider">Project Admin</div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              <button
                key={item.route}
                onClick={() => { navigate(item.route); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left ${isActive(item.route)
                    ? 'bg-[#38bdf8]/10 text-[#38bdf8] border-l-2 border-[#38bdf8]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <item.icon className={isActive(item.route) ? 'text-[#38bdf8]' : ''} />
                <span className="font-medium flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#38bdf8] text-black text-[9px] font-black flex items-center justify-center shrink-0">
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
            onClick={() => navigate('/pa-projects')}
            className="w-full bg-[#38bdf8] text-black font-bold py-3 rounded-xl hover:bg-[#38bdf8]/90 transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2"
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
        <header className="flex justify-between items-center p-4 lg:p-5 border-b border-white/5 bg-[#050505] z-30 flex-shrink-0">
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

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} 
              className="relative text-gray-400 hover:text-white transition-colors block"
            >
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#38bdf8] text-black text-[9px] flex items-center justify-center rounded-full font-black border-2 border-[#050505]">
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
            <div
              className="flex items-center space-x-2 border-l border-white/10 pl-4 cursor-pointer"
              onClick={() => navigate('/pa-profile')}
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-white">{displayName}</div>
                <div className="text-xs text-gray-500">Project Admin</div>
              </div>
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-[#38bdf8]/20 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8] font-bold text-sm">
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

export default ProjectAdminLayout;
