import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext.jsx";
import api from "../api/axiosConfig";
import { motion } from "framer-motion";

// ── Icons ───────────────────────────────────────────────────────────────────
const Icons = {
  Organization: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  ),
  Hacker: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.roles?.[0]?.type === "PENTESTER" || user?.roles?.[0]?.type === "PROJECT_ADMIN") {
      navigate("/hacker-dashboard");
    } else if (user?.roles?.[0]?.type === "ORG_ADMIN") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleRoleSelection = async (role) => {
    setError("");
    setLoading(true);
    try {
      // Endpoint to assign role to a role-less user (placeholder logic)
      await api.post("/auth/assign-initial-role", { role });
      
      // Refresh user context to get the new role
      if (refreshUser) await refreshUser();
      
      // Navigation will be handled by Home.jsx or a redirect here
      if (role === "PENTESTER") {
        navigate("/hacker-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Internal system error. Failed to synchronize identity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col items-center justify-center p-6 font-sans text-[#1a1c1e]">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-40 overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full text-center relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-full shadow-sm mb-8">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Secure Handshake Established</span>
        </div>
        
        <h1 className="text-5xl font-black tracking-tight text-gray-900 mb-4">
          Welcome to the <span className="text-indigo-600">Global Grid.</span>
        </h1>
        <p className="text-lg text-gray-500 font-medium max-w-lg mx-auto mb-16 leading-relaxed">
          Your account is verified. Now, choose your operational directive to begin your mission.
        </p>

        {error && (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-rose-50 border border-rose-100 p-4 rounded-2xl mb-8 text-rose-600 text-sm font-bold">
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-8 px-4 max-w-xl mx-auto">
          {/* Hacker Selection */}
          <motion.button
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRoleSelection("PENTESTER")}
            disabled={loading}
            className="group relative bg-white border-2 border-transparent hover:border-indigo-500 rounded-[40px] p-10 text-left shadow-xl shadow-gray-200/50 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Icons.Hacker />
            </div>
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
               <Icons.Hacker />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">Technical Operative</h3>
            <p className="text-gray-500 font-medium leading-relaxed mb-8">
              Hunt for vulnerabilities, earn bounties, and secure the digital frontier as an elite ethical hacker.
            </p>
            <div className="flex items-center gap-3 text-indigo-600 font-black text-xs uppercase tracking-widest">
               Initialize Dossier <Icons.ArrowRight />
            </div>
          </motion.button>
        </div>

        <div className="mt-16 flex items-center justify-center gap-10 opacity-40">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
             <Icons.Sparkles /> Multi-Vector Protection
           </p>
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
             <Icons.Sparkles /> Encrypted Node Presence
           </p>
        </div>
      </motion.div>

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
           <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
           <p className="text-xs font-black text-indigo-900/40 uppercase tracking-widest">Synchronizing Protocol Identity...</p>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
