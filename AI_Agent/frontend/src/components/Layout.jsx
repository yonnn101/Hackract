export default function Layout({
  status,
  view,
  onOpenChat,
  onOpenSettings,
  onNewChat,
  children,
}) {
  return (
    <div className="claude-app">
      <aside className="claude-sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="sidebar-logo" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.35" />
              <path d="M16 6 L22 22 L10 14 L22 14 L10 22 Z" fill="currentColor" />
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-title">HackrAct</span>
            <span className="sidebar-subtitle">Security agent</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-nav-item${view === 'chat' ? ' active' : ''}`}
            onClick={onOpenChat}
          >
            <span className="sidebar-nav-icon" aria-hidden="true">&#9998;</span>
            Chat
          </button>
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={onNewChat}
            title="Clear conversation and start fresh"
          >
            <span className="sidebar-nav-icon" aria-hidden="true">+</span>
            New chat
          </button>
          <button
            type="button"
            className={`sidebar-nav-item${view === 'settings' ? ' active' : ''}`}
            onClick={onOpenSettings}
          >
            <span className="sidebar-nav-icon" aria-hidden="true">&#9881;</span>
            Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className={`sidebar-status${status === 'online' ? ' online' : ''}`}>
            <span className="sidebar-status-dot" />
            {status === 'online' ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </aside>

      <div className="claude-main">
        <main className="claude-main-inner">{children}</main>
      </div>
    </div>
  );
}
