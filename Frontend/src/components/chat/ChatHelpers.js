/* ─── Formatting helpers ──────────────────────────────────────────────── */

export const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

export const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d), now = new Date();
  const diff = now - date;
  if (diff < 86400000 && date.getDate() === now.getDate()) return fmtTime(d);
  if (diff < 172800000) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const fmtLastSeen = (d) => {
  if (!d) return 'last seen a while ago';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return 'last seen just now';
  if (diff < 3600) return `last seen ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `last seen ${fmtTime(d)}`;
  return `last seen ${new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
};

export const fmtDuration = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export const fmtSize = (b) => {
  if (!b) return '';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
};

export const getInitials = (n = '') =>
  n.trim().split(/\s+/).map((w) => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';

export const avatarColors = ['#00c477', '#7c3aed', '#2563eb', '#db2777', '#ea580c', '#0891b2', '#d97706', '#059669'];

export const avatarBg = (id = '') =>
  avatarColors[(id.charCodeAt(0) || 0) % avatarColors.length];

export const isImageMime = (m) => m?.startsWith('image/');
export const isVideoMime = (m) => m?.startsWith('video/');
export const isAudioMime = (m) => m?.startsWith('audio/');

// Detect org vs hacker from the user object returned by /auth/local/me
// accountType is NOT in the response; roles array is (ORG_ADMIN = org, PENTESTER = hacker)
export const isOrgUser = (u) =>
  u?.roles?.some((r) => r.name === 'ORG_ADMIN') ||
  (Array.isArray(u?.organizations) && u.organizations.length > 0);
