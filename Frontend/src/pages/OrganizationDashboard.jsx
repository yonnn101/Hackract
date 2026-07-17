import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FiShield, FiUsers, FiAlertCircle, FiArrowRight,
  FiExternalLink, FiChevronDown, FiPlus, FiEye,
  FiBarChart2, FiActivity, FiGlobe, FiClock, FiTarget
} from "react-icons/fi";
import api from "../api/axiosConfig";
import { useAuth } from "../context/authContext";
import toast from "react-hot-toast";

// ─── Stat Card Component ──────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, color, trend, progress, avatars }) => (
  <div className="bg-[#050505] border border-white/5 p-8 rounded-[32px] flex flex-col justify-between h-48 relative overflow-hidden group hover:border-[#00c477]/20 transition-all duration-500 shadow-2xl">
    <div className="flex items-start justify-between relative z-10">
      <div className="space-y-1">
        <p className="text-[10px] font-mono font-black text-gray-600 uppercase tracking-[.2em]">{label}</p>
        <h3 className="text-5xl font-black text-white tracking-tighter">{value}</h3>
      </div>
      <div className={`p-3 rounded-2xl bg-white/2 border border-white/5 ${color} group-hover:scale-110 transition-transform duration-500`}>
        <Icon size={24} />
      </div>
    </div>

    <div className="relative z-10 flex items-center justify-between">
      {progress !== undefined && (
        <div className="flex-1 mr-6">
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-linear-to-r from-[#00c477] to-emerald-400 shadow-[0_0_10px_#00c477]"
            />
          </div>
        </div>
      )}

      {avatars && (
        <div className="flex -space-x-2 mr-auto">
          {avatars.map((av, i) => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-[#050505] bg-gray-800 flex items-center justify-center text-[10px] font-black text-white overflow-hidden shadow-lg">
              {av.startsWith('http') ? <img src={av} alt="avatar" /> : av}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full border-2 border-[#050505] bg-[#00c477]/10 text-[#00c477] flex items-center justify-center text-[8px] font-black shadow-lg">
            +4
          </div>
        </div>
      )}

      {trend && (
        <span className="text-[10px] font-mono font-black text-[#00c477] tracking-widest">{trend}</span>
      )}

      {sub && (
        <span className="text-[9px] font-mono font-black text-[#ff3366] uppercase tracking-widest leading-none text-right">{sub}</span>
      )}
    </div>

    <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
  </div>
);

// ─── Project Table Component ──────────────────────────────────────────────────
const ActiveProjects = ({ projects, onNavigate }) => {
  const displayProjects = (projects || []).slice(0, 5);

  return (
    <div className="bg-[#050505] border border-white/5 rounded-[32px] overflow-hidden flex flex-col shadow-2xl h-full">
      <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-black text-white tracking-widest uppercase font-mono">Recent Projects</h3>
        <button
          onClick={onNavigate}
          className="text-[9px] font-black text-gray-500 hover:text-[#00c477] transition-colors uppercase tracking-[0.2em]"
        >
          View All
        </button>
      </div>
      <div className="p-0 flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[9px] font-mono font-black text-gray-600 uppercase tracking-widest border-b border-white/5">
              <th className="px-10 py-4 font-normal">Name</th>
              <th className="px-10 py-4 font-normal">Status</th>
              <th className="px-10 py-4 font-normal text-center">Admin</th>
              <th className="px-10 py-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/3">
            {displayProjects.map((p, i) => (
              <tr key={i} className="hover:bg-white/1 transition-all group">
                <td className="px-10 py-6">
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-tight group-hover:text-[#00c477] transition-colors">{p.name}</p>
                    <p className="text-[10px] font-mono text-gray-600 mt-1">ID: {p.id.slice(0, 8)}</p>
                  </div>
                </td>
                <td className="px-10 py-6">
                  <span className={`text-[8px] font-black px-2.5 py-1 rounded-md border tracking-widest ${p.status === 'IN_PROGRESS'
                      ? 'bg-[#00c477]/5 text-[#00c477] border-[#00c477]/20'
                      : 'bg-blue-500/5 text-blue-400 border-blue-500/20'
                    }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-10 py-6 text-center">
                  <span className="text-xs font-mono font-bold text-gray-400">
                    {p.collaborators?.find(c => c.role === 'PROJECT_ADMIN')?.user?.fullName || 'N/A'}
                  </span>
                </td>
                <td className="px-10 py-6 text-right">
                  <button onClick={() => onNavigate(p.id)} className="text-gray-600 hover:text-white transition-colors"><FiEye size={16} /></button>
                </td>
              </tr>
            ))}
            {displayProjects.length === 0 && (
              <tr>
                <td colSpan={4} className="px-10 py-20 text-center text-[10px] text-white/20 uppercase tracking-widest font-mono">
                  No mission directives found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Chart Component ──────────────────────────────────────────────────────────
// ─── Recent Activity Widget Component ──────────────────────────────────────────
const formatAction = (log) => {
  const { action, user, pentest, details } = log;
  const userName = user?.fullName || "System";
  const projectName = pentest?.name || details?.projectName || details?.name || "Unknown Project";

  switch (action) {
    case "PROJECT_CREATED":
      return {
        title: `${userName} initialized the project workspace for "${projectName}".`,
        sub: "Initialization",
        color: "text-sky-400 bg-sky-400/10 border-sky-400/20"
      };
    case "HACKER_HIRED":
      return {
        title: `${userName} assigned a new operator to the project "${projectName}".`,
        sub: "Operator Hired",
        color: "text-[#00c477] bg-[#00c477]/10 border-[#00c477]/20"
      };
    case "FINDING_CREATED":
      return {
        title: `${userName} reported a new vulnerability finding in "${projectName}".`,
        sub: "Vulnerability",
        color: "text-[#ff3366] bg-[#ff3366]/10 border-[#ff3366]/20"
      };
    case "PROJECT_KICKOFF":
      return {
        title: `${userName} completed the kickoff checklist for "${projectName}".`,
        sub: "Kickoff Done",
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      };
    case "PERSONAL_WORKSPACE_CREATED":
      return {
        title: `${userName} created a personal workspace "${projectName}".`,
        sub: "Workspace",
        color: "text-blue-400 bg-blue-400/10 border-blue-400/20"
      };
    case "PROJECT_UPDATED":
      return {
        title: `${userName} updated operational parameters for "${projectName}".`,
        sub: "Update",
        color: "text-gray-400 bg-gray-400/10 border-gray-400/20"
      };
    default:
      return {
        title: `${userName} performed action: ${action.toLowerCase().replace(/_/g, " ")} on "${projectName}".`,
        sub: action.replace(/_/g, " "),
        color: "text-gray-450 bg-white/5 border-white/10"
      };
  }
};

const RecentActivity = ({ activities = [], totalCount = 0 }) => {
  return (
    <div className="bg-[#050505] border border-white/5 rounded-[32px] p-10 flex flex-col h-full shadow-2xl relative overflow-hidden group">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00c477]/10 text-[#00c477] rounded-lg"><FiActivity /></div>
          <h3 className="text-sm font-black text-white tracking-widest uppercase font-mono">Recent Activity</h3>
        </div>
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{totalCount} Total Logs</span>
      </div>

      <div className="h-[280px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
        {activities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <FiClock size={32} className="mb-3 text-[#00c477]" />
            <p className="text-[10px] font-mono tracking-[0.2em] uppercase">No activity recorded</p>
          </div>
        ) : (
          <div className="relative border-l border-white/10 ml-2 space-y-6 pb-2">
            {activities.map((log) => {
              if (log.type === 'finding') {
                const reporterName = log.reporter?.fullName || "Operator";
                const projectName = log.pentest?.name || "Unknown Project";
                const severity = log.severity || "LOW";

                const getSeverityColor = (sev) => {
                  switch (sev) {
                    case 'CRITICAL': return 'text-purple-400';
                    case 'HIGH': return 'text-red-400';
                    case 'MEDIUM': return 'text-amber-400';
                    case 'LOW': return 'text-blue-400';
                    default: return 'text-gray-400';
                  }
                };

                return (
                  <div key={log.id} className="relative pl-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Timeline dot with red border for findings */}
                    <div className="absolute left-[-5.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#050505] border border-red-500/50 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />

                    <div className="flex items-start gap-3">
                      {/* Red activity icon for findings */}
                      <div className="mt-0.5">
                        <FiActivity className="text-red-500 shrink-0 text-sm animate-pulse" />
                      </div>

                      <div className="space-y-1 flex-1">
                        <div className="text-xs text-gray-300 leading-tight">
                          <span className="font-bold text-gray-200">{reporterName}</span> reported a new <span className={`font-black uppercase tracking-wider text-[10px] ${getSeverityColor(severity)}`}>{severity}</span> finding: <span className="text-white font-bold">"{log.title}"</span> in <span className="text-gray-400">"{projectName}"</span>.
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-mono">
                          <FiClock size={10} /> {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const userName = log.user?.fullName || "System";
              const actionText = log.action?.toLowerCase().replace(/_/g, " ") || "unknown action";

              return (
                <div key={log.id} className="relative pl-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Timeline dot on the vertical line */}
                  <div className="absolute left-[-5.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#050505] border border-white/20" />

                  <div className="flex items-start gap-3">
                    {/* Activity pulse wave icon */}
                    <div className="mt-0.5">
                      <FiActivity className="text-gray-400 shrink-0 text-sm" />
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="text-xs text-gray-300 leading-tight">
                        <span className="font-bold text-gray-200">{userName}</span> performed: <span className="text-gray-300">{actionText}.</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-mono">
                        <FiClock size={10} /> {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00c477]/[0.02] rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none group-hover:bg-[#00c477]/4 transition-all duration-700" />
    </div>
  );
};

// ─── Main Content ─────────────────────────────────────────────────────────────
const OrganizationDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [loading, setLoading] = useState(true);

  const organization = React.useMemo(() => user?.organizations?.[0]?.organization, [user]);

  const fetchDashboardData = async () => {
    if (!organization?.id) return;
    try {
      const [projectsRes, logsRes, findingsRes] = await Promise.all([
        api.get(`/projects?organizationId=${organization.id}`),
        api.get(`/audit-logs?organizationId=${organization.id}&limit=15`),
        api.get(`/findings?organizationId=${organization.id}&limit=15`)
      ]);
      setProjects(projectsRes.data.data || []);

      const activities = (logsRes.data.data || []).map(item => ({
        ...item,
        type: 'activity',
        timestamp: new Date(item.createdAt)
      }));

      const findings = (findingsRes.data?.data || []).map(item => ({
        ...item,
        type: 'finding',
        timestamp: new Date(item.createdAt)
      }));

      const merged = [...activities, ...findings].sort((a, b) => b.timestamp - a.timestamp);

      setRecentActivities(merged.slice(0, 15));
      setTotalActivities(merged.length);
    } catch (err) {
      toast.error("Telemetry link unstable. Failed to sync dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [organization?.id]);

  // Calculations
  const activeCount = projects.filter(p => p.status === 'IN_PROGRESS').length;

  const allHackers = projects.flatMap(p =>
    (p.collaborators || []).filter(c => ['HACKER', 'PROJECT_ADMIN', 'PENTESTER'].includes(c.role)).map(c => c.userId)
  );
  const uniqueHackerCount = new Set(allHackers).size;

  const hackerAvatars = projects.flatMap(p =>
    (p.collaborators || []).filter(c => ['HACKER', 'PROJECT_ADMIN', 'PENTESTER'].includes(c.role)).map(c => c.user?.fullName?.[0] || 'H')
  ).slice(0, 4);

  const openFindingsCount = projects.reduce((acc, p) => acc + (p._count?.findings || 0), 0);

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-64 bg-[#050505] -m-10 min-h-screen">
        <div className="w-12 h-12 border-2 border-white/10 border-t-[#00c477] rounded-full animate-spin mb-4" />
        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Syncing Mission Control</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard
          label="TOTAL PROJECTS"
          value={projects.length.toString().padStart(2, '0')}
          icon={FiGlobe}
          color="text-[#00c477]"
          progress={projects.length > 0 ? (activeCount / projects.length) * 100 : 0}
          trend={projects.length > 0 ? `${activeCount} ACTIVE` : "NO ACTIVE PROJECTS"}
        />
        <StatCard
          label="ASSIGNED PENTESTERS"
          value={uniqueHackerCount.toString().padStart(2, '0')}
          icon={FiUsers}
          color="text-blue-400"
          avatars={hackerAvatars}
        />
        <StatCard
          label="TOTAL FINDINGS"
          value={openFindingsCount.toString().padStart(2, '0')}
          icon={FiAlertCircle}
          color="text-[#ff3366]"
          sub="ACROSS ALL ENGAGEMENTS"
        />
      </div>

      {/* MIDDLE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
        <ActiveProjects projects={projects} onNavigate={(id) => id && typeof id === 'string' ? navigate(`/org-projects/${id}`) : navigate('/org-projects')} />
        <RecentActivity activities={recentActivities} totalCount={totalActivities} />
      </div>

    </div>
  );
};

export default OrganizationDashboard;
