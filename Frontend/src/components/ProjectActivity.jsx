import { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import { FiActivity, FiUser, FiClock, FiPlusCircle, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";

const ProjectActivity = ({ projectId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const [activityRes, findingsRes] = await Promise.all([
          api.get(`/projects/${projectId}/activity`),
          api.get(`/findings?pentestId=${projectId}`)
        ]);
        
        const activities = (activityRes.data?.data || []).map(item => ({
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
        setLogs(merged);
      } catch (error) {
        console.error("Failed to fetch project activity", error);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchActivity();
  }, [projectId]);

  const getActionIcon = (log) => {
    if (log.type === 'finding') {
      return <FiAlertTriangle className="text-rose-500 animate-pulse shrink-0" />;
    }
    switch (log.action) {
      case "PROJECT_CREATED": return <FiPlusCircle className="text-sky-400 shrink-0" />;
      case "HACKER_HIRED": return <FiUser className="text-[#00c477]" />;
      case "FINDING_CREATED": return <FiActivity className="text-amber-500" />;
      case "PROJECT_KICKOFF": return <FiCheckCircle className="text-emerald-500" />;
      default: return <FiActivity className="text-gray-400" />;
    }
  };

  const formatAction = (log) => {
    if (log.type === 'finding') {
      const getSeverityStyle = (sev) => {
        switch (sev) {
          case 'CRITICAL': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
          case 'HIGH': return 'bg-red-500/10 text-red-400 border border-red-500/20';
          case 'MEDIUM': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
          case 'LOW': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
          default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
        }
      };
      return (
        <span className="space-y-1 block">
          <span className="flex items-center gap-2">
            <span className="text-rose-400 font-bold uppercase tracking-widest text-[9px]">NEW FINDING DETECTED:</span>
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${getSeverityStyle(log.severity)}`}>
              {log.severity}
            </span>
            <span className="text-gray-500 text-[9px]">[{log.status}]</span>
          </span>
          <span className="text-white font-bold block text-sm">{log.title}</span>
          {log.affectedAsset && (
            <span className="text-[10px] text-gray-500 block">Asset: {log.affectedAsset}</span>
          )}
        </span>
      );
    }

    const { action, user } = log;
    const userName = user?.fullName || "System";
    
    switch (action) {
      case "PROJECT_CREATED": return <span>{userName} initialized the project workspace.</span>;
      case "HACKER_HIRED": return <span>{userName} hired a new operator.</span>;
      case "FINDING_CREATED": return <span>{userName} reported a new vulnerability finding.</span>;
      case "PROJECT_KICKOFF": return <span>{userName} completed the kickoff checklist.</span>;
      default: return <span>{userName} performed: {action.toLowerCase().replace(/_/g, " ")}.</span>;
    }
  };

  if (loading) return <div className="text-xs font-mono text-gray-500 animate-pulse p-4">SYNCING TELEMETRY LOGS...</div>;

  return (
    <div className="space-y-4 p-4">
      {logs.length === 0 ? (
        <div className="text-xs font-mono text-gray-500 italic p-2">No activity or findings recorded for this sector.</div>
      ) : (
        <div className="relative border-l border-white/10 ml-2 space-y-6 pb-2">
          {logs.map((log) => (
            <div key={log.id} className="relative pl-6">
              <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full bg-black border border-white/20" />
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getActionIcon(log)}</div>
                <div className="space-y-1 flex-1">
                  <div className="text-xs text-gray-300">
                    {formatAction(log)}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-gray-500 font-mono">
                    <FiClock /> {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectActivity;
