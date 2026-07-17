import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiUpload, FiX, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { uploadFile } from '../api/chatApi';

const SignedAgreementModal = ({ open, onClose, onConfirm, agreementUrl, agreementTitle }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setUploading(false);
    }
  }, [open]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      toast.error('Please upload a PDF file.');
      return;
    }
    setFile(selected);
  };

  const handleConfirm = async () => {
    if (!file) {
      toast.error('Please upload your signed PDF.');
      return;
    }

    setUploading(true);
    try {
      const fileData = await uploadFile(file);
      await onConfirm(fileData);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to upload signed document.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#00c477]/10 rounded-full blur-[60px] pointer-events-none" />

            <div className="px-8 pt-8 pb-6 border-b border-white/5 flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-[#00c477]/10 border border-[#00c477]/20 flex items-center justify-center">
                <FiFileText className="text-[#00c477] text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-[#00c477] font-mono tracking-widest uppercase mb-1">Signed Agreement Required</p>
                <h3 className="text-xl font-black text-white truncate">Upload Signed Document</h3>
                {agreementTitle && (
                  <p className="text-xs text-gray-500 font-mono truncate">{agreementTitle}</p>
                )}
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all shrink-0">
                <FiX />
              </button>
            </div>

            <div className="px-8 py-6 space-y-5 relative z-10">
              {agreementUrl && (
                <a
                  href={agreementUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#00c477] hover:text-[#00e088] transition-colors"
                >
                  <FiFileText /> View agreement
                </a>
              )}

              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  Upload Signed PDF <span className="text-[#00c477]">*</span>
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-gray-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-[#00c477]/10 file:text-[#00c477] file:font-bold file:uppercase file:text-[10px] file:tracking-widest hover:file:bg-[#00c477]/20"
                />
                {file && (
                  <p className="text-[11px] text-gray-500 mt-2 font-mono truncate">{file.name}</p>
                )}
              </div>
            </div>

            <div className="px-8 pb-8 flex gap-3 relative z-10">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm font-bold hover:bg-white/5 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={uploading || !file}
                className="flex-1 py-3 rounded-xl bg-[#00c477] text-black text-sm font-extrabold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,196,119,0.3)] hover:bg-[#00a865] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? <FiLoader className="animate-spin" /> : <FiUpload />}
                {uploading ? 'Uploading...' : 'Submit Signed PDF'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SignedAgreementModal;
