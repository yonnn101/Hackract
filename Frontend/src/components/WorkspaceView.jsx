import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import DOMPurify from "dompurify";
import api from "../api/axiosConfig";
import { generateWorkflowAssistantResponse } from "../api/assistantApi";
import ProjectActivity from "./ProjectActivity.jsx";
import KickoffChecklist from "./KickoffChecklist.jsx";
import { useAuth } from "../context/authContext.jsx";
import { FiDownload, FiExternalLink, FiFileText, FiArrowLeft, FiCode, FiPrinter, FiGlobe, FiServer, FiFileMinus, FiCalendar, FiPlus, FiUserPlus, FiTrash2, FiSearch, FiX, FiSend, FiEdit2, FiStar, FiUsers, FiFile } from "react-icons/fi";
import { getPrimaryRole, ROLES } from "../utils/roles.js";
import { marked } from "marked";

marked.setOptions({ breaks: true, gfm: true });

const renderAssistantMarkdown = (text) => {
  const html = marked.parse(String(text ?? ""));
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
  });
};

const DEFAULT_ASSISTANT_MESSAGES = [
  { sender: 'AI', text: 'Hello Admin. System is ready. How can I assist you with the project?' },
];

const getAssistantStorageKey = (projectId, userId) => `hackract_project_ai_chat:${projectId || 'unknown'}:${userId || 'guest'}`;

const normalizeAssistantMessages = (messages) => {
  if (!Array.isArray(messages)) return DEFAULT_ASSISTANT_MESSAGES;

  const normalized = messages
    .map((message) => ({
      sender: message?.sender === 'Admin' ? 'Admin' : 'AI',
      text: String(message?.text ?? '').trim(),
    }))
    .filter((message) => message.text.length > 0);

  return normalized.length > 0 ? normalized : DEFAULT_ASSISTANT_MESSAGES;
};

const loadAssistantMessages = (storageKey) => {
  if (typeof window === 'undefined' || !storageKey) return DEFAULT_ASSISTANT_MESSAGES;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_ASSISTANT_MESSAGES;

    return normalizeAssistantMessages(JSON.parse(raw));
  } catch {
    return DEFAULT_ASSISTANT_MESSAGES;
  }
};

const InviteMemberModal = ({ projectId, onClose, onInvited }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/users?search=${search}`);
      setResults(data.data || []);
    } catch (e) {
      toast.error("Failed to find users");
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async (hackerId) => {
    setSending(hackerId);
    try {
      await api.post(`/invitations`, {
        pentestId: projectId,
        hackerId,
        message: "You have been invited to collaborate on this security program.",
      });
      toast.success("Invitation sent!");
      onInvited();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to send invitation");
    } finally {
      setSending(null);
    }
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
        className="bg-[#0a0a0a] border border-white/10 rounded-4xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Deploy Personnel</h3>
              <p className="text-[10px] text-white/20 font-mono tracking-[0.2em] mt-1">SEARCH & AUTHORIZE OPERATORS</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/20 hover:text-white transition-all">
              <FiX size={20} />
            </button>
          </div>

          <div className="relative">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by handle or email..."
              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-[#00ff88]/50 transition-all font-medium"
            />
            <button
              onClick={handleSearch}
              className="absolute right-3 top-3 p-2 bg-[#00ff88] text-black rounded-xl hover:scale-105 active:scale-95 transition-all"
            >
              <FiSearch size={16} />
            </button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {loading ? (
              <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-white/10 border-t-[#00ff88] rounded-full animate-spin" /></div>
            ) : results.length > 0 ? (
              results.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center font-bold text-[#00ff88]">
                      {u.fullName?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">{u.fullName}</p>
                      <p className="text-[10px] text-white/40 font-mono tracking-tighter">{u.handle} • {u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={sending === u.id}
                      onClick={() => sendInvite(u.id)}
                      className="p-3 bg-white/5 hover:bg-[#00ff88]/20 text-white/40 hover:text-[#00ff88] rounded-xl transition-all border border-white/5 hover:border-[#00ff88]/30 disabled:opacity-50"
                      title="Send Invitation"
                    >
                      {sending === u.id ? <div className="w-4 h-4 border-2 border-white/10 border-t-[#00ff88] rounded-full animate-spin" /> : <FiSend size={14} />}
                    </button>
                  </div>
                </div>
              ))
            ) : search && !loading ? (
              <p className="text-center py-10 text-[10px] text-white/20 uppercase tracking-widest font-mono">No operators found matching criteria</p>
            ) : (
              <p className="text-center py-10 text-[10px] text-white/20 uppercase tracking-widest font-mono italic">Enter credentials to begin search</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const WorkspaceView = ({ projectId, onBack }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  //const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "workflow");
  const [showInvite, setShowInvite] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiSending, setAiSending] = useState(false);
  const [assistantActivity, setAssistantActivity] = useState([]);
  const [assistantFindings, setAssistantFindings] = useState([]);
  const assistantStorageKey = useMemo(
    () => getAssistantStorageKey(projectId, user?.id),
    [projectId, user?.id]
  );
  const [aiMessages, setAiMessages] = useState(() => loadAssistantMessages(assistantStorageKey));
  const workspaceName = project?.name || "Project Workspace";

  const isOrgAdmin = useMemo(() => {
    return getPrimaryRole(user) === ROLES.ORG_ADMIN;
  }, [user]);

  const isProjectAdmin = useMemo(() => {
    return project?.collaborators?.some(
      (c) => c.userId === user?.id && (c.role === "PROJECT_ADMIN" || c.role === "admin" || c.role === "lead")
    );
  }, [user, project]);

  const isViewer = useMemo(() => {
    return project?.collaborators?.some(
      (c) => c.userId === user?.id && c.role === "VIEWER"
    );
  }, [user, project]);

  const canManage = useMemo(() => {
    if (isViewer) return false;
    return (
      user?.roles?.some((r) => r.type === "ORG_ADMIN") ||
      project?.collaborators?.some((c) => c.userId === user?.id && (c.role === "PROJECT_ADMIN" || c.role === "PROJECT_LEAD" || c.role === "admin" || c.role === "lead")) ||
      project?.leadPentesterId === user?.id ||
      project?.collaborators?.some((c) => c.userId === user?.id && c.role !== "VIEWER")
    );
  }, [user, project, isViewer]);

  const myCollaborator = useMemo(() => {
    return project?.collaborators?.find((c) => c.userId === user?.id);
  }, [project, user]);

  const tabs = useMemo(() => {
    if (!project) return [];
    let base = project.isPersonal
      ? ["workflow", "findings"]
      : ["overview", "workflow", "findings", "team"];

    if (isViewer) {
      const canViewFindings = myCollaborator ? myCollaborator.canViewFindings !== false : true;
      const canViewTeam = myCollaborator ? myCollaborator.canViewTeam !== false : true;
      const canViewWorkflow = myCollaborator ? myCollaborator.canViewWorkflow !== false : true;

      base = ["overview"];
      if (canViewWorkflow) base.push("workflow");
      if (canViewFindings) base.push("findings");
      if (canViewTeam && !project.isPersonal) base.push("team");
    }

    if (canManage) {
      base.push("settings");
    }
    return base;
  }, [project, canManage, isViewer, myCollaborator]);

  const [activeTab, setActiveTab] = useState(() => {
    const queryTab = searchParams.get("tab");
    if (queryTab && tabs.includes(queryTab)) return queryTab;
    return project?.isPersonal ? "workflow" : "overview";
  });

  useEffect(() => {
    if (tabs.length > 0 && !tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab]);

  const [targetDomains, setTargetDomains] = useState("");
  const [ipRanges, setIpRanges] = useState("");
  const [excludedAssets, setExcludedAssets] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [viewerEmail, setViewerEmail] = useState("");
  const [isAddingViewer, setIsAddingViewer] = useState(false);
  const [shareLinks, setShareLinks] = useState([]);
  const [isRevoking, setIsRevoking] = useState(false);

  // Link sharing checkboxes state
  const [linkShareFindings, setLinkShareFindings] = useState(true);
  const [linkShareTeam, setLinkShareTeam] = useState(true);
  const [linkShareWorkflow, setLinkShareWorkflow] = useState(true);

  // Email viewer invitation checkboxes state
  const [emailShareFindings, setEmailShareFindings] = useState(true);
  const [emailShareTeam, setEmailShareTeam] = useState(true);
  const [emailShareWorkflow, setEmailShareWorkflow] = useState(true);

  useEffect(() => {
    if (project) {
      setTargetDomains(project.targetDomains?.join("\n") || "");
      setIpRanges(project.ipRanges?.join("\n") || "");
      setExcludedAssets(project.excludedAssets || "");
      setProjectName(project.name || "");
      setProjectDescription(project.description || "");
    }
  }, [project]);

  useEffect(() => {
    if (project) {
      if (!tabs.includes(activeTab)) {
        setActiveTab(project.isPersonal ? "workflow" : "overview");
      }
    }
  }, [project, tabs, activeTab]);

  const loadProject = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/projects/${projectId}`);
      setProject(data?.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.error || "Unable to load project");
    } finally {
      setLoading(false);
    }
  };

  const loadShareLinks = async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}/share`);
      if (data?.success) setShareLinks(data.data);
    } catch (error) {
      console.error("Unable to load share links", error);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedDomains = targetDomains.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      const parsedIpRanges = ipRanges.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      
      const res = await api.patch(`/projects/${projectId}`, {
        name: projectName,
        description: projectDescription,
        targetDomains: parsedDomains,
        ipRanges: parsedIpRanges,
        excludedAssets: excludedAssets
      });

      if (res.data?.success) {
        toast.success("Project settings updated successfully!");
        loadProject();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update project settings: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!linkShareFindings && !linkShareTeam && !linkShareWorkflow) {
      toast.error("You must select at least one section (Findings, Team, or Workflow) to share.");
      return;
    }
    setIsSharing(true);
    try {
      const res = await api.post(`/projects/${projectId}/share`, {
        canViewFindings: linkShareFindings,
        canViewTeam: linkShareTeam,
        canViewWorkflow: linkShareWorkflow
      });
      if (res.data?.success) {
        toast.success("Shareable link generated!");
        loadShareLinks();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate shareable link: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeLink = async (linkId) => {
    setIsRevoking(true);
    try {
      const res = await api.delete(`/projects/${projectId}/share/${linkId}`);
      if (res.data?.success) {
        toast.success("Link revoked successfully.");
        loadShareLinks();
      }
    } catch (err) {
      toast.error("Failed to revoke link: " + (err.response?.data?.error || err.message));
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRevokeAllLinks = async () => {
    setIsRevoking(true);
    try {
      const res = await api.delete(`/projects/${projectId}/share`);
      if (res.data?.success) {
        toast.success("All links revoked successfully.");
        loadShareLinks();
      }
    } catch (err) {
      toast.error("Failed to revoke all links: " + (err.response?.data?.error || err.message));
    } finally {
      setIsRevoking(false);
    }
  };

  const handleAddViewer = async (e) => {
    e.preventDefault();
    if (!viewerEmail.trim()) return;
    if (!emailShareFindings && !emailShareTeam && !emailShareWorkflow) {
      toast.error("You must select at least one section (Findings, Team, or Workflow) to share.");
      return;
    }
    setIsAddingViewer(true);
    try {
      const { data } = await api.get(`/chat/users/search?q=${encodeURIComponent(viewerEmail)}`);
      const targetUser = data.data?.users?.[0];
      
      if (!targetUser) {
        toast.error("User not found in system. Please check the email or handle.");
        return;
      }
      
      const res = await api.post(`/projects/${projectId}/viewers`, {
        userId: targetUser.id,
        canViewFindings: emailShareFindings,
        canViewTeam: emailShareTeam,
        canViewWorkflow: emailShareWorkflow
      });
      if (res.data?.success) {
        toast.success("Read-only invitation sent to viewer!");
        setViewerEmail("");
        loadProject();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to invite viewer: " + (err.response?.data?.error || err.message));
    } finally {
      setIsAddingViewer(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadShareLinks();
    }
  }, [projectId]);

  useEffect(() => {
    setAiMessages(loadAssistantMessages(assistantStorageKey));
  }, [assistantStorageKey]);

  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;

    const loadAssistantContext = async () => {
      try {
        const [activityRes, findingsRes] = await Promise.all([
          api.get(`/projects/${projectId}/activity`),
          api.get('/findings', { params: { pentestId: projectId, limit: 5 } }),
        ]);

        if (!isMounted) return;

        setAssistantActivity(Array.isArray(activityRes.data?.data) ? activityRes.data.data.slice(0, 5) : []);
        setAssistantFindings(Array.isArray(findingsRes.data?.data) ? findingsRes.data.data.slice(0, 5) : []);
      } catch (error) {
        if (!isMounted) return;
        setAssistantActivity([]);
        setAssistantFindings([]);
      }
    };

    loadAssistantContext();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !assistantStorageKey) return;

    window.localStorage.setItem(assistantStorageKey, JSON.stringify(normalizeAssistantMessages(aiMessages)));
  }, [assistantStorageKey, aiMessages]);

  const projectAdmin = useMemo(
    () => project?.collaborators?.find((c) => c.role === "PROJECT_ADMIN"),
    [project]
  );

  const hackers = useMemo(
    () => project?.collaborators?.filter((c) => c.role === "HACKER") || [],
    [project]
  );

  const applicants = useMemo(
    () => project?.collaborators?.filter((c) => c.role === "APPLICANT") || [],
    [project]
  );

  const handleHire = async (userId) => {
    try {
      await api.post(`/projects/${projectId}/hire`, { userId });
      toast.success("Hacker hired!");
      loadProject();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Hiring failed");
    }
  };
  const handleMakeAdmin = async (userId) => {
    try {
      await api.patch(`/projects/${projectId}/admin`, { projectAdminId: userId });
      toast.success("Lead Pentester assigned!");
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to make lead pentester");
    }
  };

  const handleRemoveMember = async (userId, role) => {
    const isViewer = role === "VIEWER";
    const confirmMsg = isViewer
      ? "Are you sure you want to revoke access for this viewer?"
      : "Are you sure you want to ban this hacker from the project?";
      
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.delete(`/projects/${projectId}/collaborators/${userId}`);
      toast.success(isViewer ? "Viewer access revoked" : "Hacker banned from project");
      setProject(prev => ({
        ...prev,
        collaborators: prev.collaborators.filter(c => c.userId !== userId)
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || (isViewer ? "Failed to revoke access" : "Failed to ban hacker"));
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm("CRITICAL: Are you sure you want to delete this project? This cannot be undone.")) return;
    try {
      await api.delete(`/projects/${projectId}`);
      toast.success("Project deleted successfully");
      navigate('/org-projects');
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete project");
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await api.patch(`/projects/${projectId}`, { status });
      toast.success("Status updated");
      loadProject();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const assistantContext = useMemo(() => {
    if (!project) return '';

    const recentActivityLines = assistantActivity.length
      ? assistantActivity.map((item) => {
          const actor = item.user?.fullName || item.user?.handle || 'System';
          const message = item.message || item.action || 'No message available';
          return `- ${actor}: ${message}`;
        })
      : ['- No recent activity captured.'];

    const recentFindingLines = assistantFindings.length
      ? assistantFindings.map((finding) => {
          const title = finding.title || 'Untitled finding';
          const severity = finding.severity || 'UNKNOWN';
          const status = finding.status || 'UNKNOWN';
          const asset = finding.affectedAsset ? ` | Asset: ${finding.affectedAsset}` : '';
          return `- ${title} [${severity} | ${status}]${asset}`;
        })
      : ['- No recent findings recorded.'];

    const lines = [
      `Project: ${project.name || 'Unnamed project'}`,
      `Organization: ${project.organization?.name || 'Independent'}`,
      `Status: ${project.status || 'Unknown'}`,
      project.description ? `Brief: ${project.description}` : null,
      project.targetDomains?.length ? `Target domains: ${project.targetDomains.join(', ')}` : null,
      project.ipRanges?.length ? `IP ranges: ${project.ipRanges.join(', ')}` : null,
      project.excludedAssets ? `Excluded assets: ${project.excludedAssets}` : null,
      `Collaborators: ${project.collaborators?.length || 0}`,
      `Hackers assigned: ${hackers.length}`,
      `Applicants awaiting review: ${applicants.length}`,
      '',
      'Recent activity:',
      ...recentActivityLines,
      '',
      'Recent findings:',
      ...recentFindingLines,
    ].filter(Boolean);

    return lines.join('\n');
  }, [project, hackers.length, applicants.length, assistantActivity, assistantFindings]);

  const handleAiSend = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || aiSending) return;

    const userMessage = aiInput.trim();
    setAiMessages((prev) => [...prev, { sender: 'Admin', text: userMessage }]);
    setAiInput('');
    setAiSending(true);

    try {
      const result = await generateWorkflowAssistantResponse({
        prompt: userMessage,
        context: assistantContext,
        timeoutMs: 45000,
      });

      const assistantText = String(result?.response || result?.content || '').trim() || 'No response returned from the AI assistant.';
      setAiMessages((prev) => [...prev, { sender: 'AI', text: assistantText }]);
    } catch (err) {
      const errorText = err?.message || 'The AI assistant could not be reached. Please try again.';
      toast.error(errorText);
      setAiMessages((prev) => [...prev, { sender: 'AI', text: errorText }]);
    } finally {
      setAiSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-10 h-10 border-2 border-white/10 border-t-[#00ff88] rounded-full animate-spin" />
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">Syncing Ops Workspace</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20 border border-dashed border-white/10 rounded-4xl bg-black/50">
        <p className="text-white/60">Project parameters not found.</p>
        <button onClick={onBack} className="mt-4 text-[#00ff88] text-xs font-bold uppercase tracking-widest hover:underline">
          Return to Mission Hub
        </button>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <button
              onClick={onBack}
              className="group flex items-center gap-3 text-white/60 hover:text-[#00ff88] transition-all font-bold text-[10px] uppercase tracking-[0.2em] mb-4"
            >
              <div className="w-6 h-6 rounded-md bg-black border border-white/10 flex items-center justify-center group-hover:border-[#00ff88]/30 transition-all">
                <FiArrowLeft size={12} />
              </div>
              Back to Mission Hub
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-white">{workspaceName}</h1>
            <div className="flex items-center gap-3 text-xs font-mono text-white/50 uppercase tracking-widest">
              <span>{project.organization?.name || "Independent"}</span>
              <span className="text-white/20">•</span>
              <span className="text-[#00ff88]">Status: {project.status}</span>
            </div>
          </div>

          {project.isPersonal && isOrgAdmin && (
            <button
              onClick={handleDeleteProject}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 hover:border-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <FiTrash2 size={14} /> Deconstruct Lab
            </button>
          )}
        </div>

        <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10 w-fit overflow-x-auto max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? "bg-[#00ff88] text-black shadow-lg shadow-black/30" : "text-white/60 hover:text-white"
                }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {activeTab === "overview" && (
            <div className="space-y-8 max-w-6xl mx-auto">
              <div className="bg-black/70 backdrop-blur-md border border-white/10 p-8 rounded-4xl space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                   <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-3">
                    <FiFileText className="text-[#00ff88]" /> Operational Briefing
                  </h3>
                  <div className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                    {project.status} • {project.startDate ? new Date(project.startDate).toLocaleDateString() : "TBD"}
                  </div>
                </div>
                <p className="text-white/70 leading-relaxed text-sm">
                  {project.description || "No tactical description provided for this engagement."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-black/70 backdrop-blur-md border border-white/10 p-8 rounded-4xl space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-3">
                    <FiGlobe className="text-[#00ff88]" /> Engagement Scope
                  </h3>
                  <div className="space-y-2">
                    {project.targetDomains?.length > 0 ? (
                      <div className="text-[11px] text-white/50 font-mono">
                         <span className="text-white/20 mr-2">DOMAINS:</span> {project.targetDomains.join(", ")}
                      </div>
                    ) : null}
                    {project.ipRanges?.length > 0 ? (
                      <div className="text-[11px] text-white/50 font-mono">
                         <span className="text-white/20 mr-2">NETWORKS:</span> {project.ipRanges.join(", ")}
                      </div>
                    ) : null}
                    {!project.targetDomains?.length && !project.ipRanges?.length && (
                      <div className="text-[10px] text-white/20 uppercase tracking-widest font-mono">No scope defined</div>
                    )}
                  </div>
                </div>

                <div className="bg-black/70 backdrop-blur-md border border-rose-500/10 p-8 rounded-4xl space-y-4">
                  <h3 className="text-xs font-black text-rose-500/60 uppercase tracking-[0.2em] flex items-center gap-3">
                    <FiUsers /> Assets & Exclusions
                  </h3>
                   <div className="text-[11px] text-white/50 font-mono truncate">
                      {project.excludedAssets || "No restricted assets defined."}
                   </div>
                </div>
              </div>

              {canManage && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-black/70 backdrop-blur-md border border-white/10 p-8 rounded-4xl space-y-4">
                    <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Activity Feed</h3>
                    <div className="h-[360px] overflow-y-auto custom-scrollbar">
                      <ProjectActivity projectId={projectId} />
                    </div>
                  </div>

                  <div className="bg-black/70 backdrop-blur-md border border-white/10 p-8 rounded-4xl space-y-4">
                    <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">AI Security Assistant</h3>
                    <div className="bg-[#0f1115] border border-white/5 rounded-2xl flex flex-col h-[360px]">
                      <div className="flex-1 p-4 overflow-y-auto space-y-3">
                        {aiMessages.map((msg, idx) => (
                          <div key={`${msg.sender}-${idx}`} className={`flex ${msg.sender === 'Admin' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`px-3 py-2 rounded-xl text-xs ${msg.sender === 'Admin'
                              ? 'bg-white/10 text-white whitespace-pre-wrap'
                              : 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 prose prose-invert max-w-none'}`}>
                              {msg.sender === 'Admin' ? (
                                msg.text
                              ) : (
                                <div dangerouslySetInnerHTML={{ __html: renderAssistantMarkdown(msg.text) }} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleAiSend} className="p-3 border-t border-white/5 flex items-center gap-2">
                        <input
                          type="text"
                          value={aiInput}
                          onChange={(e) => setAiInput(e.target.value)}
                          placeholder="Ask AI to analyze logs..."
                          className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00ff88]/50"
                        />
                        <button
                          type="submit"
                          disabled={!aiInput.trim() || aiSending}
                          className="px-3 py-2 rounded-lg bg-[#00ff88] text-black text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                        >
                          {aiSending ? '...' : 'Send'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === "workflow" && (
            <div className="space-y-6">
              {canManage && (
                <div className="bg-black/70 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Operational Status</h3>
                    <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Update project phase</p>
                  </div>
                  <select
                    value={project.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full md:w-64 bg-[#0f1115] border border-white/20 rounded-xl px-4 py-3 text-white focus:border-[#00ff88]/50 transition-all outline-none appearance-none"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REPORTING">Reporting</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              )}

              <div className="bg-black/70 backdrop-blur-md border border-white/10 p-12 rounded-4xl text-center space-y-6">
                <div className="w-20 h-20 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-3xl flex items-center justify-center text-[#00ff88] mx-auto shadow-inner">
                  <FiExternalLink size={32} />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-xl font-bold">Collaborative Workflow Engine</h3>
                  <p className="text-sm text-white/60">
                    This workspace is synchronized with a real-time graph editor. Launch the board to manage nodes, assets, and collaborative logic.
                  </p>
                </div>
                {project.workflows?.[0] ? (
                  <button
                    onClick={() => {
                      const workflowId = project.workflows[0].id;
                      window.open(`/workflows/${workflowId}`, '_blank');
                    }}
                    className="px-8 py-4 bg-[#00ff88] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#00ff88]/20 active:scale-95 transition-all"
                  >
                    Open Workflow Board <FiExternalLink className="inline ml-2" />
                  </button>
                ) : !isViewer ? (
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.post('/workflows', {
                          pentestId: projectId,
                          name: `${project.name} — Operational Workflow`
                        });
                        if (res.data?.success || res.data?.id) {
                          toast.success("Workflow board initialized!");
                          loadProject();
                        }
                      } catch (err) {
                        toast.error("Failed to initialize board.");
                      }
                    }}
                    className="px-8 py-4 bg-[#00ff88] text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#00ff88]/20 active:scale-95 transition-all"
                  >
                    Initialize Board <FiExternalLink className="inline ml-2" />
                  </button>
                ) : (
                  <p className="text-xs text-white/40 font-mono">Workflow board has not been initialized yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "findings" && (
            <div className="space-y-6">
              <div className="bg-black/70 backdrop-blur-md border border-white/10 p-8 rounded-4xl space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-3">
                      <FiFileText className="text-[#00ff88]" /> Operative Discoveries
                    </h3>
                    {canManage && (
                      <button
                        onClick={() => {
                             const role = getPrimaryRole(user);
                             let path = "/reports";
                             if (role === ROLES.PROJECT_ADMIN) path = "/pa-reports";
                             if (role === ROLES.PENTESTER) path = "/hacker-reports";
                             navigate(`${path}?projectId=${projectId}`);
                           }}
                        className="px-4 py-1.5 bg-[#00ff88]/10 hover:bg-[#00ff88] text-[#00ff88] hover:text-black border border-[#00ff88]/20 hover:border-[#00ff88] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <FiPlus /> Report Generation
                      </button>
                    )}
                  </div>
                  
                </div>

                {!project.findings?.length ? (
                  <div className="py-20 text-center border border-dashed border-white/5 bg-black/30 rounded-3xl">
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.3em]">No vulnerabilities logged in this sector.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {project.findings.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => navigate(`/findings/${f.id}`)}
                        className="group bg-black border border-white/5 p-6 rounded-3xl hover:border-[#00ff88]/30 transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="space-y-2">
                          <div className="text-sm font-bold group-hover:text-[#00ff88] transition-colors">{f.title}</div>
                          <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest">
                            <span className={`px-2 py-1 rounded-md border ${f.severity === 'CRITICAL' ? 'text-red-500 border-red-500/20 bg-red-500/5' :
                              f.severity === 'HIGH' ? 'text-orange-500 border-orange-500/20 bg-orange-500/5' :
                                'text-white/40 border-white/10'
                              }`}>
                              {f.severity}
                            </span>
                            <span className="text-white/20">•</span>
                            <span className="text-white/40">{f.status}</span>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-[#00ff88] group-hover:bg-[#00ff88]/10 transition-all border border-white/5 group-hover:border-[#00ff88]/20">
                          <FiExternalLink size={14} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "team" && (
            <div className="bg-black/70 backdrop-blur-md border border-white/10 p-8 rounded-4xl space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-1">Personnel Management</h3>
                  <p className="text-[10px] text-white/20 font-mono tracking-widest">AUTHORIZED PROJECT STAFF</p>
                </div>
                {isOrgAdmin && (
                  <button
                    onClick={() => setShowInvite(true)}
                    className="px-4 py-2 bg-[#00ff88]/10 hover:bg-[#00ff88] text-[#00ff88] hover:text-black border border-[#00ff88]/20 hover:border-[#00ff88] rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <FiUserPlus size={14} /> Invite Operative
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {project.collaborators?.filter(c => c.role !== 'APPLICANT').length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-white/5 bg-black/30 rounded-3xl">
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.3em]">No operatives assigned to this mission.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {project.collaborators?.filter(c => c.role !== 'APPLICANT').map((member) => (
                      <div key={member.id} className="bg-black border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-[#00ff88]/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-bold shadow-inner text-xl ${
                            member.role === 'PROJECT_ADMIN' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-white/5 border-white/5 text-[#00ff88]'
                          }`}>
                            {member.user?.fullName?.[0] || "?"}
                          </div>
                          <div>
                            <div className="font-bold text-sm tracking-tight text-white">{member.user?.fullName || "Anonymous"}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                member.role === 'PROJECT_ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                                member.role === 'VIEWER' ? 'bg-sky-500/20 text-sky-400' :
                                'bg-[#00ff88]/20 text-[#00ff88]'
                              }`}>
                                {member.role === 'PROJECT_ADMIN' ? 'Admin' : member.role === 'VIEWER' ? 'Viewer' : 'Operative'}
                              </span>
                              <span className="text-[10px] text-white/20 font-mono tracking-tighter">
                                {member.user?.handle ? `@${member.user.handle}` : member.user?.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        {canManage && member.userId !== user?.id && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {member.role !== 'PROJECT_ADMIN' && member.role !== 'VIEWER' && (
                              <button
                                onClick={() => handleMakeAdmin(member.userId)}
                                title="Promote to Admin"
                                className="p-2.5 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 text-purple-400/40 hover:text-purple-400 transition-all border border-white/5"
                              >
                                <FiStar size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member.userId, member.role)}
                              title={member.role === 'VIEWER' ? "Revoke Access" : "Ban Hacker"}
                              className="p-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 transition-all border border-white/5"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}


          {activeTab === "hiring" && canManage && (
            <div className="bg-black/70 backdrop-blur-md border border-white/10 p-8 rounded-4xl space-y-8">
              <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Application Pipeline</h3>
              {applicants.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl bg-black/30">
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.3em]">No pending applications for this engagement.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {applicants.map((app) => (
                    <div key={app.id} className="bg-black border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-[#00ff88]/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center font-bold text-[#00ff88] shadow-inner">
                          {app.user?.fullName?.[0] || "?"}
                        </div>
                        <div>
                          <div className="font-bold text-sm tracking-tight">{app.user?.fullName || "Anonymous Hacker"}</div>
                          <div className="text-[9px] text-white/40 font-mono uppercase tracking-widest">RANK: MASTER OPERATOR</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleHire(app.user?.id)}
                        className="px-6 py-2.5 bg-[#00ff88] text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-[#00ff88]/10"
                      >
                        Authorize & Deploy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && canManage && (
            <div className="space-y-8 max-w-6xl mx-auto">
              <div className="bg-black/70 backdrop-blur-md border border-white/10 p-8 rounded-4xl space-y-6">
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-3">
                  <FiEdit2 className="text-[#00ff88]" /> Project Settings & Scope
                </h3>
                
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Project Name</label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#00ff88]/50 transition-all font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Excluded Assets / Restrictions</label>
                      <input
                        type="text"
                        value={excludedAssets}
                        onChange={(e) => setExcludedAssets(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#00ff88]/50 transition-all font-mono"
                        placeholder="e.g. *.prod.domain.com, staging-db"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Project Description</label>
                    <textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-[#00ff88]/50 transition-all font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Target Domains (Scope) - One per line</label>
                      <textarea
                        value={targetDomains}
                        onChange={(e) => setTargetDomains(e.target.value)}
                        rows={4}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#00ff88]/50 transition-all font-mono"
                        placeholder="domain1.com&#10;domain2.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono">IP Ranges / Networks - One per line</label>
                      <textarea
                        value={ipRanges}
                        onChange={(e) => setIpRanges(e.target.value)}
                        rows={4}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#00ff88]/50 transition-all font-mono"
                        placeholder="192.168.1.0/24&#10;10.0.0.1"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-3 bg-[#00ff88] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Share Link Generation */}
                <div className="bg-black/70 backdrop-blur-md border border-white/10 p-8 rounded-4xl space-y-6">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-3">
                    <FiExternalLink className="text-[#00ff88]" /> Generate Shareable Link
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed font-mono">
                    Generate a secure read-only token link. Anyone with this link who is a registered user can view the project scope and findings.
                  </p>

                  {shareLinks.length > 0 && (
                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {shareLinks.map(link => (
                        <div key={link.id} className="bg-[#0f1115] border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-4">
                          <span className="text-[10px] text-white/80 font-mono truncate">
                            {window.location.origin}/share/{link.token}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/share/${link.token}`);
                                toast.success("Link copied to clipboard!");
                              }}
                              className="px-3 py-1.5 bg-white/10 text-white hover:bg-white text-[9px] hover:text-black rounded-lg font-mono uppercase tracking-widest transition-all whitespace-nowrap"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => handleRevokeLink(link.id)}
                              disabled={isRevoking}
                              className="px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-[9px] rounded-lg font-mono uppercase tracking-widest transition-all whitespace-nowrap disabled:opacity-50"
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {shareLinks.length > 1 && (
                        <div className="pt-2 flex justify-end">
                           <button
                              onClick={handleRevokeAllLinks}
                              disabled={isRevoking}
                              className="text-[10px] text-rose-500 hover:text-rose-400 font-mono uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                              Revoke All Links
                            </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Section Selection Checkboxes for Share Link */}
                  <div className="space-y-2 bg-[#0f1115] border border-white/5 p-4 rounded-2xl">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block font-mono">
                      Sections to Share (At least one required)
                    </label>
                    <div className="flex flex-wrap gap-4 text-xs font-mono text-white/80 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer hover:text-[#00ff88]">
                        <input
                          type="checkbox"
                          checked={linkShareFindings}
                          onChange={(e) => setLinkShareFindings(e.target.checked)}
                          className="rounded accent-[#00ff88]"
                        />
                        <span>Findings</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-[#00ff88]">
                        <input
                          type="checkbox"
                          checked={linkShareTeam}
                          onChange={(e) => setLinkShareTeam(e.target.checked)}
                          className="rounded accent-[#00ff88]"
                        />
                        <span>Team</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-[#00ff88]">
                        <input
                          type="checkbox"
                          checked={linkShareWorkflow}
                          onChange={(e) => setLinkShareWorkflow(e.target.checked)}
                          className="rounded accent-[#00ff88]"
                        />
                        <span>Workflow</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateShareLink}
                    disabled={isSharing}
                    className="px-6 py-3 bg-[#00ff88]/10 hover:bg-[#00ff88]/20 border border-[#00ff88]/20 text-[#00ff88] font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
                  >
                    {isSharing ? "Generating..." : "Generate Secure Link"}
                  </button>
                </div>

                {/* Viewer addition & active viewers management */}
                <div className="bg-black/70 backdrop-blur-md border border-white/10 p-8 rounded-4xl space-y-6">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-3">
                    <FiUsers className="text-[#00ff88]" /> Invite Show-Only Viewer
                  </h3>
                  <p className="text-xs text-white/60 leading-relaxed font-mono">
                    Grant read-only access to another registered operative by inputting their registered email address or handle. An invitation will be sent for them to accept.
                  </p>

                  {/* Section Selection Checkboxes for Email Invitation */}
                  <div className="space-y-2 bg-[#0f1115] border border-white/5 p-4 rounded-2xl">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block font-mono">
                      Sections to Share (At least one required)
                    </label>
                    <div className="flex flex-wrap gap-4 text-xs font-mono text-white/80 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer hover:text-[#00ff88]">
                        <input
                          type="checkbox"
                          checked={emailShareFindings}
                          onChange={(e) => setEmailShareFindings(e.target.checked)}
                          className="rounded accent-[#00ff88]"
                        />
                        <span>Findings</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-[#00ff88]">
                        <input
                          type="checkbox"
                          checked={emailShareTeam}
                          onChange={(e) => setEmailShareTeam(e.target.checked)}
                          className="rounded accent-[#00ff88]"
                        />
                        <span>Team</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer hover:text-[#00ff88]">
                        <input
                          type="checkbox"
                          checked={emailShareWorkflow}
                          onChange={(e) => setEmailShareWorkflow(e.target.checked)}
                          className="rounded accent-[#00ff88]"
                        />
                        <span>Workflow</span>
                      </label>
                    </div>
                  </div>

                  <form onSubmit={handleAddViewer} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. operator@hackract.com"
                      value={viewerEmail}
                      onChange={(e) => setViewerEmail(e.target.value)}
                      className="flex-1 bg-[#0f1115] border border-white/5 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#00ff88]/50 transition-all font-mono"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isAddingViewer}
                      className="px-6 bg-[#00ff88] text-black font-black text-[10px] uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                      {isAddingViewer ? "..." : "Add"}
                    </button>
                  </form>

                  {/* Active Read-Only Viewers List */}
                  {project.collaborators?.filter(c => c.role === 'VIEWER').length > 0 && (
                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest font-mono">
                        Active Read-Only Viewers ({project.collaborators.filter(c => c.role === 'VIEWER').length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {project.collaborators.filter(c => c.role === 'VIEWER').map((viewer) => (
                          <div key={viewer.id} className="bg-[#0f1115] border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                              <span className="text-xs text-white font-medium truncate">
                                {viewer.user?.fullName || viewer.user?.email}
                              </span>
                              {viewer.user?.handle && (
                                <span className="text-[10px] text-white/40 font-mono">@{viewer.user.handle}</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveMember(viewer.userId, 'VIEWER')}
                              className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-[9px] rounded-lg font-mono uppercase tracking-widest transition-all whitespace-nowrap"
                              title="Revoke user's viewer access permanently"
                            >
                              Revoke Access
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-[10px] text-white/40 font-mono leading-relaxed">
                    💡 <span className="text-white/60 font-bold">Access Revocation Guide:</span>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li>Revoking a <span className="text-rose-400 font-bold">Link</span> prevents new users from redeeming it.</li>
                      <li>Revoking <span className="text-rose-400 font-bold">User Access</span> removes a viewer permanently, whether they joined via email invite or shareable link.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showInvite && isOrgAdmin && (
          <InviteMemberModal
            projectId={projectId}
            onClose={() => setShowInvite(false)}
            onInvited={() => {
              // Optionally refresh invitations or team list
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default WorkspaceView;