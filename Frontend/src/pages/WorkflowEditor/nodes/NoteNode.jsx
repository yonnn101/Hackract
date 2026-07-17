import { Handle, Position, NodeResizer } from '@xyflow/react';
import { FiFileText, FiX } from 'react-icons/fi';

const NoteNode = ({ data, selected }) => {
  const activeUsers = Object.values(data.activeUsers || {});
  const showPresence = activeUsers.length > 0;

  return (
    <div
      className={`bg-[#0b0f19] border rounded-lg font-mono text-sm transition-all relative flex flex-col h-full min-w-[220px] min-h-[160px] ${
        selected || showPresence
          ? 'border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.6)]'
          : 'border-[#00ff88]/50 shadow-[0_0_10px_rgba(0,255,136,0.3)]'
      }`}
    >
      {/* NodeResizer — drag any edge or corner to resize */}
      <NodeResizer
        minWidth={220}
        minHeight={160}
        isVisible={selected}
        lineClassName="!border-[#00ff88]/60 hover:!border-[#00ff88]"
        handleClassName="!w-2.5 !h-2.5 !rounded-sm !bg-[#00ff88] !border-[#0b0f19] !border-2 hover:!scale-125 transition-transform"
      />

      {/* Presence Indicators */}
      {showPresence && (
        <div className="absolute -top-6 right-0 flex -space-x-2">
          {activeUsers.map((u, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full border-2 border-[#0b0f19] flex items-center justify-center text-[10px] font-bold text-white shadow-lg animate-bounce"
              style={{ backgroundColor: u.color || '#00ff88' }}
              title={u.user}
            >
              {u.user?.[0] || 'U'}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="p-2 flex justify-between items-center text-[#00ff88] border-b border-[#00ff88]/30 shrink-0">
        <div className="flex items-center gap-2">
          <FiFileText size={16} />
          <span className="font-bold text-xs uppercase tracking-tighter">Research Note</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-transparent border-none text-right focus:outline-none text-gray-500 text-xs placeholder-gray-700 w-[100px]"
            placeholder="Title..."
            defaultValue={data.label || ''}
            onBlur={(e) => data.onTitleChange && data.onTitleChange(e.target.value)}
          />
          <button
            className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
            onClick={() => data.onDelete && data.onDelete()}
          >
            <FiX size={14} />
          </button>
        </div>
      </div>

      {/* Body — textarea fills remaining height */}
      <div className="p-3 flex-1 flex flex-col">
        <textarea
          className="flex-1 w-full bg-black border border-gray-800 text-gray-300 p-2 rounded resize-none focus:outline-none focus:border-[#00ff88]/50"
          placeholder="Taking note about what I am doing..."
          defaultValue={data.text || ''}
          onChange={(e) => data.onDataChange && data.onDataChange({ text: e.target.value })}
        />
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
    </div>
  );
};

export default NoteNode;
