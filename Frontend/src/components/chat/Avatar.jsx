import { getInitials, avatarBg } from './ChatHelpers';

export default function Avatar({ user, size = 40, showStatus = false, isOnline = false }) {
  const ini = getInitials(user?.fullName || user?.handle || user?.name);
  const bg = avatarBg(user?.id || '');
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
        style={{ background: user?.avatar ? undefined : bg, fontSize: size * 0.36 }}
      >
        {user?.avatar
          ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          : ini}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-[#111] ${isOnline ? 'bg-[#00c477]' : 'bg-gray-600'}`}
          style={{ width: size * 0.27, height: size * 0.27 }}
        />
      )}
    </div>
  );
}
