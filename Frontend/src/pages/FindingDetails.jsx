import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiAlertCircle, FiClock, FiPaperclip, FiEdit2, FiMessageSquare, FiSend } from "react-icons/fi";
import api from "../api/axiosConfig";
import toast from "react-hot-toast";
import RecordFindingModal from "./WorkflowEditor/components/RecordFindingModal";
import { useAuth } from "../context/authContext";

const FindingDetails = () => {
  const { findingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadData = async () => {
    try {
      const fRes = await api.get(`/findings/${findingId}`);
      setFinding(fRes.data);
      loadComments();
    } catch (error) {
      toast.error("Failed to load finding details");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const cRes = await api.get(`/findings/${findingId}/comments`);
      if (cRes.data?.success) {
        setComments(cRes.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load comments", error);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post(`/findings/${findingId}/comments`, { content: commentText.trim() });
      toast.success("Comment posted successfully");
      setCommentText("");
      loadComments();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [findingId]);

  const isViewer = finding?.pentest?.collaborators?.some(
    (c) => c.userId === user?.id && c.role === "VIEWER"
  );

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const isReporter = finding?.reporterId === user?.id;
  const isOpenStatus = finding?.status === "OPEN";
  const isWithin3Hours = finding?.createdAt
    ? (Date.now() - new Date(finding.createdAt).getTime()) <= THREE_HOURS_MS
    : false;

  const canEditContent = isReporter && isOpenStatus && isWithin3Hours && !isViewer;

  const canChangeStatus = useMemo(() => {
    if (isViewer || !user || !finding) return false;
    const isGlobalOrgAdmin = (user?.roles || []).some((r) => r.type === "ORG_ADMIN");
    const isLead = finding?.pentest?.leadPentesterId === user?.id;
    const isProjAdmin = finding?.pentest?.collaborators?.some(
      (c) => c.userId === user?.id && (c.role === "PROJECT_ADMIN" || c.role === "PROJECT_LEAD" || c.role === "admin" || c.role === "lead")
    );
    return isGlobalOrgAdmin || isLead || isProjAdmin;
  }, [user, finding, isViewer]);

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/findings/${findingId}`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to update status");
    }
  };

  const handleEditSave = async (updatedData) => {
    try {
      await api.patch(`/findings/${findingId}`, updatedData);
      toast.success("Finding updated successfully");
      loadData();
    } catch (error) {
      toast.error("Failed to update finding");
      throw error;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-500';
      case 'HIGH': return 'text-orange-500';
      case 'MEDIUM': return 'text-yellow-500';
      case 'LOW': return 'text-green-500';
      case 'INFO': return 'text-blue-500';
      default: return 'text-white';
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-white p-10 font-mono text-[10px] animate-pulse uppercase tracking-[0.3em] flex items-center justify-center">Initializing finding telemetry...</div>;
  if (!finding) return <div className="min-h-screen bg-black p-10 flex items-center justify-center font-mono uppercase tracking-widest text-xs text-white/40">Sector Data Corrupted: Finding not found.</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 space-y-10 max-w-4xl mx-auto font-sans selection:bg-[#00c477]/30 selection:text-black">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs uppercase tracking-widest font-mono"
        >
          <FiChevronLeft /> Back
        </button>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">{finding.title}</h1>
              {canEditContent && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#00ff41]/10 text-[#00ff41] hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded-xl text-xs font-mono transition-all cursor-pointer"
                  title="Edit Finding (Editable within 3 hours while OPEN)"
                >
                  <FiEdit2 size={14} /> Edit Content
                </button>
              )}
              {isReporter && isOpenStatus && !isWithin3Hours && (
                <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-3 py-1 rounded-xl border border-white/5">
                  🔒 Edit Window Expired (3h limit)
                </span>
              )}
            </div>

            {/* Status Triage Controls for Project/Org Admins */}
            {canChangeStatus && (
              <div className="flex items-center gap-2 bg-[#111] border border-white/10 p-2 rounded-2xl">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest px-2">Triage Status:</span>
                <select
                  value={finding.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="bg-black border border-white/20 text-[#00c477] font-bold text-xs rounded-xl px-3 py-1.5 outline-none focus:border-[#00c477] font-mono cursor-pointer"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="TRIAGED">TRIAGED</option>
                  <option value="FIXED">FIXED</option>
                  <option value="ACCEPTED_RISK">ACCEPTED RISK</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-500 uppercase pt-2">
            <span>Status: <span className="text-white font-bold px-2 py-0.5 rounded bg-white/10">{finding.status}</span></span>
            <span>Severity: <span className={`font-bold ${getSeverityColor(finding.severity)}`}>{finding.severity}</span></span>
            <span>CVSS Score: <span className="text-[#00c477] font-bold">{finding.cvssScore?.toFixed(1) || 'N/A'}</span></span>
            <span>Project: <span className="text-white">{finding.pentest?.name}</span></span>
            {finding.affectedAsset && <span>Asset: <span className="text-white">{finding.affectedAsset}</span></span>}
          </div>
        </div>

        {/* Details Sections */}
        <div className="grid gap-6">
          <div className="bg-black/60 border border-white/10 rounded-2xl p-8 space-y-4 backdrop-blur-md">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-3">
              <FiAlertCircle size={14} className="text-[#00c477]" /> Vulnerability Description
            </h3>
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-medium">{finding.description || "No description provided."}</p>
          </div>

          {finding.proof && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <FiClock size={14} /> Evidence / Proof
              </h3>
              <div className="grid gap-4 mt-4">
                {(() => {
                  let proofs = [];
                  try {
                    proofs = JSON.parse(finding.proof);
                    if (!Array.isArray(proofs)) proofs = [finding.proof];
                  } catch (e) {
                    proofs = [finding.proof];
                  }

                  return proofs.map((proofUrl, idx) => {
                    const isImage = proofUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
                    const isPdf = proofUrl.match(/\.(pdf)$/i) != null;
                    return (
                      <div key={idx} className="bg-black/50 p-4 rounded-xl border border-white/5 space-y-3">
                        {isImage && (
                          <div className="relative w-full overflow-hidden rounded-lg border border-[#00ff41]/20 group">
                            <img src={proofUrl} alt={`Evidence ${idx + 1}`} className="w-full object-contain max-h-[400px] bg-black/80" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#00ff41] text-black text-xs font-bold rounded-lg hover:scale-105 transition-transform">
                                View Full Image
                              </a>
                            </div>
                          </div>
                        )}
                        {isPdf && (
                          <div className="relative w-full overflow-hidden rounded-lg border border-[#00ff41]/20">
                            <iframe src={proofUrl} className="w-full h-[400px] bg-white rounded-lg" title={`Evidence ${idx + 1}`} />
                          </div>
                        )}
                        <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-mono text-[10px] text-[#00c477] hover:underline break-all">
                          <FiPaperclip size={12} /> {proofUrl}
                        </a>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
          {/* Comments Section for Collaborators */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-8 space-y-6 backdrop-blur-md">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-3">
              <FiMessageSquare size={16} className="text-[#00c477]" /> Collaborator Discussion ({comments.length})
            </h3>

            {/* List of Comments */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-xs font-mono text-gray-500 italic">No comments yet. Project collaborators can start the discussion below.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#00c477]/20 border border-[#00c477]/40 flex items-center justify-center text-[10px] font-bold text-[#00c477]">
                          {(comment.user?.fullName || comment.user?.handle || "U")[0].toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-white">
                          {comment.user?.fullName || comment.user?.handle || "Collaborator"}
                        </span>
                        {comment.user?.handle && (
                          <span className="text-[10px] font-mono text-gray-500">@{comment.user.handle}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 font-sans leading-relaxed whitespace-pre-wrap pl-8">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* New Comment Input */}
            <form onSubmit={handlePostComment} className="space-y-3 pt-2 border-t border-white/10">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment or triage note..."
                rows={3}
                className="w-full bg-black/80 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00c477] transition-all resize-none font-sans"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00c477] hover:bg-[#00ff88] text-black font-bold text-xs rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FiSend size={14} />
                  {submittingComment ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <RecordFindingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleEditSave}
        initialData={finding}
        assets={finding.pentest?.targetDomains || []}
      />
    </div>
  );
};

export default FindingDetails;
