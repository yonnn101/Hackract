import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api/axiosConfig";
import {
  FiTarget, FiZap, FiAward, FiShield, FiClock, FiActivity, FiDollarSign
} from "react-icons/fi";

const StatCard = ({ label, value, trend, icon: Icon, color }) => (
  <div className="bg-black/70 border border-white/10 p-6 rounded-4xl flex flex-col gap-4 group hover:border-[#00c477]/30 transition-all duration-300 backdrop-blur-md">
    <div className="flex items-center justify-between">
      <div className={`w-12 h-12 rounded-2xl bg-black flex items-center justify-center shrink-0 border border-white/10 group-hover:border-[#00c477]/30 transition-colors`}>
        <Icon className={color} size={20} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-[10px] font-black text-[#00c477] bg-[#00c477]/10 px-2 py-1 rounded-lg uppercase tracking-widest font-mono border border-[#00c477]/20">
            {trend}
        </div>
      )}
    </div>
    <div>
      <p className="text-3xl font-bold text-white tracking-tighter">{value}</p>
      <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] mt-1">{label}</p>
    </div>
  </div>
);

const Badge = ({ text, type = "default" }) => {
  const styles = {
    default: "bg-black text-white border-white/10",
    success: "bg-[#00c477]/10 text-[#00c477] border-[#00c477]/30",
    warning: "bg-[#00c477]/10 text-[#00c477] border-[#00c477]/30",
    danger: "bg-[#00c477]/10 text-[#00c477] border-[#00c477]/30",
    info: "bg-[#00c477]/10 text-[#00c477] border-[#00c477]/30",
  };
  return (
    <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${styles[type] || styles.default}`}>
      {text}
    </span>
  );
};

const HackerDashboardView = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/hacker-profiles/me");
        setProfile(data?.data?.profile);
      } catch (err) {
        console.error("Profile fetch error", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-10">
      {/* High-Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Exploits Validated" value="14" trend="+8%" icon={FiTarget} color="text-[#00c477]" />
        <StatCard label="Accumulated Rewards" value="$42.5k" trend="+12%" icon={FiDollarSign} color="text-[#00c477]" />
        <StatCard label="Operative Rank" value="#128" trend="Top 1%" icon={FiAward} color="text-[#00c477]" />
        <StatCard label="Neural Impact" value="982" trend="+45" icon={FiZap} color="text-[#00c477]" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Active Missions */}
        <div className="bg-black/70 rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col backdrop-blur-md">
          <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
            <h3 className="text-xs font-black text-white/70 uppercase tracking-[0.2em] flex items-center gap-3">
              <FiShield className="text-[#00c477]" /> Active Mission Roster
            </h3>
            <button className="text-[10px] font-bold text-[#00c477] hover:text-white transition-colors uppercase tracking-widest">Execute Full Scan</button>
          </div>
          <div className="p-6 space-y-4">
            {[
              { id: 1, name: "Project Nightingale", org: "Nebula Systems", status: "Ongoing", severity: "High", due: "2d left" },
              { id: 2, name: "Core Ledger Audit", org: "FinBank Int", status: "Reporting", severity: "Critical", due: "14h left" },
              { id: 3, name: "Edge Network Scan", org: "Global Logistics", status: "Pending Fix", severity: "Medium", due: "3d left" },
            ].map(m => (
              <div key={m.id} className="p-6 rounded-3xl bg-black border border-white/10 hover:border-[#00c477]/30 hover:bg-white/5 transition-all cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                   <div className="space-y-1">
                     <p className="text-sm font-bold text-white group-hover:text-[#00c477] transition-colors uppercase tracking-tight">{m.name}</p>
                     <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{m.org}</p>
                   </div>
                   <Badge text={m.status} type={m.status === "Ongoing" ? "info" : "success"} />
                </div>
                <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-white/60 uppercase tracking-widest group-hover:text-white transition-colors">
                     <FiZap className="text-[#00c477]" /> {m.severity} THREAT
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest ml-auto">
                     <FiClock /> {m.due}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Intel */}
        <div className="bg-black/70 rounded-[2.5rem] border border-white/10 overflow-hidden backdrop-blur-md">
          <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
            <h3 className="text-xs font-black text-white/70 uppercase tracking-[0.2em] flex items-center gap-3">
              <FiActivity className="text-[#00c477]" /> Operative Telemetry
            </h3>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#00c477] rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-[#00c477] uppercase tracking-widest">Synced</span>
            </div>
          </div>
          <div className="p-8 space-y-8 relative">
            <div className="absolute left-[47px] top-12 bottom-12 w-px bg-white/10" />
            {[
              { id: 1, action: "Exploit Validated", target: "SQLi in AuthService", time: "2h ago", icon: FiTarget, color: "text-[#00c477] bg-[#00c477]/10 border-[#00c477]/20" },
              { id: 2, action: "Engagement Activated", target: "Project Nightingale", time: "5h ago", icon: FiShield, color: "text-[#00c477] bg-[#00c477]/10 border-[#00c477]/20" },
              { id: 3, action: "Reward Dispatched", target: "$2,500.00 BTC equiv.", time: "1d ago", icon: FiDollarSign, color: "text-[#00c477] bg-[#00c477]/10 border-[#00c477]/20" },
              { id: 4, action: "Rank Calibrated", target: "Advanced to Elite Tier", time: "3d ago", icon: FiAward, color: "text-[#00c477] bg-[#00c477]/10 border-[#00c477]/20" },
            ].map(a => (
              <div key={a.id} className="flex gap-6 items-start relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${a.color} shadow-lg`}>
                   <a.icon size={18} />
                </div>
                <div className="flex-1 pt-0.5">
                   <p className="text-[11px] font-black text-white uppercase tracking-wider">{a.action}</p>
                   <p className="text-sm font-bold text-white/70 mt-1">{a.target}</p>
                   <p className="text-[9px] font-bold text-white/40 mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
                       <FiClock size={10} /> {a.time}
                   </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HackerDashboardView;
