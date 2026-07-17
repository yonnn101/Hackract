import React, { useState } from 'react';
import { FiX, FiUploadCloud } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadFile } from '../../../api/uploadService';

const SEVERITY_OPTIONS = [
  { value: 'INFO', label: 'Info (0.0 – 3.9)' },
  { value: 'LOW', label: 'Low (0.0 – 3.9)' },
  { value: 'MEDIUM', label: 'Medium (4.0 – 6.9)' },
  { value: 'HIGH', label: 'High (7.0 – 8.9)' },
  { value: 'CRITICAL', label: 'Critical (9.0 – 10.0)' }
];

const RecordFindingModal = ({ isOpen, onClose, onSave, assets = [], initialData = null }) => {
  const [formData, setFormData] = useState({
    title: '',
    severity: 'CRITICAL',
    affectedAsset: '',
    cvssScore: 8.2,
    description: '',
    proof: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        title: initialData.title || '',
        severity: initialData.severity || 'CRITICAL',
        affectedAsset: initialData.affectedAsset || '',
        cvssScore: initialData.cvssScore ?? 8.2,
        description: initialData.description || '',
        proof: initialData.proof || ''
      });
    } else if (isOpen) {
      setFormData({
        title: '',
        severity: 'CRITICAL',
        affectedAsset: '',
        cvssScore: 8.2,
        description: '',
        proof: ''
      });
      setSelectedFiles([]);
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCvssChange = (e) => {
    setFormData(prev => ({ ...prev, cvssScore: parseFloat(e.target.value) }));
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.title.trim()) return;
    setIsSubmitting(true);
    setIsUploading(true);
    setError(null);
    try {
      let finalFormData = { ...formData };
      
      if (selectedFiles.length > 0) {
        const uploadPromises = selectedFiles.map(file => uploadFile(file, 'findings'));
        const fileUrls = await Promise.all(uploadPromises);
        finalFormData.proof = JSON.stringify(fileUrls);
      }

      await onSave(finalFormData);
      
      // Reset form on success
      setFormData({ title: '', severity: 'CRITICAL', affectedAsset: '', cvssScore: 8.2, description: '', proof: '' });
      setSelectedFiles([]);
      onClose();
    } catch (err) {
      console.error('Error saving finding:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to save finding');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl bg-[#13151a] border border-[#252830] rounded-xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#252830] bg-[#1a1c23]">
            <div>
              <div className="text-[#00ff41] text-[10px] font-bold uppercase tracking-widest mb-1 font-mono">
                MODULE // REPORT_NEW_FINDING
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Record Vulnerability</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 font-mono">Title</label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Remote Code Execution via Log4j"
                value={formData.title}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-gray-700 focus:border-[#00ff41] text-white p-3 focus:outline-none transition-colors text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Severity */}
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 font-mono">Severity</label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  className="w-full bg-[#0b0f19] border-b border-gray-700 focus:border-[#00ff41] text-white p-3 focus:outline-none transition-colors text-sm appearance-none cursor-pointer"
                >
                  {SEVERITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Affected Asset */}
              <div>
                <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 font-mono">Affected Asset</label>
                <input
                  type="text"
                  name="affectedAsset"
                  placeholder="Asset-X-129 (Web-Frontend)"
                  value={formData.affectedAsset}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-gray-700 focus:border-[#00ff41] text-white p-3 focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>

            {/* CVSS Score */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-widest font-mono">CVSS Score</label>
                <span className="text-[#00ff41] font-mono font-bold text-lg">{formData.cvssScore.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="10.0"
                step="0.1"
                name="cvssScore"
                value={formData.cvssScore}
                onChange={handleCvssChange}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00ff41]"
                style={{
                  background: `linear-gradient(to right, #00ff41 0%, #00ff41 ${formData.cvssScore * 10}%, #1a1c23 ${formData.cvssScore * 10}%, #1a1c23 100%)`
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 font-mono">Description</label>
              <textarea
                name="description"
                rows="4"
                placeholder="Explain the vulnerability details, impact, and reproduction steps..."
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-transparent border border-[#252830] rounded-lg focus:border-[#00ff41] text-white p-3 focus:outline-none transition-colors text-sm resize-y"
              ></textarea>
            </div>

            {/* Evidence Upload */}
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 font-mono">Evidence Upload</label>
              <div 
                className={`border border-dashed transition-colors cursor-pointer group rounded-xl p-8 flex flex-col items-center justify-center text-center relative ${selectedFiles.length > 0 ? 'border-[#00ff41] bg-[#00ff41]/5' : 'border-[#252830] hover:border-[#00ff41]/40 bg-[#0b0f19]/50'}`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  multiple
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  onChange={handleFileSelect}
                  title=""
                />
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${selectedFiles.length > 0 ? 'bg-[#00ff41]/20' : 'bg-[#1a1c23] group-hover:bg-[#00ff41]/10'}`}>
                  <FiUploadCloud className={`transition-colors ${selectedFiles.length > 0 ? 'text-[#00ff41]' : 'text-gray-500 group-hover:text-[#00ff41]'}`} size={24} />
                </div>
                {selectedFiles.length > 0 ? (
                  <div className="w-full relative z-10 flex flex-col gap-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-[#00ff41]/30 text-left group/file">
                        <span className="text-[10px] text-[#00ff41] font-bold uppercase tracking-wider font-mono truncate max-w-[80%]">
                          {file.name}
                        </span>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="text-[#00ff41]/50 hover:text-red-400 p-1"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-400 font-mono mt-2">Click or drag more files to append</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1 font-mono">
                      Drag & Drop PCAP, Images, or Exploit Scripts
                    </p>
                    <p className="text-[10px] text-[#00ff41] font-bold uppercase tracking-widest font-mono">Max File Size 100MB per file</p>
                  </>
                )}
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-[#252830] bg-[#1a1c23] flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.title.trim()}
              className="px-8 py-2.5 bg-[#00ff41] hover:bg-[#00cc33] text-black text-sm font-black rounded-lg uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,255,65,0.3)] hover:shadow-[0_0_25px_rgba(0,255,65,0.5)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center gap-2"
            >
              {isSubmitting ? (isUploading ? 'Uploading...' : 'Saving...') : 'Save Finding'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RecordFindingModal;
