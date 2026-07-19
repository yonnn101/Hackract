import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../api/axiosConfig";
import { uploadFile as uploadChatFile } from "../api/chatApi";
import { useAuth } from "../context/authContext";
import invitationService from "../services/invitation.service";
import ProjectActivity from "./ProjectActivity.jsx";
import { FiPlus, FiArrowLeft, FiBell, FiTerminal, FiActivity, FiUserPlus, FiX, FiSearch, FiSend, FiTrash2, FiFileText } from "react-icons/fi";

// Agreement selection modal - opens when invite button is clicked
const AgreementSelectionModal = ({ hacker, projectId, onClose, onConfirm, onLoading }) => {
  const [agreementMode, setAgreementMode] = useState('UPLOAD');
  const [agreementFile, setAgreementFile] = useState(null);
  const [agreements, setAgreements] = useState([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        const { data } = await api.get('/legal-agreements?isActive=true');
        const list = data?.data || data || [];
        setAgreements(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to fetch legal agreements', err);
      }
    };
    fetchAgreements();
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
    if (agreementMode === 'UPLOAD' && !agreementFile) {
      toast.error('Please upload a legal agreement file');
      return;
    }
    if (agreementMode === 'LEGAL_AGREEMENT' && !selectedAgreementId) {
      toast.error('Please select a legal agreement');
      return;
    }

    setSending(true);
    onLoading?.(true);

    try {
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
      } else {
        const agreement = agreements.find((a) => a.id === selectedAgreementId);
        if (!agreement?.content) {
          toast.error('Selected agreement is missing content.');
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

      await invitationService.sendInvitation({
        pentestId: projectId,
        hackerId: hacker.userId || hacker.id,
        message: "You have been invited to collaborate on this security program.",
        agreement: agreementPayload,
      });
      toast.success(`Invitation sent to ${hacker.user?.fullName || hacker.name}!`);
      onConfirm?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to send invitation");
    } finally {
      setSending(false);
      onLoading?.(false);
    }
  };

  const hackerName = hacker.user?.fullName || hacker.name || 'Unknown';

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
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#00c477]/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="px-8 pt-8 pb-6 border-b border-white/5 flex items-start gap-4 relative z-10">
          <div className="flex-1">
            <p className="text-[10px] font-black text-[#00c477] font-mono tracking-widest uppercase mb-1">Attachment Required</p>
            <h3 className="text-lg font-black text-white">Select Legal Agreement</h3>
            <p className="text-xs text-gray-500 mt-1">{hackerName} must accept this agreement before assignment</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all shrink-0">
            <FiX />
          </button>
        </div>

        <div className="px-8 py-6 space-y-5 relative z-10">
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 block">
              <FiFileText className="text-[#00c477]" /> Agreement Source
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setAgreementMode('UPLOAD')}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest border transition-all ${agreementMode === 'UPLOAD' ? 'border-[#00c477]/50 text-[#00c477] bg-[#00c477]/10' : 'border-white/10 text-gray-500 hover:text-white hover:border-white/30'}`}
              >
                Upload File
              </button>
              <button
                onClick={() => setAgreementMode('LEGAL_AGREEMENT')}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest border transition-all ${agreementMode === 'LEGAL_AGREEMENT' ? 'border-[#00c477]/50 text-[#00c477] bg-[#00c477]/10' : 'border-white/10 text-gray-500 hover:text-white hover:border-white/30'}`}
              >
                Use Existing
              </button>
            </div>
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
              <select
                value={selectedAgreementId}
                onChange={(e) => setSelectedAgreementId(e.target.value)}
                className="w-full bg-[#0c0c0c] border border-white/10 focus:border-[#00c477] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
              >
                <option value="">Select a legal agreement</option>
                {agreements.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} {a.version ? `v${a.version}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="px-8 py-6 border-t border-white/5 flex items-center gap-3 relative z-10">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all border border-white/10 text-sm font-bold uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 py-3 rounded-lg bg-[#00c477] hover:bg-[#00ff88] text-black transition-all border border-[#00c477] text-sm font-bold uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? <div className="w-3 h-3 border-2 border-transparent border-t-black rounded-full animate-spin" /> : <FiSend size={14} />}
            Send Invitation
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const HackerDiscoveryModal = ({ projectId, onClose, onInvited, assignedIds = [], pendingInviteIds = [] }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [agreementModal, setAgreementModal] = useState(false);
  const [selectedHacker, setSelectedHacker] = useState(null);
  const [agreementLoading, setAgreementLoading] = useState(false);

  const assignedSet = useMemo(() => new Set(assignedIds), [assignedIds]);
  const pendingSet = useMemo(() => new Set(pendingInviteIds), [pendingInviteIds]);

  const getHackerId = (hacker) => hacker?.userId || hacker?.id;

  const fetchHackers = async (query = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', 12);
      params.set('page', 1);
      if (query.trim()) params.set('search', query.trim());

      const { data } = await api.get(`/hacker-profiles/discover?${params.toString()}`);
      const list = data?.data?.profiles || data?.profiles || [];
      setResults(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error("Failed to fetch operators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHackers();
  }, []);

  const handleSearch = () => {
    fetchHackers(search);
  };

  const handleInviteClick = (hacker) => {
    setSelectedHacker(hacker);
    setAgreementModal(true);
  };

  const handleAgreementConfirm = () => {
    setAgreementModal(false);
    setSelectedHacker(null);
    onInvited();
  };

  // Helper to parse skills/certs safely if they're stored as JSON strings
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-100 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0a0a0a] border border-[#00c477]/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,196,119,0.1)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-gray-800 shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-[#00c477] tracking-widest uppercase">Operator Discovery</h3>
              <p className="text-[10px] text-gray-500 font-mono tracking-[0.2em] mt-1 uppercase">RECRUIT TOP PENETRATION EXPERTS</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/20 hover:text-[#00c477] transition-all">
              <FiX size={20} />
            </button>
          </div>

          <div className="relative">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, handle, or specialization..."
              className="w-full bg-[#15181e] border border-gray-800 rounded-xl px-5 py-4 text-sm text-gray-300 outline-none focus:border-[#00c477]/50 transition-all font-mono"
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-3 p-2 bg-[#00c477] text-black rounded-lg hover:scale-105 active:scale-95 transition-all"
            >
              <FiSearch size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#050505]">
          {loading ? (
            <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-transparent border-t-[#00c477] rounded-full animate-spin" /></div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map(hacker => {
                const hackerId = getHackerId(hacker);
                const isAssigned = assignedSet.has(hackerId);
                const isPending = pendingSet.has(hackerId);
                const name = hacker.user?.fullName || hacker.name || "Unknown";
                const handle = hacker.user?.handle || hacker.tag || "";
                const skills = parseItems(hacker.primarySkills || hacker.skills).slice(0, 3);
                const rank = hacker.rank || 'SILVER';

                return (
                  <div key={hacker.id} className="flex flex-col justify-between p-5 bg-[#1a1d24] rounded-xl border border-gray-800 hover:border-[#00c477]/30 transition-all group">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-black border border-gray-700 flex items-center justify-center font-black text-[#00c477] text-xl">
                            {name[0] || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-200 tracking-wider uppercase truncate max-w-[150px]">{name}</p>
                            <p className="text-[10px] text-[#00c477] font-mono tracking-widest">{handle ? `@${handle}` : 'OPERATOR'}</p>
                          </div>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded border border-gray-600 bg-gray-800 font-mono text-gray-300">{rank}</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {skills.length > 0 ? skills.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-black/50 border border-gray-700 rounded text-[9px] text-gray-400 font-mono">
                            {s}
                          </span>
                        )) : (
                          <span className="text-[9px] text-gray-600 font-mono italic">No specialized skills listed</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
                      <button
                        disabled={agreementLoading || isAssigned || isPending}
                        onClick={() => {
                          if (!isAssigned && !isPending) handleInviteClick(hacker);
                        }}
                        className="flex-1 py-2 bg-transparent hover:bg-[#00c477]/10 text-gray-400 hover:text-[#00c477] rounded-lg transition-all border border-gray-700 hover:border-[#00c477]/30 disabled:opacity-50 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        {agreementLoading ? <div className="w-3 h-3 border-2 border-transparent border-t-[#00c477] rounded-full animate-spin" /> : <FiSend />}
                        {isAssigned ? "Already Assigned" : isPending ? "Invite Sent" : "Invite"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-20 text-[10px] text-gray-600 uppercase tracking-widest font-mono">No operators found matching criteria</p>
          )}
        </div>

        <AnimatePresence>
          {agreementModal && selectedHacker && (
            <AgreementSelectionModal
              hacker={selectedHacker}
              projectId={projectId}
              onClose={() => setAgreementModal(false)}
              onConfirm={handleAgreementConfirm}
              onLoading={setAgreementLoading}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// Rest of the ProjectControlCenter code continues as before...
const ProjectControlCenter = ({ projectId, onBack }) => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [project, setProject] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canManageInvitations = authUser?.roles?.some(
    (r) => r.type === "ORG_ADMIN" || r.type === "PROJECT_ADMIN"
  );

  const loadProject = async () => {
    setLoading(true);
    try {
      const projRes = await api.get(`/projects/${projectId}`);
      setProject(projRes.data?.data || null);

      if (canManageInvitations) {
        try {
          const invRes = await invitationService.getInvitationsByProject(projectId);
          setInvitations(invRes.data || []);
        } catch (invError) {
          console.warn("Could not load invitations:", invError.response?.status);
          if (invError.response?.status !== 403) {
            toast.error("Unable to load project invitations");
          }
        }
      }
    } catch (error) {
      console.error("Load project error:", error);
      toast.error("Unable to load project data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && authUser) loadProject();
  }, [projectId, authUser, canManageInvitations]);

  const hackers = useMemo(() => {
    return project?.collaborators || [];
  }, [project]);

  const assignedIds = useMemo(() => {
    return hackers.map((h) => h.userId || h.id).filter(Boolean);
  }, [hackers]);

  const pendingInviteIds = useMemo(() => {
    const list = Array.isArray(invitations) ? invitations : [];
    return list
      .filter((inv) => inv.status === "PENDING")
      .map((inv) => inv.hackerId || inv.hacker?.id || inv.hacker?.userId)
      .filter(Boolean);
  }, [invitations]);

  const handleMakeAdmin = async (userId) => {
    try {
      await api.patch(`/projects/${projectId}/admin`, { projectAdminId: userId });
      toast.success("Lead Pentester assigned!");
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to make lead pentester");
    }
  };

  const handleRemoveAdmin = async () => {
    if (!window.confirm("Are you sure you want to remove the Administrator designation for this operator?")) return;
    try {
      await api.delete(`/projects/${projectId}/admin`);
      toast.success("Administrator designation removed!");
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove administrator designation");
    }
  };

  const handleRemoveHacker = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this operator from the project?")) return;

    try {
      await api.delete(`/projects/${projectId}/collaborators/${userId}`);
      toast.success("Operator removed from mission");
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove operator");
    }
  };

  const handleCreateWorkflow = async () => {
    if (project?.workflows?.[0]) {
      window.open(`/org-workflows/${project.workflows[0].id}`, '_blank');
      return;
    }

    try {
      const res = await api.post('/workflows', {
        pentestId: projectId,
        name: `${project.name} — Operational Workflow`
      });
      if (res.data?.success || res.data?.id) {
        toast.success("Workflow board initialized!");
        loadProject();
        const newWorkflowId = res.data?.id || res.data?.data?.id;
        if (newWorkflowId) window.open(`/org-workflows/${newWorkflowId}`, '_blank');
      }
    } catch (err) {
      toast.error("Failed to initialize workflow.");
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    if (!window.confirm("Are you sure you want to revoke this invitation?")) return;
    try {
      await invitationService.revokeInvitation(invitationId);
      toast.success("Invitation revoked");
      loadProject();
    } catch (err) {
      toast.error("Failed to revoke invitation");
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.patch(`/projects/${projectId}`, { status: newStatus });
      toast.success(`Mission status updated to ${newStatus}`);
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update project status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1115] text-[#00c477]">
        <div className="w-10 h-10 border-2 border-transparent border-t-[#00c477] rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return null;

  const statuses = ["PLANNING", "IN_PROGRESS", "REPORTING", "CLOSED"];
  const currentPhaseIndex = statuses.indexOf(project.status) !== -1 ? statuses.indexOf(project.status) : 1;
  const phasePercentage = ((currentPhaseIndex + 1) / 4) * 100;

  return (
    <div className="bg-[#0f1115] min-h-screen text-gray-300 font-mono p-4 md:p-8 selection:bg-[#00c477]/30 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 truncate">
          <button onClick={onBack} className="hover:text-[#00c477] transition-colors flex items-center gap-1">
            <FiArrowLeft /> BACK
          </button>
          <span>/ PROJECTS / {project.name?.replace(/\s+/g, '_')?.toUpperCase() || 'NEXUS_CORE'} / <span className="text-[#00c477]">CONTROL</span></span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase break-all">PROJECT_CONTROL_CENTER</h1>
          </div>

          <button
            onClick={handleCreateWorkflow}
            className="flex items-center justify-center gap-3 bg-[#00c477] hover:bg-[#00c477] text-black px-6 py-3 rounded-md font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,196,119,0.2)] hover:shadow-[0_0_25px_rgba(0,196,119,0.4)] active:scale-95 whitespace-nowrap"
          >
            {project?.workflows?.[0] ? 'OPEN_WORKFLOW' : 'CREATE_WORKFLOW'} <FiPlus size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#15181e] border border-gray-800 rounded-lg p-6 relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[#00c477] text-xs font-black uppercase tracking-widest mb-2">MISSION_TIMELINE</h3>
                  <div className="text-2xl text-gray-300">Phase 0{currentPhaseIndex + 1}/04 - {project.status?.replace('_', ' ') || 'PLANNING'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">OVERALL COMPLETION</div>
                  <div className="text-3xl font-black text-[#00c477]">{phasePercentage}%</div>
                </div>
              </div>

              <div className="h-10 bg-[#0a0c10] w-full mb-6 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${phasePercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-linear-to-r from-[#1a3a2d] to-[#00c477] relative"
                >
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white" />
                </motion.div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-gray-800 pt-6">
                {statuses.map((status, index) => {
                  const isActive = index <= currentPhaseIndex;
                  return (
                    <button
                      key={status}
                      disabled={!canManageInvitations}
                      onClick={() => handleUpdateStatus(status)}
                      className={`text-left border-l-2 pl-3 transition-all ${isActive
                        ? 'border-[#00c477] hover:border-[#00ff88]/80 cursor-pointer'
                        : 'border-gray-800 hover:border-gray-700 cursor-pointer'
                        } disabled:cursor-default disabled:opacity-80`}
                    >
                      <div className="text-[10px] text-gray-600 mb-1">ST-0{index + 1}</div>
                      <div className={`text-xs font-bold uppercase transition-colors ${isActive ? 'text-gray-300 group-hover:text-[#00ff88]' : 'text-gray-700'
                        }`}>
                        {status.replace('_', ' ')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#15181e] border border-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-6">
                <h3 className="text-[#00c477] text-xs font-black uppercase tracking-widest">OPERATIVE_FLEET</h3>
                <div className="flex items-center gap-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest">{hackers.length}_ACTIVES_IDENTIFIED</div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 bg-[#1a3a2d] hover:bg-[#00c477] text-[#00c477] hover:text-black border border-[#00c477]/30 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    <FiUserPlus /> ASSIGN HACKER
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {hackers.map((hacker) => {
                  const isLead = hacker.role === "PROJECT_ADMIN";
                  const isViewer = hacker.role === "VIEWER";
                  return (
                    <div key={hacker.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#1a1d24] border border-gray-800/50 rounded hover:border-[#00c477]/30 transition-colors group gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <div className={`w-12 h-12 bg-black border flex items-center justify-center overflow-hidden font-black text-xl ${
                            isViewer ? 'text-sky-400 border-sky-500/40' : 'text-[#00c477] border-gray-700'
                          }`}>
                            {hacker.user?.fullName?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-[#1a1d24] ${
                            isViewer ? 'bg-sky-400' : 'bg-[#00c477]'
                          }`} />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-bold text-gray-200 tracking-wider uppercase truncate">{hacker.user?.fullName || hacker.user?.email}</div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className={`text-[9px] px-1.5 py-0.5 uppercase tracking-widest ${
                              isViewer ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' : 'bg-[#1a3a2d] text-[#00c477]'
                            }`}>
                              {isViewer ? 'VIEWER' : 'ACCEPTED'}
                            </span>
                            {hacker.user?.handle && (
                              <span className="text-[10px] text-gray-500 font-mono">@{hacker.user.handle}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-8">
                        {isLead ? (
                          <div className="flex items-center gap-2">
                            <div className="text-[#00c477] border border-[#00c477]/30 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest bg-[#00c477]/5 whitespace-nowrap">
                              LEAD_ADMIN
                            </div>
                            {canManageInvitations && (
                              <button
                                onClick={handleRemoveAdmin}
                                className="text-gray-400 border border-gray-700 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:text-rose-500 hover:border-rose-500/50 transition-all bg-transparent whitespace-nowrap"
                              >
                                REMOVE_ADMIN
                              </button>
                            )}
                          </div>
                        ) : isViewer ? (
                          <div className="flex items-center gap-2">
                            <div className="text-sky-400 border border-sky-500/30 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest bg-sky-500/5 whitespace-nowrap">
                              VIEWER_ONLY
                            </div>
                            <button
                              onClick={() => handleRemoveHacker(hacker.userId)}
                              className="text-gray-600 hover:text-rose-500 p-2 rounded hover:bg-rose-500/10 transition-all"
                              title="Revoke Viewer Access"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMakeAdmin(hacker.userId)}
                              className="text-gray-400 border border-gray-700 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:text-[#00c477] hover:border-[#00c477] transition-all bg-transparent whitespace-nowrap"
                            >
                              ASSIGN_ADMIN
                            </button>
                            <button
                              onClick={() => handleRemoveHacker(hacker.userId)}
                              className="text-gray-600 hover:text-rose-500 p-2 rounded hover:bg-rose-500/10 transition-all"
                              title="Remove Operator"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(Array.isArray(invitations) ? invitations : []).filter(i => i.status === 'PENDING').map((inv) => (
                  <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#1a1d24]/40 border border-dashed border-gray-700 rounded hover:border-amber-500/30 transition-colors group gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 bg-black border border-gray-800 flex items-center justify-center overflow-hidden text-gray-600 font-black text-xl opacity-50">
                          {inv.hacker?.fullName?.[0]?.toUpperCase() || "?"}
                        </div>
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold text-gray-500 tracking-wider uppercase truncate">{inv.hacker?.fullName || inv.hacker?.handle}</div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 uppercase tracking-widest border border-amber-500/20">PENDING_INVITE</span>
                          <span className="text-[9px] text-gray-700 uppercase tracking-widest">SENT: {new Date(inv.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-8">
                      <button
                        onClick={() => handleRevokeInvitation(inv.id)}
                        className="text-gray-600 hover:text-rose-500 p-2 rounded hover:bg-rose-500/10 transition-all"
                        title="Revoke Invitation"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {hackers.length === 0 && (Array.isArray(invitations) ? invitations : []).filter(i => i.status === 'PENDING').length === 0 && (
                  <div className="text-center py-8 text-gray-600 text-xs uppercase tracking-widest">
                    No operatives assigned to this sector.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#15181e] border border-gray-800 rounded-lg p-6 flex flex-col h-[320px]">
              <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-4 shrink-0">LIVE_LOGS</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar -mx-4 px-4 relative">
                <div className="absolute inset-0">
                  <ProjectActivity projectId={projectId} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showInviteModal && (
          <HackerDiscoveryModal
            projectId={projectId}
            assignedIds={assignedIds}
            pendingInviteIds={pendingInviteIds}
            onClose={() => setShowInviteModal(false)}
            onInvited={() => {
              loadProject();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectControlCenter;