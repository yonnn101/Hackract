import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "../api/axiosConfig";
import {
  FiSearch, FiBriefcase, FiArrowRight, FiClock, FiShield, FiCpu,
  FiExternalLink, FiFileText, FiCheckCircle, FiLock, FiX, FiAlertTriangle,
} from "react-icons/fi";

// ──────────────────────────────────────────────────────────────────────
// Inline NDA Modal shown before applying to an org project
// ──────────────────────────────────────────────────────────────────────
const NdaModal = ({ agreement, onSigned, onCancel }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const [signing, setSigning]           = useState(false);

  const handleSign = async () => {
    if (!acknowledged) return toast.error("Please read and acknowledge the agreement first.");
    setSigning(true);
    try {
      await api.post("/user-signatures/sign", { agreementId: agreement.id });
      toast.success("NDA signed — you may now register interest.");
      onSigned();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Signing failed.");
    } finally {
      setSigning(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-xl bg-[#080d14] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FiFileText size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest">{agreement.title}</p>
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">v{agreement.version} · Required to apply</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <FiX size={14} />
          </button>
        </div>

        {/* NDA Body — scrollable */}
        <div
          className="px-8 py-5 max-h-64 overflow-y-auto text-xs text-slate-400 leading-relaxed space-y-3"
          onScroll={e => {
            const el = e.target;
            if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setScrolled(true);
          }}
        >
          {agreement.content.split("\n").map((line, i) =>
            line.trim() ? <p key={i}>{line}</p> : <br key={i} />
          )}
        </div>

        {!scrolled && (
          <div className="px-8 py-2 text-[9px] font-mono text-slate-700 uppercase tracking-[0.2em] flex items-center gap-2 border-t border-slate-900">
            <FiClock size={10} /> Scroll to read the full agreement
          </div>
        )}

        {/* Acknowledgment */}
        <div className="px-8 py-5 border-t border-slate-800 bg-slate-900/30">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setAcknowledged(v => !v)}
              className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                acknowledged ? "bg-[#00c477] border-[#00c477]" : "border-slate-700 group-hover:border-slate-500"
              }`}
            >
              <AnimatePresence>
                {acknowledged && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <FiCheckCircle size={11} className="text-black" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed select-none group-hover:text-slate-300 transition-colors">
              I have read and agree to be legally bound by this Non-Disclosure Agreement.
            </p>
          </label>
        </div>

        {/* Actions */}
        <div className="px-8 py-5 border-t border-slate-800 flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-700 text-[10px] font-mono flex-1">
            <FiLock size={10} /> Signature is logged with IP & timestamp
          </div>
          <button onClick={onCancel} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={signing || !acknowledged}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              acknowledged && !signing
                ? "bg-[#00c477] text-black hover:bg-[#00cc6e] active:scale-95"
                : "bg-slate-800 text-slate-600 cursor-not-allowed"
            }`}
          >
            {signing ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FiCheckCircle size={13} />}
            {signing ? "Signing…" : "Sign & Continue"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Project Details Modal
// ──────────────────────────────────────────────────────────────────────
const ProjectDetailsModal = ({ project, onApply, applying, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-xl bg-[#080d14] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center text-[#00c477]">
              <FiBriefcase size={18} />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest">{project.organization?.name || "Independent Organization"}</p>
              <h3 className="text-sm font-bold text-white font-mono mt-0.5">{project.name}</h3>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <FiX size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-[#00c477] uppercase tracking-[0.2em] font-mono">Project Summary</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {project.description || "Detailed scope documentation available upon engagement activation."}
            </p>
          </div>

          {/* Scope Lock Banner */}
          <div className="bg-[#0c1322] border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400 font-mono text-[10px] uppercase tracking-wider">
              <FiLock size={12} className="animate-pulse" /> Detailed Scope Targets Locked
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
              Specific target assets (such as domains, IP ranges, and excluded environments) are only visible inside the workspace after signing the Non-Disclosure Agreement (NDA) and getting approved by the organization administrator.
            </p>
            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
              <div className="bg-black/40 border border-slate-900 rounded-lg p-2.5">
                <span className="text-slate-500 block mb-1">Target Domains</span>
                <span className="text-slate-400 font-bold">[ LOCKED ]</span>
              </div>
              <div className="bg-black/40 border border-slate-900 rounded-lg p-2.5">
                <span className="text-slate-500 block mb-1">IP Ranges</span>
                <span className="text-slate-400 font-bold">[ LOCKED ]</span>
              </div>
            </div>
          </div>

          {/* Logistics / Timeline */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-mono">Created On</span>
              <span className="text-xs text-slate-300 font-mono">{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-mono">Collaborators</span>
              <span className="text-xs text-slate-300 font-mono">{project._count?.collaborators || 0} Pentester(s)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-300 uppercase tracking-widest font-bold transition-colors">
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onApply(project.id);
            }}
            disabled={applying === project.id}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00c477] text-black hover:bg-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-black/20"
          >
            Register Interest
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Main EngagementBoard
// ──────────────────────────────────────────────────────────────────────
const EngagementBoard = () => {
  const navigate = useNavigate();
  const [projects, setProjects]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [applying, setApplying]           = useState(null);
  const [searchQuery, setSearchQuery]     = useState("");

  // NDA gate state
  const [ndaModal, setNdaModal]           = useState(null); // { agreement, pendingProjectId }
  // Details modal state
  const [detailsModal, setDetailsModal]   = useState(null); // project object

  const loadEngagements = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/projects/marketplace");
      setProjects(data?.data || []);
    } catch {
      toast.error("Failed to synchronize with engagement ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEngagements(); }, []);

  // Submit the actual application
  const submitApplication = async (projectId) => {
    setApplying(projectId);
    try {
      await api.post(`/projects/${projectId}/apply`);
      toast.success("Engagement proposal submitted successfully");
      loadEngagements();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Submission failed");
    } finally {
      setApplying(null);
    }
  };

  // Click handler — check NDA first, then apply
  const handleApply = async (projectId) => {
    setApplying(projectId);
    try {
      const { data } = await api.get(`/projects/${projectId}/nda-status`);
      const { required, signed, agreement } = data.data;

      if (required && !signed) {
        // Gate: show NDA modal
        setNdaModal({ agreement, pendingProjectId: projectId });
        setApplying(null);
        return;
      }

      // NDA already signed or not required — apply directly
      await submitApplication(projectId);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to check NDA status");
      setApplying(null);
    }
  };

  const handleNdaSigned = async () => {
    const { pendingProjectId } = ndaModal;
    setNdaModal(null);
    await submitApplication(pendingProjectId);
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.organization?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* NDA Modal */}
      <AnimatePresence>
        {ndaModal && (
          <NdaModal
            agreement={ndaModal.agreement}
            onSigned={handleNdaSigned}
            onCancel={() => setNdaModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {detailsModal && (
          <ProjectDetailsModal
            project={detailsModal}
            onApply={handleApply}
            applying={applying}
            onClose={() => setDetailsModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-white/5 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 bg-[#00c477]/10 border border-[#00c477]/20 rounded flex items-center justify-center text-[#00c477]">
                <FiShield size={18} />
             </div>
             <h1 className="text-2xl font-bold tracking-tight text-white">Public Engagement Board</h1>
          </div>
          <p className="text-white/70 text-sm max-w-xl">
            Official repository of authorized security engagement opportunities within the Hackract network.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <FiSearch size={14} />
          </div>
          <input
            type="text"
            placeholder="Search engagements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 hover:bg-black/60 focus:bg-black border border-white/10 hover:border-white/20 focus:border-[#00c477] focus:ring-1 focus:ring-[#00c477] rounded-xl text-xs text-white font-mono placeholder:text-slate-600 transition-all outline-none"
          />
        </div>
      </div>

      {/* NDA info banner */}
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/15 rounded-2xl px-6 py-4">
        <FiAlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={14} />
        <p className="text-xs text-amber-200/60 leading-relaxed">
          <span className="font-black text-amber-400">NDA Required for Org Programs. </span>
          To register interest in any organization-hosted project, you will be prompted to sign the platform Non-Disclosure Agreement. This only needs to be done once.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-10">
        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-32 flex flex-col items-center gap-4 text-white/60 font-mono"
              >
                <div className="w-12 h-12 border-2 border-white/10 border-t-[#00c477] rounded-full animate-spin shadow-[0_0_15px_rgba(0,255,136,0.15)]" />
                <span className="text-[10px] uppercase tracking-[0.3em] animate-pulse">Synchronizing Engagement Feed</span>
              </motion.div>
            ) : filteredProjects.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="py-24 text-center border border-white/10 border-dashed rounded-3xl bg-black/50 text-white/60"
              >
                <div className="text-4xl mb-4 opacity-20">📡</div>
                <p className="font-medium">No engagement matches found</p>
                <p className="text-xs mt-1 text-white/40">Adjust your criteria or check back for new postings.</p>
              </motion.div>
            ) : (
              <div className="grid gap-5">
                {filteredProjects.map((project, idx) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-black/70 backdrop-blur-md border border-white/10 p-6 rounded-4xl hover:border-[#00c477]/30 hover:bg-black transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                        <FiCpu size={80} />
                    </div>

                    <div className="flex flex-col md:flex-row items-start justify-between gap-6 relative z-10">
                      <div className="space-y-4 flex-1">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono font-bold text-[#00c477] uppercase tracking-widest bg-[#00c477]/10 px-2 py-0.5 rounded">
                                    {project.status === 'PUBLISHED' ? 'OPEN TENDER' : project.status}
                                </span>
                                <span className="text-xs text-white/50 font-mono truncate">ID: {project.id.split('-')[0].toUpperCase()}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                                  <FiLock size={8} /> NDA Required
                                </span>
                            </div>
                              <h3 className="text-xl font-bold text-white group-hover:text-[#00c477] transition-colors tracking-tight">
                                {project.name}
                            </h3>
                        </div>

                        <p className="text-white/70 text-sm line-clamp-2 leading-relaxed max-w-2xl">
                          {project.description || "Detailed scope documentation available upon engagement activation."}
                        </p>

                        <div className="flex flex-wrap items-center gap-5 text-[11px] font-semibold text-white/60 uppercase tracking-widest">
                          <div className="flex items-center gap-2 bg-black px-3 py-1.5 rounded-full border border-white/10 group-hover:border-[#00c477]/30 transition-colors">
                            <FiBriefcase className="text-[#00c477]" />
                            <span className="text-white/80">{project.organization?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                            <FiClock className="text-white/40" />
                                <span>Engagement Window: {new Date(project.createdAt).toLocaleDateString()} — TBD</span>
                            </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-center gap-3 w-full md:w-auto">
                        <button
                          onClick={() => handleApply(project.id)}
                          disabled={applying === project.id}
                          className="flex-1 md:w-48 py-3 bg-[#00c477] hover:bg-white text-black rounded-xl font-bold text-xs uppercase tracking-[0.15em] transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-black/20 flex items-center justify-center gap-2"
                        >
                          {applying === project.id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                              Checking…
                            </>
                          ) : (
                            <>Register Interest <FiExternalLink /></>
                          )}
                        </button>
                        <button
                          onClick={() => setDetailsModal(project)}
                          className="px-4 py-3 bg-white/10 hover:bg-[#00c477] hover:text-black text-white/70 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-white/10 hover:border-[#00c477]"
                        >
                            Details
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
            <div className="bg-black border border-white/10 p-8 rounded-4xl shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00c477]/10 rounded-full blur-[100px] group-hover:bg-[#00c477]/20 transition-all duration-700" />
              <h4 className="text-[#00c477] font-bold text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#00c477] rounded-full" /> Engagement Protocols
                </h4>
                <div className="space-y-6">
                    {[
                        { step: "01", title: "NDA Signing", desc: "Sign the platform NDA once — it covers all org programs." },
                        { step: "02", title: "Resource Alignment", desc: "Ensure your technical arsenal matches target architecture." },
                        { step: "03", title: "Proposal Submission", desc: "Formal notice of interest is logged in the immutable ledger." }
                    ].map((item, i) => (
                        <div key={i} className="space-y-2 group/item">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-[#00c477] opacity-40 group-hover/item:opacity-100 transition-opacity font-mono">{item.step}</span>
                                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">{item.title}</span>
                            </div>
                              <p className="text-[11px] text-white/60 leading-relaxed pl-6">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={() => navigate("/projects?tab=applications")}
                className="w-full py-5 bg-black/70 backdrop-blur-md border border-white/10 rounded-3xl font-bold text-xs uppercase tracking-widest text-white/70 hover:text-black hover:bg-[#00c477] hover:border-[#00c477] transition-all flex items-center justify-center gap-3 group"
            >
                Pending Proposals
                <div className="w-5 h-5 bg-white/10 group-hover:bg-black/10 rounded-md flex items-center justify-center transition-colors">
                  <FiArrowRight className="group-hover:text-black" />
                </div>
            </button>

              <div className="p-6 border border-white/10 rounded-3xl text-center space-y-2">
                <p className="text-[10px] text-white/50 uppercase font-bold tracking-[0.2em]">Platform Status</p>
                <div className="flex items-center justify-center gap-2 text-[#00c477] text-[10px] font-mono">
                  <div className="w-1.5 h-1.5 bg-[#00c477] rounded-full animate-pulse" />
                    OPERATIONAL • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </aside>
      </div>
    </div>
  );
};

export default EngagementBoard;
