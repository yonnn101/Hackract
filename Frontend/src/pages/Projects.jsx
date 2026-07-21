import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../api/axiosConfig";
import { useAuth } from "../context/authContext.jsx";
import {
  FiTerminal, FiArrowRight, FiZap,
  FiCheck, FiX, FiLock, FiActivity,
  FiTarget, FiClock, FiBell, FiCode, FiCpu,
  FiChevronRight, FiFolder, FiCheckCircle, FiTrash2, FiUser,
  FiBriefcase
} from "react-icons/fi";
import invitationService from "../services/invitation.service";
import SignedAgreementModal from "../components/SignedAgreementModal";


// ─── CONSTANTS & CONFIG ────────────────────────────────────────────────
const STATUS_CONFIG = {
  PLANNING: { label: "Planning", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
  IN_PROGRESS: { label: "In Progress", color: "text-[#00c477]", bg: "bg-[#00c477]/10", border: "border-[#00c477]/30" },
  REPORTING: { label: "Reporting", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  CLOSED: { label: "Closed", color: "text-gray-500", bg: "bg-gray-500/10", border: "border-gray-500/30" },
};

const TABS = [
  { id: "ALL_ACCESS", label: "All Projects" },
  { id: "LOCAL_LABS", label: "Personal Labs" },
  { id: "MISSIONS", label: "Active Engagements" },
  { id: "SHARED", label: "Shared with Me" },
  { id: "APPLICATIONS", label: "Sent Proposals" },
  { id: "INBOUND_REQS", label: "Pending Invitations" }
];

const getProjectDisplayName = (project) => {
  const rawName = project?.name || project?.title;
  return rawName && rawName.trim() ? rawName : "My Application";
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PLANNING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
      {cfg.label}
    </span>
  );
};

const RoleBadge = ({ role }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${role === 'LEAD'
    ? 'text-[#00c477] bg-[#00c477]/10 border-[#00c477]/30'
    : 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30'
    }`}>
    {role === 'LEAD' ? 'Lead' : 'Contributor'}
  </span>
);

// Shared Project Card (Read-Only Viewer styling)
const SharedProjectCard = ({ project, onOpen, index }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.05, duration: 0.3 }}
    className="bg-[#050505] border border-sky-500/20 hover:border-sky-400/50 rounded-2xl p-6 group transition-all relative flex flex-col font-sans hover:shadow-[0_0_30px_rgba(56,189,248,0.08)] cursor-pointer"
    onClick={() => onOpen(project.id)}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={project.status} />
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border text-sky-400 bg-sky-500/10 border-sky-500/30 uppercase tracking-wider">
          <FiUser size={10} /> Read-Only Viewer
        </span>
      </div>
      <div className="w-8 h-8 rounded-full bg-sky-500/10 group-hover:bg-sky-500/20 flex items-center justify-center transition-colors">
        <FiBriefcase className="text-sky-400" />
      </div>
    </div>

    <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors mb-2 leading-snug">
      {getProjectDisplayName(project)}
    </h3>
    <p className="text-xs text-sky-400/70 font-mono mb-3">
      {project.organization?.name || "Shared Engagement / Personal Lab"}
    </p>
    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-6">
      {project.description || "Shared with you in read-only capacity. You can view scope and findings telemetry."}
    </p>

    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-gray-400">
          <FiTarget size={12} />
        </div>
        <span className="text-[12px] text-gray-300 font-bold">{project.findings || project._count?.findings || 0} <span className="font-normal text-gray-500">Vulns</span></span>
      </div>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-400">
        <FiClock size={13} />
        {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "Shared Access"}
      </div>
    </div>

    <div className="pt-2 text-[13px] font-bold text-sky-400 group-hover:text-sky-300 transition-colors flex items-center gap-1">
      Enter Workspace (View Only) <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
    </div>
  </motion.div>
);

// Personal Project Card (Hacker styling)
const PersonalProjectCard = ({ project, onOpen, onDelete, index }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: index * 0.05, duration: 0.3 }}
    className="bg-[#050505] border border-white/5 hover:border-[#00c477]/30 rounded-2xl p-6 group transition-all relative flex flex-col font-sans hover:shadow-[0_0_30px_rgba(0,196,119,0.05)] cursor-pointer"
    onClick={() => onOpen(project.id)}
  >
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={project.status} />
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border text-gray-400 bg-white/5 border-white/10 uppercase tracking-wider">
          Personal Lab
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm("Are you sure you want to delete this lab? This action cannot be undone.")) {
              onDelete(project.id);
            }
          }}
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center transition-colors text-gray-500 hover:text-red-500"
          title="Delete Workspace"
        >
          <FiTrash2 size={14} />
        </button>
        <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-[#00c477]/10 flex items-center justify-center transition-colors">
          <FiCode className="text-gray-400 group-hover:text-[#00c477]" />
        </div>
      </div>
    </div>

    <h3 className="text-lg font-bold text-white group-hover:text-[#00c477] transition-colors mb-2 leading-snug">
      {getProjectDisplayName(project)}
    </h3>
    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-6">
      {project.description || "No specific target scope defined. This is an independent local runtime."}
    </p>

    <div className="mt-auto pt-4 border-t border-white/5 text-[12px] text-gray-400 flex items-center justify-between font-medium">
      <span className="flex items-center gap-1.5"><FiCode size={14} className="text-gray-500" /> {project.collaborators?.length || 0} Operators</span>
      {project.createdAt && (
        <span className="flex items-center gap-1.5"><FiClock size={14} className="text-gray-500" /> Init: {new Date(project.createdAt).toLocaleDateString()}</span>
      )}
    </div>
  </motion.div>
);

// Org Assignment Card
const OrgProjectCard = ({ project, onOpen, onAccept, onDecline, index }) => {
  const isPending = project.inviteStatus === 'PENDING';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`bg-[#050505] border rounded-2xl p-6 group transition-all relative flex flex-col font-sans hover:shadow-lg ${isPending
        ? 'border-amber-500/30 hover:border-amber-400/60 shadow-[0_4px_20px_rgba(245,158,11,0.05)]'
        : 'border-white/5 hover:border-white/20 cursor-pointer'
        }`}
      onClick={() => { if (!isPending) onOpen(project.id); }}
    >
      {/* Status + Role row */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <StatusBadge status={project.status} />
        <RoleBadge role={project.role} />
        {isPending && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border text-amber-500 bg-amber-500/10 border-amber-500/30 uppercase tracking-wider animate-pulse">
            <FiBell size={10} /> Pending
          </span>
        )}
      </div>

      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 shrink-0 overflow-hidden flex items-center justify-center">
          {project.organization?.avatar ? (
            <img
              src={project.organization.avatar}
              alt={project.organization?.name || "Org"}
              className={`w-10 h-10 object-cover ${!isPending ? 'group-hover:scale-110 transition-transform' : ''}`}
            />
          ) : (
            <div className="text-[#00c477] font-black text-sm">
              {(project.organization?.name || project.orgName || "H")?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h3 className={`text-lg font-bold ${isPending ? 'text-white' : 'text-white group-hover:text-[#00c477]'} transition-colors leading-snug truncate max-w-[200px]`}>
            {getProjectDisplayName(project)}
          </h3>
          <p className="text-[12px] text-gray-400 font-medium mt-0.5">{project.organization?.name || project.orgName || "Private Org"}</p>
        </div>
      </div>

      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-6">
        {project.description}
      </p>

      {/* Stats */}
      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-gray-400">
            <FiTarget size={12} />
          </div>
          <span className="text-[12px] text-gray-300 font-bold">{project.findings || project._count?.findings || 0} <span className="font-normal text-gray-500">Vulns</span></span>
        </div>
        <div className={`flex items-center gap-1.5 text-[12px] font-medium ${isPending ? 'text-amber-500' : 'text-gray-400'}`}>
          <FiClock size={13} />
          {project.deadline || (project.endDate ? new Date(project.endDate).toLocaleDateString() : "No Deadline")}
        </div>
      </div>

      {/* CTA */}
      <div>
        {isPending ? (
          <div className="flex gap-3 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); onDecline(project.id); }}
              className="flex-1 py-2.5 rounded-xl border border-red-500/20 hover:bg-red-500/10 text-red-500 text-[13px] font-bold transition-all"
            >
              Decline
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAccept(project.id); }}
              className="flex-1 py-2.5 rounded-xl bg-[#00c477] hover:bg-[#00a665] text-black text-[13px] font-bold transition-all shadow-md"
            >
              Accept Invite
            </button>
          </div>
        ) : (
          <div className="pt-2 text-[13px] font-bold text-gray-400 group-hover:text-[#00c477] transition-colors flex items-center gap-1">
            Enter Workspace <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Applied Project (Sent Proposal) Card
const AppliedProjectCard = ({ project, onWithdraw, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-[#050505] border border-amber-500/10 hover:border-amber-500/30 rounded-2xl p-6 group transition-all relative flex flex-col font-sans hover:shadow-lg shadow-[0_4px_20px_rgba(245,158,11,0.02)]"
    >
      {/* Status + Role row */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <StatusBadge status={project.status} />
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/30 uppercase tracking-wider">
          Proposal Sent
        </span>
      </div>

      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 shrink-0 overflow-hidden flex items-center justify-center">
          {project.organization?.avatar ? (
            <img
              src={project.organization.avatar}
              alt={project.organization?.name || "Org"}
              className="w-10 h-10 object-cover"
            />
          ) : (
            <div className="text-[#00c477] font-black text-sm">
              {(project.organization?.name || project.orgName || "H")?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white transition-colors leading-snug truncate max-w-[200px]">
            {getProjectDisplayName(project)}
          </h3>
          <p className="text-[12px] text-gray-400 font-medium mt-0.5">{project.organization?.name || project.orgName || "Private Org"}</p>
        </div>
      </div>

      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-6">
        {project.description}
      </p>

      {/* Stats */}
      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-gray-400">
            <FiTarget size={12} />
          </div>
          <span className="text-[12px] text-gray-300 font-bold">{project.findings || project._count?.findings || 0} <span className="font-normal text-gray-500">Vulns</span></span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-400">
          <FiClock size={13} />
          {project.deadline || (project.endDate ? new Date(project.endDate).toLocaleDateString() : "No Deadline")}
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <span className="text-xs text-amber-500 font-medium flex items-center gap-1.5">
          <FiClock className="animate-pulse" size={12} /> Under Review
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm("Are you sure you want to withdraw your proposal for this project?")) {
              onWithdraw(project.id);
            }
          }}
          className="px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-500 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
        >
          <FiX size={12} /> Withdraw
        </button>
      </div>
    </motion.div>
  );
};

// Personal Quick-Create Card
const PersonalWorkspaceCard = ({ onCreate }) => {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Please provide a project name.");
    setLoading(true);
    try {
      const { data } = await api.post("/projects/personal", { name: name.trim(), description: description.trim() });
      toast.success("Workspace Initiated.");
      setExpanded(false);
      setName(""); setDescription("");
      onCreate(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to initialize workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div layout className="border border-white/5 bg-[#050505] rounded-3xl overflow-hidden relative group font-sans">
      <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 shrink-0 shadow-sm border border-white/5">
          <FiFolder size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-lg flex items-center gap-3">
            Initialize Personal Lab
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Create personal workflow for independent exploitation testing, research, and personal tooling.
          </p>
        </div>
        <button
          onClick={() => setExpanded(v => !v)}
          className={`w-full md:w-auto px-6 py-3 rounded-xl flex items-center justify-center transition-all text-sm font-bold gap-2 ${expanded
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-[#00c477] text-black hover:bg-[#00a665] shadow-[0_4px_20px_rgba(0,196,119,0.2)]"
            }`}
        >
          {expanded ? <><FiX /> Cancel</> : <><FiTerminal /> Create Project</>}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-[#0a0a0a]"
          >
            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Project Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreate()}
                    className="w-full bg-[#111] border border-white/10 focus:border-[#00c477] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
                    placeholder="e.g. Android Root Detection Bypass Lab"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Scope / Objective</label>
                  <input
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 focus:border-[#00c477] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
                    placeholder="Define attack vectors or testing goals..."
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between pt-2 gap-4">
                <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                  <FiLock className="text-[#00c477]" />
                  <span>Private by default. Unlisted from org directories.</span>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#00c477] hover:bg-[#00a665] text-black text-sm font-bold transition-all disabled:opacity-50"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <FiZap />}
                  {loading ? "Initializing..." : "Launch Workspace"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [personalProjects, setPersonalProjects] = useState([]);
  const [orgProjects, setOrgProjects] = useState([]);
  const [sharedProjects, setSharedProjects] = useState([]);
  const [appliedProjects, setAppliedProjects] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [activeInvite, setActiveInvite] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    return tabParam ? tabParam.toUpperCase() : "ALL_ACCESS";
  });

  // Load real personal + org projects from API
  const loadData = async () => {
    setLoading(true);
    try {
      const [projRes, invRes] = await Promise.all([
        api.get("/projects"),
        invitationService.getMyInvitations({ status: 'PENDING' })
      ]);

      const allProjects = projRes.data?.data || [];
      const myInvites = invRes.data?.invitations || invRes.data || [];

      const myCollaboratorRole = (p) => {
        const c = p.collaborators?.find((collab) => collab.userId === user?.id);
        return c?.role;
      };

      setPersonalProjects(allProjects.filter(p => p.isPersonal && myCollaboratorRole(p) !== 'VIEWER'));

      setOrgProjects(allProjects.filter(p => {
        if (!p.organizationId) return false;
        const role = myCollaboratorRole(p);
        return role && role !== "APPLICANT" && role !== "VIEWER";
      }));

      setSharedProjects(allProjects.filter(p => {
        const role = myCollaboratorRole(p);
        return role === "VIEWER";
      }));

      setAppliedProjects(allProjects.filter(p => {
        if (!p.organizationId) return false;
        const role = myCollaboratorRole(p);
        return role === "APPLICANT";
      }));

      setPendingInvitations(myInvites);
    } catch (err) {
      console.error("Failed to load projects", err);
      toast.error("Network disruption: Could not sync node state");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Sync tab state with URL parameter if it changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      setActiveTab(tabParam.toUpperCase());
    }
  }, [window.location.search]);

  const pendingCount = pendingInvitations.length;

  // Tab filtering
  const displayPersonal = activeTab === 'ALL_ACCESS' || activeTab === 'LOCAL_LABS';
  const displayOrg = activeTab === 'ALL_ACCESS' || activeTab === 'MISSIONS';
  const displayShared = activeTab === 'ALL_ACCESS' || activeTab === 'SHARED';
  const displayPending = activeTab === 'ALL_ACCESS' || activeTab === 'INBOUND_REQS';
  const displayApplied = activeTab === 'ALL_ACCESS' || activeTab === 'APPLICATIONS';

  const handleAccept = async (id) => {
    const invite = pendingInvitations.find((inv) => inv.id === id);
    if (!invite) return;

    if (invite.role === 'VIEWER' || !invite.agreementFileUrl) {
      try {
        await invitationService.respondToInvitation(invite.id, 'ACCEPTED');
        toast.success("Read-only invitation accepted! Workspace acquired.");
        loadData();
      } catch (err) {
        toast.error(err?.response?.data?.error || "Failed to accept invitation");
      }
      return;
    }

    setActiveInvite(invite);
    setSignModalOpen(true);
  };

  const handleSignedConfirm = async (fileData) => {
    if (!activeInvite?.id) return;
    try {
      await invitationService.respondToInvitation(activeInvite.id, {
        status: 'ACCEPTED',
        signedFile: fileData,
      });
      toast.success("Assignment accepted. Target nodes acquired.");
      loadData();
    } catch (err) {
      throw err;
    }
  };

  const handleDecline = async (id) => {
    if (!window.confirm("Are you sure you want to decline this invitation?")) return;
    try {
      await invitationService.respondToInvitation(id, 'REJECTED');
      toast.success("Invitation declined.");
      loadData();
    } catch (err) {
      toast.error("Failed to decline invitation");
    }
  };
  const handlePersonalCreated = p => {
    setPersonalProjects(prev => [p, ...prev]);
    navigate(`/projects/${p.id}`);
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success("Project deleted successfully");
      setPersonalProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      toast.error(err?.response?.data?.error || "Deletion failed");
    }
  };

  const handleWithdrawProposal = async (projectId) => {
    try {
      await api.delete(`/projects/${projectId}/collaborators/${user.id}`);
      toast.success("Proposal withdrawn successfully");
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Withdrawal failed");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full text-gray-300 font-sans space-y-6 lg:space-y-8 min-h-[calc(100vh-80px)]">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">My Applications</h1>
        <p className="text-gray-500 text-sm max-w-2xl">
          Manage your personal labs and track assigned organizational engagements in one place.
        </p>
      </div>

      {/* Tab Nav & pending alert */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#111] border border-white/5 rounded-xl p-1 w-full lg:w-auto overflow-x-auto hide-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === tab.id
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
            >
              {tab.label}
              {tab.id === 'INBOUND_REQS' && pendingCount > 0 && (
                <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="space-y-12 pb-12">
        {/* Pending Invites Alert */}
        <AnimatePresence>
          {pendingCount > 0 && (activeTab === 'ALL_ACCESS' || activeTab === 'INBOUND_REQS') && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              className="flex items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <FiBell className="text-amber-500 text-lg" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Action Required
                  </h3>
                  <p className="text-xs text-amber-200/70 mt-0.5 font-medium">You have {pendingCount} outstanding mission request(s) awaiting your decision.</p>
                </div>
              </div>
              <button
                className="hidden sm:block text-sm font-bold text-amber-500 hover:text-amber-400"
                onClick={() => setActiveTab('INBOUND_REQS')}
              >
                View Requests
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending Invites Grid */}
        {displayPending && pendingInvitations.length > 0 && (
          <section className="space-y-5">
            <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Pending Invitations
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pendingInvitations.map((inv, i) => (
                <OrgProjectCard
                  key={inv.id}
                  project={{
                    ...inv.pentest,
                    id: inv.id, // We use invitation ID for the response call
                    inviteStatus: 'PENDING',
                    orgName: inv.pentest?.organization?.name || "Enterprise Org",
                    orgAvatar: inv.pentest?.organization?.avatar
                  }}
                  index={i}
                  onOpen={id => navigate(`/projects/${inv.pentestId}`)}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))}
            </div>
          </section>
        )}

        {/* Personal Projects section */}
        {displayPersonal && (
          <section className="space-y-5">
            <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Independent Resources
            </h2>

            <PersonalWorkspaceCard onCreate={handlePersonalCreated} />

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-white/10 border-t-[#00c477] rounded-full animate-spin" />
              </div>
            ) : personalProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                {personalProjects.map((p, i) => (
                  <PersonalProjectCard key={p.id} project={p} index={i} onOpen={id => navigate(`/projects/${id}`)} onDelete={handleDeleteProject} />
                ))}
              </div>
            ) : (
              null // we already show the creation card, no need for redundant empty state
            )}
          </section>
        )}

        {/* Active Engagements section */}
        {displayOrg && (
          <section className="space-y-5">
            <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#00c477]" /> Active Organization Projects
            </h2>

            {orgProjects.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 bg-[#0a0a0a] rounded-3xl text-gray-500 text-sm">
                <FiActivity size={32} className="opacity-30 mb-2" />
                <p>No active organizational Projects currently underway.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {orgProjects.map((p, i) => (
                  <OrgProjectCard
                    key={p.id}
                    project={{
                      ...p,
                      orgName: p.organization?.name,
                      orgAvatar: p.organization?.avatar
                    }}
                    index={i}
                    onOpen={id => navigate(`/projects/${p.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Shared Projects Section */}
        {displayShared && (
          <section className="space-y-5">
            <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-sky-400" /> Shared Read-Only Projects
            </h2>

            {sharedProjects.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 bg-[#0a0a0a] rounded-3xl text-gray-500 text-sm">
                <FiUser size={32} className="opacity-30 mb-2 text-sky-400" />
                <p>No projects currently shared with you in read-only mode.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sharedProjects.map((p, i) => (
                  <SharedProjectCard
                    key={p.id}
                    project={p}
                    index={i}
                    onOpen={id => navigate(`/projects/${p.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Sent Proposals section */}
        {displayApplied && (
          <section className="space-y-5">
            <h2 className="text-sm font-bold text-gray-400 tracking-wider uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Sent Proposals
            </h2>

            {appliedProjects.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/5 bg-[#0a0a0a] rounded-3xl text-gray-500 text-sm">
                <FiActivity size={32} className="opacity-30 mb-2" />
                <p>No pending engagement proposals sent.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {appliedProjects.map((p, i) => (
                  <AppliedProjectCard
                    key={p.id}
                    project={{
                      ...p,
                      orgName: p.organization?.name,
                      orgAvatar: p.organization?.avatar
                    }}
                    index={i}
                    onWithdraw={handleWithdrawProposal}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <SignedAgreementModal
        open={signModalOpen}
        onClose={() => { setSignModalOpen(false); setActiveInvite(null); }}
        onConfirm={handleSignedConfirm}
        agreementUrl={activeInvite?.agreementFileUrl}
        agreementTitle={activeInvite?.agreementTitle}
      />
    </div>
  );
};

export default Projects;
