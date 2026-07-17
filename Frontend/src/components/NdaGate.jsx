import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiShield, FiFileText, FiLock, FiClock, FiZap, FiRefreshCcw } from "react-icons/fi";
import api from "../api/axiosConfig";
import toast from "react-hot-toast";

/**
 * NdaGate
 * Wraps children and renders a full-screen NDA signing screen if the
 * current hacker has not yet signed the active project agreement.
 */
const NdaGate = ({ projectId, children }) => {
  const [status, setStatus] = useState(null); // null = loading
  const [signing, setSigning] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Canvas logic
  const canvasRef = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get(`/pentests/${projectId}/agreements/active`);
      const payload = data?.data;
      if (!payload || !payload.agreement) {
        // No agreement required
        setStatus({ required: false, signed: true });
        return;
      }
      setStatus({
        required: true,
        signed: payload.signed,
        agreement: payload.agreement
      });
    } catch (err) {
      if (err?.response?.status === 404) {
        // No active agreement
        setStatus({ required: false, signed: true });
      } else {
        setStatus({ required: false, signed: true });
      }
    }
  };

  useEffect(() => {
    if (projectId) fetchStatus();
  }, [projectId]);

  // Set up canvas drawing
  useEffect(() => {
    if (!status || !status.required || status.signed) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let drawing = false;

    const startDrawing = (e) => {
      drawing = true;
      draw(e);
    };

    const stopDrawing = () => {
      drawing = false;
      ctx.beginPath();
    };

    const draw = (e) => {
      if (!drawing) return;
      setHasDrawn(true);
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
      const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#00c477';

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch support
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      draw(e);
    }, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [status]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (!hasDrawn) {
      toast.error("Please provide your digital signature.");
      return;
    }
    
    setSigning(true);
    try {
      const signatureData = canvasRef.current.toDataURL('image/png');
      
      await api.post(`/pentests/${projectId}/agreements/active/sign`, {
        signatureData
      });
      
      toast.success("NDA signed! Access granted.");
      setStatus(prev => ({ ...prev, signed: true }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to sign the agreement.");
    } finally {
      setSigning(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────
  if (!status) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-white/40">
          <div className="w-10 h-10 border-2 border-white/10 border-t-[#00c477] rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-[0.3em] font-mono animate-pulse">Verifying Authorization</p>
        </div>
      </div>
    );
  }

  // ─── Access granted ─────────────
  if (!status.required || status.signed) {
    return <>{children}</>;
  }

  // ─── NDA Gate ─────────────────────────────────────────────────────────
  const { agreement } = status;

  return (
    <div className="min-h-screen bg-black text-white/80 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00c477]/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-[#00c477] shadow-inner font-black">
            <FiShield size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white italic">Legal Authorization Required</h1>
            <p className="text-sm text-white/40 mt-1 uppercase tracking-widest font-mono text-[10px]">
              Secure Sector Protocol initialization in progress.
            </p>
          </div>
        </div>

        {/* Agreement card */}
        <div className="bg-[#050505] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
          {/* Agreement header */}
          <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <FiFileText className="text-[#00c477]" size={18} />
              <div>
                <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">{agreement.title}</p>
                <p className="text-[9px] text-white/30 font-mono mt-0.5 tracking-widest">MD-VERSION {agreement.version}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#00c477]/10 border border-[#00c477]/20 px-3 py-1.5 rounded-lg">
              <div className="w-1.5 h-1.5 bg-[#00c477] rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-[#00c477] uppercase tracking-widest">Awaiting Signature</span>
            </div>
          </div>

          {/* Agreement content */}
          <div
            className="p-8 max-h-64 overflow-y-auto text-sm text-gray-400 leading-relaxed space-y-4 custom-scrollbar"
            onScroll={(e) => {
              const el = e.target;
              if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) {
                setScrolled(true);
              }
            }}
          >
            {agreement.body.split("\n").map((line, i) =>
              line.trim() ? <p key={i}>{line}</p> : <br key={i} />
            )}

            {!scrolled && (
              <div className="sticky bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#050505] to-transparent flex items-end justify-center pb-1 pointer-events-none">
                <span className="text-[9px] font-bold text-[#00c477]/60 uppercase tracking-[0.2em] flex items-center gap-2 animate-bounce">
                  <FiClock size={10} /> Scroll to read full dossier
                </span>
              </div>
            )}
          </div>

          {/* Digital Signature Pad */}
          <div className="px-8 py-6 border-t border-white/10 bg-black/50">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-mono font-black text-white/60 uppercase tracking-widest">
                Digital Signature Pad
              </label>
              {hasDrawn && (
                <button 
                  onClick={clearCanvas}
                  className="text-[10px] text-gray-500 hover:text-rose-400 flex items-center gap-1 transition-colors font-mono uppercase"
                >
                  <FiRefreshCcw /> Clear
                </button>
              )}
            </div>
            <div className="relative rounded-xl border border-white/10 bg-black overflow-hidden group">
              <canvas
                ref={canvasRef}
                width={500}
                height={120}
                className="w-full h-[120px] cursor-crosshair touch-none"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30 group-hover:opacity-10 transition-opacity">
                  <span className="text-xl font-mono text-gray-400 italic">Sign Here</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-600 mt-3 leading-relaxed">
              By signing above, I acknowledge that I have read and fully understand the terms of this Non-Disclosure Agreement. I agree to be legally bound by its provisions.
            </p>
          </div>
        </div>

        {/* Action row */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500 text-[9px] font-mono uppercase tracking-widest">
            <FiLock size={12} className="text-[#00c477]/40" />
            <span>Cryptographic timestamp logged via Secure Ledger</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSign}
            disabled={signing || !hasDrawn}
            className={`group flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${
              hasDrawn && !signing
                ? "bg-[#00c477] text-black hover:scale-105 shadow-[0_0_20px_rgba(0,196,119,0.3)] cursor-pointer"
                : "bg-white/5 text-gray-600 border border-white/10 cursor-not-allowed"
            }`}
          >
            {signing ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Execute Agreement <FiZap className="ml-1" />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default NdaGate;
