import React, { useEffect, useState, useMemo } from 'react';
import { FiX, FiClock, FiUser, FiActivity } from 'react-icons/fi';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import workflowService from '../../../services/workflow.service';

const BADGE_COLORS = {
  ADD_NODE: '#00ff41',
  DELETE_NODE: '#ff4444',
  MOVE_NODE: '#00a3ff',
  UPDATE_TITLE: '#a78bfa',
  CONNECT_NODES: '#22d3ee',
  DELETE_EDGE: '#f97316',
  LINK_FINDING: '#facc15',
  TERMINAL_EXEC: '#f59e0b',
  AGENT_RAN: '#d000ff',
  GRAPH_CHANGED: '#ffffff',
  CREATE_CHECKPOINT: '#00ff41',
  RESTORE_CHECKPOINT: '#ff4444',
};



const HistorySidebar = ({ workflowId, isOpen, onClose, liveEvents = [], localUser, onCreateCheckpoint, onRestore }) => {
  const [dbHistory, setDbHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const localUserId = localUser?.id || localUser?._id;

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, workflowId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await workflowService.getWorkflowHistory(workflowId);
      setDbHistory(data || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load history", err);
      setLoading(false);
    }
  };

  const combinedHistory = useMemo(() => {
    // Merge liveEvents and dbHistory, filter duplicates by id
    const all = [...liveEvents, ...dbHistory];
    const unique = [];
    const seen = new Set();
    for (const record of all) {
      if (!seen.has(record.id)) {
        seen.add(record.id);
        unique.push(record);
      }
    }
    // Sort descending
    return unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [dbHistory, liveEvents]);

  const groupedHistory = useMemo(() => {
    const groups = {};
    combinedHistory.forEach(record => {
      const date = new Date(record.createdAt);
      let groupKey = format(date, 'MMM d, yyyy');
      if (isToday(date)) groupKey = 'TODAY';
      else if (isYesterday(date)) groupKey = 'YESTERDAY';

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(record);
    });
    return groups;
  }, [combinedHistory]);

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-[#0b0f19] border-l border-gray-800 flex flex-col h-full z-30 fixed right-0 top-0 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transition-transform duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#161a23]">
        <div className="flex items-center gap-2 text-[#00a3ff]">
          <FiClock size={18} />
          <h2 className="font-bold font-mono text-sm uppercase tracking-wider">Activity Log</h2>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-4">
        {loading && combinedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-500 font-mono text-xs">
            <div className="w-6 h-6 border-2 border-t-[#00a3ff] border-gray-800 rounded-full animate-spin"></div>
            <span>Scanning archives...</span>
          </div>
        ) : combinedHistory.length === 0 ? (
          <div className="text-center text-gray-500 font-mono text-xs py-10 italic">
            No modifications recorded yet.
          </div>
        ) : (
          Object.entries(groupedHistory).map(([dateLabel, records]) => (
            <div key={dateLabel} className="space-y-3">
               <div className="sticky top-0 bg-[#0b0f19]/95 backdrop-blur-sm z-10 px-4 py-2 border-b border-gray-800/50">
                 <h3 className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest">{dateLabel}</h3>
               </div>
               
               <div className="px-4 space-y-4">
                 {records.map((record, index) => {
                   const recordUserId = record.userId || record.user?.id || record.user?._id;
                   const isYou = localUserId && String(recordUserId) === String(localUserId);
                   const userName = record.user?.fullName || record.user?.name || 'Agent X';
                   const userInitials = userName.substring(0, 2).toUpperCase();
                   const badgeColor = BADGE_COLORS[record.action] || '#00ff41';
                   const isLive = liveEvents.some(e => e.id === record.id);
                   
                   return (
                     <div 
                       key={record.id} 
                       className={`group relative pl-6 ${isLive ? 'animate-pulse' : ''}`}
                     >
                       {/* Timeline Line */}
                       {index !== records.length - 1 && (
                         <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-gray-800 group-hover:bg-gray-600 transition-colors z-0"></div>
                       )}

                       {/* Avatar Circle */}
                       <div 
                         className="absolute left-0 top-0 w-6 h-6 rounded-full bg-[#161a23] border border-gray-700 flex items-center justify-center text-[9px] font-bold z-10"
                         title={userName}
                         style={{ color: badgeColor, borderColor: `${badgeColor}40` }}
                       >
                         {userInitials}
                       </div>

                       {/* Content */}
                       <div className="bg-[#161a23] border border-gray-800/60 rounded-md p-2.5 hover:border-gray-700 transition-colors ml-2 relative">
                         <div className="flex justify-between items-start mb-1">
                           <div className="flex items-center gap-1.5">
                             <span className="text-xs font-bold text-gray-300">
                               {isYou ? 'You' : userName}
                             </span>
                             {record.user?.roles?.[0] && (
                               <span className="text-[7px] bg-white/5 border border-white/10 text-gray-500 px-1 py-0.5 rounded uppercase font-black tracking-tighter leading-none">
                                 {record.user.roles[0].type.replace('_', ' ')}
                               </span>
                             )}
                             {isLive && !isYou && <span className="text-[8px] bg-[#00ff41]/20 text-[#00ff41] px-1 rounded uppercase font-bold animate-pulse">New</span>}
                           </div>
                           <div 
                             className="text-[9px] text-gray-500 font-mono cursor-help"
                             title={format(new Date(record.createdAt), 'MMM d, yyyy h:mm a')}
                           >
                             {formatDistanceToNow(new Date(record.createdAt))} ago
                           </div>
                         </div>
                         
                         <div className="text-[11px] text-gray-400 font-medium">
                           {record.message || record.action.replace(/_/g, ' ')}
                         </div>

                         {record.isSnapshot && record.snapshot && (
                           <button 
                             onClick={() => onRestore && onRestore(record.snapshot)}
                             className="mt-2 text-[10px] font-bold text-[#00a3ff] hover:text-white bg-[#00a3ff]/10 hover:bg-[#00a3ff]/20 px-2 py-1 rounded transition-colors w-full border border-[#00a3ff]/20"
                           >
                             RESTORE VERSION
                           </button>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Snapshot Action */}
      <div className="p-4 border-t border-gray-800 bg-[#07090e]">
        <button 
          onClick={onCreateCheckpoint}
          className="w-full py-2 bg-[#161a23] border border-[#00ff41]/30 text-[#00ff41] font-mono text-[11px] font-bold rounded hover:bg-[#00ff41]/10 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,65,0.1)]"
        >
          <span>💾</span>
          CREATE CHECKPOINT
        </button>
      </div>
    </div>
  );
};

export default HistorySidebar;
