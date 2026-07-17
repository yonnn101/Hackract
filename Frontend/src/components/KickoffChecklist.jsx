import { useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axiosConfig";
import { FiCheckCircle, FiShield, FiFileText, FiTarget, FiBox } from "react-icons/fi";

const KickoffChecklist = ({ projectId, onComplete }) => {
  const [items, setItems] = useState([
    { id: 1, text: "Scope and assets verified", icon: <FiTarget />, checked: false },
    { id: 2, text: "Engagement rules & MNDA signed", icon: <FiFileText />, checked: false },
    { id: 3, text: "Compliance tags and environment ready", icon: <FiShield />, checked: false },
    { id: 4, text: "Hacker team finalized and briefed", icon: <FiBox />, checked: false },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const toggleItem = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const allChecked = items.every(item => item.checked);

  const handleKickoff = async () => {
    if (!allChecked) return toast.error("Complete all items before kickoff");
    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/kickoff`);
      toast.success("Engagement launched! Status: IN_PROGRESS");
      if (onComplete) onComplete();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Kickoff failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#00c477]/5 border border-[#00c477]/20 rounded-2xl p-6 shadow-xl shadow-[#00c477]/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-[#00c477]/20 flex items-center justify-center text-[#00c477]">
          <FiCheckCircle size={24} />
        </div>
        <div>
          <h3 className="font-bold text-[#00c477] uppercase tracking-widest font-mono">Engagement Kickoff</h3>
          <p className="text-xs text-gray-400">Perform these mandatory checks to transition from Planning to Execution.</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${item.checked
                ? "bg-[#00c477]/10 border-[#00c477]/40 text-[#00c477]"
                : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium">{item.text}</span>
            </div>
            <div className={`h-5 w-5 rounded-md border flex items-center justify-center ${item.checked ? "bg-[#00c477] border-[#00c477] text-black" : "border-white/20"
              }`}>
              {item.checked && <FiCheckCircle size={14} />}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleKickoff}
        disabled={!allChecked || submitting}
        className="mt-8 w-full py-4 bg-[#00c477] text-black font-mono font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-[#00c477]/80 transition-all shadow-lg shadow-[#00c477]/20 disabled:opacity-40 disabled:shadow-none"
      >
        {submitting ? "LAUNCHING..." : "START ENGAGEMENT"}
      </button>
    </div>
  );
};

export default KickoffChecklist;
