import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiStar, FiChevronLeft, FiChevronRight, FiCheck, FiSend, FiX, FiLoader, FiMessageSquare, FiUser, FiFileText } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { useAuth } from '../context/authContext';
import { uploadFile as uploadChatFile } from '../api/chatApi';

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
const RankBadge = ({ rank }) => {
  const colors = {
    ELITE:    'text-rose-400 border-rose-400/30 bg-rose-400/10',
    PLATINUM: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
    GOLD:     'text-amber-400 border-amber-400/30 bg-amber-400/10',
    SILVER:   'text-gray-300 border-gray-400/30 bg-gray-400/10',
    BRONZE:   'text-orange-400 border-orange-400/30 bg-orange-400/10',
  };
  return (
    <span className={`text-[9px] font-black font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${colors[rank] || colors.BRONZE}`}>
      {rank}
    </span>
  );
};

// ─── INVITE MODAL ─────────────────────────────────────────────────────────────
const InviteModal = ({ hacker, onClose }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [agreementMode, setAgreementMode] = useState('UPLOAD');
  const [agreementFile, setAgreementFile] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState('');
  const [agreementLoading, setAgreementLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const organizationId = user?.organizations?.[0]?.organizationId || user?.organizations?.[0]?.organization?.id;
      if (!organizationId) {
        setProjects([]);
        setFetching(false);
        return;
      }
      try {
        const { data } = await api.get(`/pentests?organizationId=${organizationId}`);
        // Support both response shapes
        const list = data?.data || data?.pentests || data || [];
        setProjects(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load projects', err);
        setProjects([]);
      } finally {
        setFetching(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/legal-agreements?isActive=true');
        const list = data?.data || data || [];
        setAgreements(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load legal agreements', err);
        setAgreements([]);
      }
    })();
  }, []);

  const buildAgreementFile = (agreement) => {
    const rawTitle = agreement?.title || 'agreement';
    const safeTitle = rawTitle.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'agreement';
    const version = agreement?.version ? `v${agreement.version}` : 'v1';
    const fileName = `${safeTitle}_${version}.txt`;
    const content = agreement?.content || '';
    return new File([content], fileName, { type: 'text/plain' });
  };

  const handleSend = async () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }
    if (agreementMode === 'UPLOAD' && !agreementFile) {
      toast.error('Please upload a legal agreement file');
      return;
    }
    if (agreementMode === 'LEGAL_AGREEMENT' && !selectedAgreementId) {
      toast.error('Please select a legal agreement');
      return;
    }
    setLoading(true);
    try {
      setAgreementLoading(true);

      const projectRes = await api.get(`/projects/${selectedProject}`);
      const projectData = projectRes?.data?.data || projectRes?.data || {};
      const collaborators = projectData?.collaborators || [];
      const alreadyAssigned = collaborators.some((c) => c.userId === (hacker.userId || hacker.id));
      if (alreadyAssigned) {
        toast.error('This hacker is already assigned to the selected project.');
        return;
      }

      const inviteRes = await api.get(`/invitations/project/${selectedProject}`);
      const inviteList = Array.isArray(inviteRes?.data?.data)
        ? inviteRes.data.data
        : Array.isArray(inviteRes?.data)
          ? inviteRes.data
          : [];
      const pendingInvite = inviteList.find((inv) => inv.status === 'PENDING' && (inv.hackerId === (hacker.userId || hacker.id) || inv.hacker?.id === (hacker.userId || hacker.id)));
      if (pendingInvite) {
        toast.error('This hacker already has a pending invitation for the selected project.');
        return;
      }

      let agreementPayload = null;

      if (agreementMode === 'UPLOAD') {
        const fileData = await uploadChatFile(agreementFile);
        agreementPayload = {
          source: 'UPLOAD',
          title: agreementFile?.name,
          fileUrl: fileData.fileUrl,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          fileMime: fileData.fileMime,
        };
      }

      if (agreementMode === 'LEGAL_AGREEMENT') {
        const agreement = agreements.find((a) => a.id === selectedAgreementId);
        if (!agreement?.content) {
          toast.error('Selected agreement is missing content.');
          setAgreementLoading(false);
          setLoading(false);
          return;
        }
        const generatedFile = buildAgreementFile(agreement);
        const fileData = await uploadChatFile(generatedFile);
        agreementPayload = {
          source: 'LEGAL_AGREEMENT',
          legalAgreementId: agreement.id,
          title: agreement.title,
          fileUrl: fileData.fileUrl,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          fileMime: fileData.fileMime,
        };
      }

      await api.post('/invitations', {
        pentestId: selectedProject,
        hackerId: hacker.userId || hacker.id,
        message: message.trim() || undefined,
        agreement: agreementPayload,
      });
      toast.success(`Invitation sent to ${hacker.user?.handle || hacker.handle || hacker.name}!`);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to send invitation';
      toast.error(msg);
    } finally {
      setAgreementLoading(false);
      setLoading(false);
    }
  };

  const hackerName   = hacker.user?.fullName || hacker.fullName || hacker.name || 'Unknown';
  const hackerHandle = hacker.user?.handle   || hacker.handle   || hacker.tag  || '';
  const hackerAvatar = hacker.user?.avatar   || hacker.avatar   || `https://api.dicebear.com/7.x/bottts/svg?seed=${hackerHandle}&baseColor=00ff88`;
  const agreementReady = agreementMode === 'UPLOAD' ? !!agreementFile : !!selectedAgreementId;
  const isSending = loading || agreementLoading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-[#080808] border border-white/10 rounded-3xl w-full max-w-lg shadow-[0_30px_80px_-10px_rgba(0,196,119,0.2)] relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Ambient glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#00c477]/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-white/5 flex items-start gap-4 relative z-10">
          <div className="relative w-14 h-14 shrink-0">
            <img src={hackerAvatar} alt={hackerName} className="w-full h-full rounded-xl bg-black/50 border border-white/10 object-cover" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#00c477] border-2 border-[#080808] shadow-[0_0_5px_#00c477]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-[#00c477] font-mono tracking-widest uppercase mb-1">Send Project Invitation</p>
            <h3 className="text-xl font-black text-white truncate">{hackerName}</h3>
            {hackerHandle && <p className="text-xs text-gray-500 font-mono">{hackerHandle.startsWith('#') ? hackerHandle : `@${hackerHandle}`}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all shrink-0">
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5 relative z-10">
          {/* Project selector */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
              Select Project <span className="text-[#00c477]">*</span>
            </label>
            {fetching ? (
              <div className="flex items-center gap-2 py-3 text-gray-500 text-sm">
                <FiLoader className="animate-spin" /> Loading your projects...
              </div>
            ) : projects.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No projects found. Create a project first.</p>
            ) : (
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="w-full bg-[#0c0c0c] border border-white/10 focus:border-[#00c477] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">— Choose a project —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status || 'PLANNING'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Legal agreement */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FiFileText className="text-[#00c477]" /> Legal Agreement <span className="text-[#00c477]">*</span>
            </label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setAgreementMode('UPLOAD')}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest border transition-all ${
                  agreementMode === 'UPLOAD'
                    ? 'border-[#00c477]/50 text-[#00c477] bg-[#00c477]/10'
                    : 'border-white/10 text-gray-500 hover:text-white hover:border-white/30'
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setAgreementMode('LEGAL_AGREEMENT')}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest border transition-all ${
                  agreementMode === 'LEGAL_AGREEMENT'
                    ? 'border-[#00c477]/50 text-[#00c477] bg-[#00c477]/10'
                    : 'border-white/10 text-gray-500 hover:text-white hover:border-white/30'
                }`}
              >
                Use Existing
              </button>
            </div>

            {agreementMode === 'UPLOAD' ? (
              <div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setAgreementFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-gray-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#00c477]/10 file:text-[#00c477] file:font-bold file:uppercase file:text-[10px] file:tracking-widest hover:file:bg-[#00c477]/20"
                />
                {agreementFile && (
                  <p className="text-[11px] text-gray-500 mt-2 font-mono truncate">{agreementFile.name}</p>
                )}
              </div>
            ) : (
              <div>
                {agreements.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">No active legal agreements found.</p>
                ) : (
                  <select
                    value={selectedAgreementId}
                    onChange={(e) => setSelectedAgreementId(e.target.value)}
                    className="w-full bg-[#0c0c0c] border border-white/10 focus:border-[#00c477] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="">— Choose an agreement —</option>
                    {agreements.map((agreement) => (
                      <option key={agreement.id} value={agreement.id}>
                        {agreement.title} (v{agreement.version})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FiMessageSquare className="text-[#00c477]" /> Personal Message <span className="text-gray-600 normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Introduce the project and why you'd like this hacker's expertise..."
              className="w-full bg-[#0c0c0c] border border-white/10 focus:border-[#00c477] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all resize-none placeholder-gray-600"
            />
            <p className="text-[10px] text-gray-600 mt-1 text-right">{message.length}/1000</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex gap-3 relative z-10">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm font-bold hover:bg-white/5 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !selectedProject || fetching || !agreementReady}
            className="flex-1 py-3 rounded-xl bg-[#00c477] text-black text-sm font-extrabold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,196,119,0.3)] hover:bg-[#00a865] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSending ? <FiLoader className="animate-spin" /> : <FiSend />}
            {isSending ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── HACKER CARD ──────────────────────────────────────────────────────────────
const HackerCard = ({ hacker, index, onInvite, onViewProfile, authUser }) => {
  const name = hacker.user?.fullName || hacker.name || 'Unknown';
  const handle = hacker.user?.handle || hacker.tag || '';
  const avatar = hacker.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${handle}&baseColor=00ff88`;

  // Parse skills and certs which might be JSON strings
  const parseItems = (items) => {
    if (!items) return [];
    return items.map(item => {
      try {
        const parsed = JSON.parse(item);
        return parsed.title || parsed.name || item;
      } catch {
        return item;
      }
    });
  };

  const skills = parseItems(hacker.primarySkills || hacker.skills);
  const certs = parseItems(hacker.certifications || hacker.certs);
  const rating = hacker.rating; // Real rated value or null
  const rank = hacker.rank || 'BRONZE';
  const trustScore = hacker.user?.trustScore ?? 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-[#050505] border border-white/5 hover:border-[#00c477]/30 rounded-xl p-6 transition-all group flex flex-col h-full shadow-lg"
    >
      {/* Top: avatar + rating */}
      <div className="flex items-start justify-between mb-5">
        <div 
          onClick={() => onViewProfile(hacker)}
          className="relative w-16 h-16 rounded-xl bg-linear-to-br from-[#00c477]/20 to-emerald-900/40 p-0.5 border border-white/10 group-hover:border-[#00c477]/50 transition-colors cursor-pointer"
        >
          <img src={avatar} alt={name} className="w-full h-full rounded-[10px] object-cover bg-black/50" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#00c477] border-2 border-[#050505] shadow-[0_0_5px_#00c477]" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 text-white font-bold">
            <FiStar className={`text-sm ${rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} />
            <span className="text-xs font-mono">{rating ? rating.toFixed(1) : 'Unrated'}</span>
          </div>
          <RankBadge rank={rank} />
        </div>
      </div>

      {/* Name */}
      <div 
        onClick={() => onViewProfile(hacker)}
        className="mb-4 cursor-pointer"
      >
        <h3 className="text-lg font-bold text-white group-hover:text-[#00c477] transition-colors mb-0.5">{name}</h3>
        {handle && <p className="text-xs text-gray-500 font-mono">{handle.startsWith('#') ? handle : `@${handle}`}</p>}
      </div>

      {/* Skills + certs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {skills.slice(0, 3).map(s => (
          <span key={s} className="px-2.5 py-1 rounded border border-white/10 bg-white/5 text-[10px] text-gray-300 font-mono">{s}</span>
        ))}
        {certs.slice(0, 2).map(c => (
          <span key={c} className="px-2.5 py-1 rounded border border-[#00c477]/20 bg-[#00c477]/5 text-[10px] text-[#00c477] font-mono">{c}</span>
        ))}
        {skills.length + certs.length > 5 && (
          <span className="px-2.5 py-1 rounded border border-white/5 bg-white/2 text-[10px] text-gray-600 font-mono">+{skills.length + certs.length - 5} more</span>
        )}
      </div>

      {/* Reputation and Success Rate Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-5 mt-auto">
        <div className="bg-white/2 border border-white/5 rounded-xl p-3 flex flex-col justify-between h-[68px]">
          <span className="text-[9px] font-black text-gray-500 tracking-wider uppercase font-mono block mb-1">Reputation</span>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white font-mono">{trustScore}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#00c477]" />
          </div>
        </div>
        <div className="bg-white/2 border border-white/5 rounded-xl p-3 flex flex-col justify-between h-[68px]">
          <span className="text-[9px] font-black text-gray-500 tracking-wider uppercase font-mono block mb-1">Success Rate</span>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-white font-mono">{hacker.successRate ?? 100}%</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#00c477]" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewProfile(hacker)}
          className="flex-1 py-2.5 rounded-lg border border-white/10 hover:border-[#00c477]/50 text-gray-300 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          <FiUser className="text-xs" /> Profile
        </button>
        {(authUser?.roles?.some(r => r.type === 'ORG_ADMIN' || r.type === 'PROJECT_ADMIN')) && (
          <button
            onClick={() => onInvite(hacker)}
            className="flex-1 py-2.5 rounded-lg bg-[#00c477] hover:bg-[#009a5e] text-black font-bold text-sm transition-all shadow-[0_0_15px_rgba(0,255,136,0.15)] hover:shadow-[0_0_25px_rgba(0,255,136,0.3)] flex items-center justify-center gap-2"
          >
            <FiSend className="text-xs" /> Invite
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const OrganizationDiscover = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [hackers, setHackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedCerts, setSelectedCerts] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inviteTarget, setInviteTarget] = useState(null);

  const LIMIT = 12;

  const fetchHackers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', LIMIT);
      if (searchQuery) params.set('search', searchQuery);
      if (selectedSkills.length > 0) params.set('skills', selectedSkills.join(','));
      if (selectedCerts.length  > 0) params.set('certs',  selectedCerts.join(','));

      const { data } = await api.get(`/hacker-profiles/discover?${params.toString()}`);
      const list = data?.data?.profiles || data?.profiles || [];
      const tp   = data?.data?.pagination?.totalPages || data?.pagination?.totalPages || 1;
      setHackers(Array.isArray(list) ? list : []);
      setTotalPages(tp);
    } catch (err) {
      console.error('Failed to load hackers', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedSkills, selectedCerts]);

  useEffect(() => {
    const id = setTimeout(fetchHackers, 300);
    return () => clearTimeout(id);
  }, [fetchHackers]);

  const toggleSkill = skill =>
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);

  const toggleCert = cert =>
    setSelectedCerts(prev => prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]);

  // Client-side secondary filtering (skills/certs/rating come from local filter when API doesn't support them)
  const filteredHackers = hackers.filter(h => {
    const skills = h.primarySkills || h.skills || [];
    const certs  = h.certifications || h.certs || [];
    const rating = h.rating || 0;

    if (selectedSkills.length > 0 && !selectedSkills.some(s => skills.includes(s))) return false;
    if (selectedCerts.length > 0  && !selectedCerts.some(c => certs.includes(c)))   return false;
    if (minRating > 0 && rating < minRating) return false;
    return true;
  });

  const handleViewProfile = (hacker) => {
    // Navigate using the userId which is the standard for the public profile route
    const id = hacker.userId || hacker.user?.id || hacker.id;
    navigate(`/discover/${id}`);
  };

  return (
    <div className="flex flex-col h-full -m-10">

      {/* ── Header Area ── */}
      <div className="px-10 py-5 border-b border-white/5 bg-[#050505] flex items-center gap-4 sticky top-0 z-10">
        <div className="relative flex-1 max-w-2xl">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none" />
          <input
            id="hacker-search"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, handle, bio, specialization…"
            className="w-full bg-[#0c0c0c] border border-white/10 focus:border-[#00c477] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none transition-all placeholder-gray-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <FiX className="text-sm" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Filters Sidebar ── */}
        <aside className="w-64 border-r border-white/5 bg-[#050505] p-8 overflow-y-auto hidden md:block">
          <h3 className="text-[10px] font-black text-[#00c477] tracking-widest font-mono mb-8 uppercase">Refine Discovery</h3>

          <div className="mb-8">
            <h4 className="text-[9px] font-black text-gray-500 tracking-widest font-mono mb-4 uppercase">Core Skills</h4>
            <div className="space-y-3">
              {['Web Exploitation', 'Network Security', 'Mobile Forensics', 'Binary Analysis', 'Cloud Security', 'IoT Hacking'].map(skill => {
                const isActive = selectedSkills.includes(skill);
                return (
                  <label key={skill} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleSkill(skill)}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isActive ? 'bg-[#00c477] border-[#00c477]' : 'border-white/20 bg-black/50 group-hover:border-[#00c477]/50'}`}>
                      {isActive && <FiCheck className="text-black text-[10px] font-bold" />}
                    </div>
                    <span className={`text-xs transition-colors ${isActive ? 'text-white font-bold' : 'text-gray-400 group-hover:text-gray-200'}`}>{skill}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-[9px] font-black text-gray-500 tracking-widest font-mono mb-4 uppercase">Certifications</h4>
            <div className="flex flex-wrap gap-2">
              {['OSCP', 'CEH', 'GPEN', 'CISSP', 'OSCE', 'GREM'].map(cert => {
                const isActive = selectedCerts.includes(cert);
                return (
                  <button
                    key={cert}
                    onClick={() => toggleCert(cert)}
                    className={`px-3 py-1.5 rounded-md border text-[10px] font-mono transition-colors uppercase ${isActive ? 'bg-[#00c477]/10 border-[#00c477] text-[#00c477]' : 'border-white/10 bg-transparent text-gray-400 hover:border-[#00c477]/50 hover:text-[#00c477]'}`}
                  >
                    {cert}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-[9px] font-black text-gray-500 tracking-widest font-mono mb-4 uppercase">Min. Rating</h4>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <FiStar
                  key={star}
                  onClick={() => setMinRating(star === minRating ? 0 : star)}
                  className={`text-lg cursor-pointer transition-colors ${star <= minRating ? 'text-[#00c477] fill-[#00c477]' : 'text-gray-600 hover:text-[#00c477]/50'}`}
                />
              ))}
              <span className="text-xs text-gray-400 ml-2 font-mono">{minRating > 0 ? `${minRating}.0+` : 'Any'}</span>
            </div>
          </div>

          {(selectedSkills.length > 0 || selectedCerts.length > 0 || minRating > 0) && (
            <button
              onClick={() => { setSelectedSkills([]); setSelectedCerts([]); setMinRating(0); }}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-mono font-bold transition-colors flex items-center gap-1"
            >
              <FiX className="text-xs" /> Clear filters
            </button>
          )}
        </aside>

        {/* ── Hacker Grid ── */}
        <main className="flex-1 p-10 overflow-y-auto bg-[#050505]">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-2">Top Penetration Experts</h1>
              <p className="text-gray-400 text-sm">
                {loading ? 'Loading...' : `Showing ${filteredHackers.length} verified security researchers.`}
              </p>
            </div>
            
          </div>

          {loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-6 animate-pulse h-64">
                  <div className="flex gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-white/5" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-white/5 rounded" />
                    <div className="h-3 bg-white/5 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredHackers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl">🔍</div>
              <h3 className="text-white font-bold text-xl">No Hackers Found</h3>
              <p className="text-gray-500 text-sm max-w-sm">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              {filteredHackers.map((hacker, i) => (
                <HackerCard
                  key={hacker.id}
                  hacker={hacker}
                  index={i}
                  onInvite={setInviteTarget}
                  onViewProfile={handleViewProfile}
                  authUser={authUser}
                />
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-center mt-12 gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30"
              >
                <FiChevronLeft className="text-sm" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded border text-sm font-mono flex items-center justify-center transition-colors ${pg === page ? 'bg-[#00c477] border-[#00c477] text-black font-bold' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30"
              >
                <FiChevronRight className="text-sm" />
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ── Invite Modal ── */}
      <AnimatePresence>
        {inviteTarget && (
          <InviteModal
            hacker={inviteTarget}
            onClose={() => setInviteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrganizationDiscover;
