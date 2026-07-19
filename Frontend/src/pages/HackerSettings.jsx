import React, { useState, useEffect, useCallback } from "react";
import {
  FiUser, FiLock, FiBell, FiFileText, FiShield, FiMail,
  FiKey, FiSmartphone, FiMonitor, FiChevronRight, FiToggleLeft,
  FiToggleRight, FiAlertTriangle, FiCheck, FiClock, FiEye, FiEyeOff
} from "react-icons/fi";
import api from "../api/axiosConfig";
import { useAuth } from "../context/authContext.jsx";
import toast from "react-hot-toast";

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT = "#00c477";

const SectionCard = ({ title, icon: Icon, description, children, badge }) => (
  <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl overflow-hidden">
    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#00c477]/10 flex items-center justify-center">
          <Icon className="text-[#00c477]" size={16} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {description && <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {badge && (
        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          {badge}
        </span>
      )}
    </div>
    <div className="p-6 space-y-5">{children}</div>
  </div>
);

const FieldRow = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
    <label className="text-xs text-gray-400 font-medium min-w-[140px]">{label}</label>
    <div className="flex-1 max-w-md">{children}</div>
  </div>
);

const Input = ({ ...props }) => (
  <input
    {...props}
    className="w-full border border-white/10 rounded-xl bg-white/[0.02] text-sm text-white placeholder-gray-600
      focus:outline-none focus:border-[#00c477]/50 transition-all font-mono px-4 py-2.5"
  />
);

const Toggle = ({ checked, onChange, label }) => (
  <button
    onClick={onChange}
    className="flex items-center gap-3 group cursor-pointer"
  >
    {checked ? (
      <FiToggleRight className="text-[#00c477] w-7 h-7 transition-colors" />
    ) : (
      <FiToggleLeft className="text-gray-600 w-7 h-7 group-hover:text-gray-400 transition-colors" />
    )}
    <span className="text-xs text-gray-300">{label}</span>
  </button>
);

const ComingSoonOverlay = () => (
  <div className="absolute inset-0 bg-[#0c0c0c]/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-10">
    <div className="w-10 h-10 rounded-full bg-[#00c477]/10 flex items-center justify-center mb-3">
      <FiClock className="text-[#00c477]" size={18} />
    </div>
    <span className="text-xs font-mono uppercase tracking-widest text-gray-400">Coming Soon</span>
  </div>
);

// ── Notification pref keys ────────────────────────────────────────────────────
// Notification pref keys
const DEFAULT_NOTIFS = {
  chatMessages: true,
  projectInvitations: true,
  workflowChanges: true,
  newFinding: true,
  findingStatusChange: true,
  findingComment: true,
  emailNotifications: false,
};

const getNotifKey = (userId) => `hackract_notification_prefs_${userId || 'guest'}`;

const loadNotifPrefs = (userId) => {
  try {
    const raw = localStorage.getItem(getNotifKey(userId));
    return raw ? { ...DEFAULT_NOTIFS, ...JSON.parse(raw) } : { ...DEFAULT_NOTIFS };
  } catch { return { ...DEFAULT_NOTIFS }; }
};

const saveNotifPrefs = (userId, prefs) => {
  try { localStorage.setItem(getNotifKey(userId), JSON.stringify(prefs)); } catch { /* */ }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const HackerSettings = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("account");

  // Account & Security state
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIFS);

  // Legal agreements
  const [agreements, setAgreements] = useState([]);
  const [loadingAgreements, setLoadingAgreements] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setUsername(user.handle || "");
    }
    setNotifPrefs(loadNotifPrefs(user?.id));
  }, [user]);

  useEffect(() => {
    if (activeTab === "legal") {
      fetchAgreements();
    }
  }, [activeTab]);

  const fetchAgreements = async () => {
    setLoadingAgreements(true);
    try {
      const { data } = await api.get("/legal-agreements/my-signatures");
      setAgreements(data?.data?.signatures || data?.data || []);
    } catch (err) {
      console.error("Failed to fetch agreements", err);
    } finally {
      setLoadingAgreements(false);
    }
  };

  const handleSaveAccount = async () => {
    setSaving(true);
    try {
      // Only send fields that changed
      const payload = {};
      if (email !== user?.email) payload.email = email; // Note: if backend doesn't support email update, just update handle
      if (username !== user?.handle) payload.handle = username;

      if (Object.keys(payload).length > 0) {
        await api.patch("/users/profile", payload);
        toast.success("Account updated");
        if (refreshUser) await refreshUser();
      } else {
        toast.success("No changes to save");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in both password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/users/change-password", {
        oldPassword: currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Password change failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleNotif = (key) => {
    setNotifPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotifPrefs(user?.id, next);
      return next;
    });
  };

  const tabs = [
    { id: "account", label: "Account & Security", icon: FiShield },
    { id: "notifications", label: "Notifications", icon: FiBell },
    { id: "legal", label: "Legal & Compliance", icon: FiFileText },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 lg:p-8 font-sans">
      <div className="max-w-[1000px] mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#00c477]/10 flex items-center justify-center">
            <FiUser className="text-[#00c477]" size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-xs text-gray-500">Manage your account, security, and preferences</p>
          </div>
        </div>

        {/* TAB NAV */}
        <div className="flex gap-1 bg-[#0c0c0c] border border-white/5 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#00c477]/10 text-[#00c477] border border-[#00c477]/20"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── ACCOUNT & SECURITY ──────────────────────────────────────── */}
        {activeTab === "account" && (
          <div className="space-y-6">

            {/* Basic Information */}
            <SectionCard title="Basic Information" icon={FiUser} description="Update your account details">
              <FieldRow label="Email Address">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </FieldRow>
              <FieldRow label="Username">
                <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
              </FieldRow>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveAccount}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#00c477] text-black text-xs font-bold hover:bg-[#00c477]/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </SectionCard>

            {/* Change Password */}
            <SectionCard title="Change Password" icon={FiLock} description="Update your login password">
              <FieldRow label="Current Password">
                <div className="relative">
                  <Input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                  >
                    {showCurrentPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
              </FieldRow>
              <FieldRow label="New Password">
                <div className="relative">
                  <Input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer"
                  >
                    {showNewPw ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
              </FieldRow>
              <FieldRow label="Confirm Password">
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </FieldRow>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </SectionCard>

            {/* Two-Factor Auth — Coming Soon */}
            <div className="relative">
              <SectionCard title="Two-Factor Authentication" icon={FiSmartphone} description="Add an extra layer of security" badge="Coming Soon">
                <div className="opacity-30 pointer-events-none space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <FiSmartphone className="text-gray-500" size={16} />
                      <div>
                        <p className="text-sm text-gray-300">Authenticator App</p>
                        <p className="text-[10px] text-gray-600">Use Google Authenticator or similar</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-gray-400 font-mono uppercase">
                      Setup
                    </button>
                  </div>
                </div>
              </SectionCard>
              <ComingSoonOverlay />
            </div>

            {/* Active Sessions — Coming Soon */}
            <div className="relative">
              <SectionCard title="Active Sessions" icon={FiMonitor} description="Manage devices with access to your account" badge="Coming Soon">
                <div className="opacity-30 pointer-events-none space-y-3">
                  {[
                    { device: "Chrome on Windows", location: "Addis Ababa, ET", current: true },
                    { device: "Firefox on macOS", location: "Nairobi, KE", current: false },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-3">
                        <FiMonitor className="text-gray-500" size={16} />
                        <div>
                          <p className="text-sm text-gray-300">{s.device}</p>
                          <p className="text-[10px] text-gray-600">{s.location}</p>
                        </div>
                      </div>
                      {s.current ? (
                        <span className="text-[10px] font-mono text-[#00c477] bg-[#00c477]/10 px-2 py-1 rounded-full">Current</span>
                      ) : (
                        <button className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-mono uppercase">
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
              <ComingSoonOverlay />
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ───────────────────────────────────────────── */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <SectionCard title="Engagement Alerts" icon={FiBell} description="Stay informed about your collaborations">
              <Toggle checked={notifPrefs.chatMessages} onChange={() => toggleNotif("chatMessages")} label="New chat messages" />
              <Toggle checked={notifPrefs.projectInvitations} onChange={() => toggleNotif("projectInvitations")} label="Project invitations" />
              <Toggle checked={notifPrefs.workflowChanges} onChange={() => toggleNotif("workflowChanges")} label="Workflow state changes" />
            </SectionCard>

            <SectionCard title="Vulnerability Updates" icon={FiAlertTriangle} description="Alerts about security findings">
              <Toggle checked={notifPrefs.newFinding} onChange={() => toggleNotif("newFinding")} label="New finding reported" />
              <Toggle checked={notifPrefs.findingStatusChange} onChange={() => toggleNotif("findingStatusChange")} label="Finding status changes (Triaged → Resolved)" />
              <Toggle checked={notifPrefs.findingComment} onChange={() => toggleNotif("findingComment")} label="Comments on findings" />
            </SectionCard>

            <SectionCard title="Delivery Method" icon={FiMail} description="How you receive notifications">
              <Toggle checked={notifPrefs.emailNotifications} onChange={() => toggleNotif("emailNotifications")} label="Send email notifications (in addition to in-app)" />
            </SectionCard>
          </div>
        )}

        {/* ── LEGAL & COMPLIANCE ──────────────────────────────────────── */}
        {activeTab === "legal" && (
          <div className="space-y-6">
            <SectionCard title="Agreement Center" icon={FiFileText} description="View your signed agreements and legal documents">
              {loadingAgreements ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-[#00c477]/20 border-t-[#00c477] rounded-full animate-spin" />
                </div>
              ) : agreements.length === 0 ? (
                <div className="text-center py-8">
                  <FiFileText className="text-gray-600 mx-auto mb-3" size={28} />
                  <p className="text-sm text-gray-500">No signed agreements yet</p>
                  <p className="text-[10px] text-gray-600 mt-1">Agreements you sign for projects will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agreements.map((sig, i) => (
                    <div key={sig.id || i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-3">
                        <FiFileText className="text-[#00c477]" size={16} />
                        <div>
                          <p className="text-sm text-gray-200">{sig.agreement?.title || sig.title || "Agreement"}</p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            Signed {sig.signedAt ? new Date(sig.signedAt).toLocaleDateString() : "—"}
                            {sig.agreement?.version && ` · v${sig.agreement.version}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#00c477] bg-[#00c477]/10 px-2 py-1 rounded-full flex items-center gap-1">
                          <FiCheck size={10} /> Signed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default HackerSettings;
