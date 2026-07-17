import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useApi from '../hooks/useApi';
import { FiPlus, FiFileText, FiTrash2, FiBell, FiEdit, FiUsers, FiCheckCircle, FiXCircle } from 'react-icons/fi';

const TYPE_LABELS = {
  terms_of_service: 'Terms of Service',
  privacy_policy: 'Privacy Policy',
  nda: 'NDA',
  sla: 'SLA',
};

const TYPE_COLORS = {
  terms_of_service: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  privacy_policy: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  nda: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  sla: 'text-[#00c477] bg-[#00c477]/10 border-[#00c477]/20',
};

export default function LegalAgreementList() {
  const navigate = useNavigate();
  const api = useApi();

  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [notifyingId, setNotifyingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchAgreements = useCallback(async () => {
    try {
      const res = await api.get('/legal-agreements');
      setAgreements(res.data.data || res.data || []);
    } catch {
      toast.error('Failed to load agreements.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/legal-agreements/${id}`);
      setAgreements((prev) => prev.filter((a) => a.id !== id));
      toast.success('Agreement deleted.');
    } catch {
      toast.error('Failed to delete agreement.');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleNotify = async (id, title) => {
    setNotifyingId(id);
    try {
      await api.post(`/legal-agreements/${id}/notify`);
      toast.success(`Users notified about "${title}".`);
    } catch {
      toast.error('Failed to send notification.');
    } finally {
      setNotifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00c477] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-black tracking-widest font-mono text-white uppercase">Legal Agreements</h1>
            <p className="text-xs font-mono text-gray-500 tracking-widest mt-1 uppercase">
              {agreements.length} agreement{agreements.length !== 1 ? 's' : ''} on file
            </p>
          </div>
          <button
            onClick={() => navigate('/org-agreement')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00c477] hover:bg-[#00e088] text-[#0a0a0a] font-black text-xs tracking-widest uppercase rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,196,119,0.4)] hover:-translate-y-0.5"
          >
            <FiPlus className="text-base" />
            New Agreement
          </button>
        </div>

        {/* Empty state */}
        {agreements.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 border border-white/5 rounded-2xl bg-[#0d0d0d]"
          >
            <FiFileText className="text-5xl text-gray-600 mb-4" />
            <p className="text-gray-400 font-mono tracking-widest text-sm uppercase">No agreements yet</p>
            <p className="text-gray-600 font-mono text-xs mt-1">Create your first legal agreement to get started</p>
            <button
              onClick={() => navigate('/org-agreement')}
              className="mt-6 px-5 py-2.5 bg-[#00c477]/10 border border-[#00c477]/20 text-[#00c477] font-mono text-xs tracking-widest uppercase rounded-lg hover:bg-[#00c477]/20 transition-colors"
            >
              Create Agreement
            </button>
          </motion.div>
        )}

        {/* Agreement cards */}
        <div className="space-y-3">
          <AnimatePresence>
            {agreements.map((agreement, idx) => (
              <motion.div
                key={agreement.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: idx * 0.04 }}
                className="group bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: info */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <FiFileText className="text-[#00c477] text-lg" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1.5">
                        <h2 className="text-sm font-bold text-white truncate">{agreement.title}</h2>
                        <span className="text-[10px] font-mono text-gray-500 shrink-0">v{agreement.version}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border tracking-widest uppercase shrink-0 ${TYPE_COLORS[agreement.type] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                          {TYPE_LABELS[agreement.type] || agreement.type}
                        </span>
                        {agreement.isActive ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border text-[#00c477] bg-[#00c477]/10 border-[#00c477]/20 tracking-widest uppercase shrink-0">
                            <FiCheckCircle className="text-[10px]" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border text-gray-500 bg-gray-500/10 border-gray-500/20 tracking-widest uppercase shrink-0">
                            <FiXCircle className="text-[10px]" /> Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-gray-500 font-mono">
                        <span className="flex items-center gap-1.5">
                          <FiUsers className="text-xs" />
                          {agreement._count?.signatures ?? 0} signature{(agreement._count?.signatures ?? 0) !== 1 ? 's' : ''}
                        </span>
                        <span>
                          Created {new Date(agreement.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/execute-agreement/${agreement.id}`)}
                      title="View / Edit"
                      className="w-9 h-9 rounded-lg bg-[#111] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                    >
                      <FiEdit className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleNotify(agreement.id, agreement.title)}
                      disabled={notifyingId === agreement.id}
                      title="Notify users"
                      className="w-9 h-9 rounded-lg bg-[#111] border border-white/10 flex items-center justify-center text-gray-400 hover:text-[#00c477] hover:border-[#00c477]/30 transition-colors disabled:opacity-40"
                    >
                      {notifyingId === agreement.id ? (
                        <div className="w-3.5 h-3.5 border border-[#00c477] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiBell className="text-sm" />
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(agreement.id)}
                      title="Delete"
                      className="w-9 h-9 rounded-lg bg-[#111] border border-white/10 flex items-center justify-center text-gray-400 hover:text-red-400 hover:border-red-400/30 transition-colors"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* Content preview */}
                {agreement.content && (
                  <div className="mt-4 pl-14">
                    <p className="text-xs text-gray-600 font-mono leading-relaxed line-clamp-2">
                      {agreement.content.slice(0, 200)}{agreement.content.length > 200 ? '...' : ''}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm"
            >
              <h3 className="text-base font-bold text-white mb-2">Delete Agreement?</h3>
              <p className="text-sm text-gray-400 mb-6">
                This will permanently delete the agreement and all associated signatures. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={deletingId === confirmDelete}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white font-black text-xs tracking-widest uppercase rounded-lg transition-colors disabled:opacity-60"
                >
                  {deletingId === confirmDelete ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 bg-[#1a1a1a] border border-white/10 text-gray-300 hover:text-white font-black text-xs tracking-widest uppercase rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
