import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiAlertCircle, FiClock, FiPaperclip, FiEdit2 } from "react-icons/fi";
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

  const loadData = async () => {
    try {
      const fRes = await api.get(`/findings/${findingId}`);
      setFinding(fRes.data);
    } catch (error) {
      toast.error("Failed to load finding details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [findingId]);

  const isViewer = finding?.pentest?.collaborators?.some(
    (c) => c.userId === user?.id && c.role === "VIEWER"
  );

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
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{finding.title}</h1>
            {finding.status === 'OPEN' && !isViewer && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-2 text-gray-500 hover:text-[#00ff41] bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-[#00ff41]/30"
                title="Edit Finding"
              >
                <FiEdit2 size={16} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-gray-500 uppercase">
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
