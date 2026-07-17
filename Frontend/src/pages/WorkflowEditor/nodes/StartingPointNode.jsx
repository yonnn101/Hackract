import { Handle, Position, NodeResizer } from '@xyflow/react';
import { FiPlay, FiX } from 'react-icons/fi';

const StartingPointNode = ({ data, selected }) => {
  const activeUsers = Object.values(data.activeUsers || {});
  const showPresence = activeUsers.length > 0;

  return (
    <div
      className={`bg-[#0b0f19] border rounded-lg font-mono text-sm overflow-hidden transition-all relative flex flex-col h-full min-w-[260px] min-h-[180px] ${
        showPresence || selected
          ? 'border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.5)] ring-2 ring-[#00ff88]'
          : 'border-[#00ff88]/50 shadow-[0_0_15px_rgba(0,255,136,0.4)]'
      }`}
    >
      {/* NodeResizer — drag any edge or corner to resize */}
      <NodeResizer
        minWidth={260}
        minHeight={180}
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
      <div className="bg-[#0b0f19] border-b border-[#00ff88]/30 p-2 flex justify-between items-center text-[#00ff88] shrink-0">
        <div className="flex items-center gap-2">
          <FiPlay size={16} />
          <span className="font-bold">Starting Point</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-transparent border-none text-right focus:outline-none text-gray-400 text-xs placeholder-gray-600 w-[120px]"
            placeholder="Scan Title..."
            defaultValue={data.label || ''}
            onBlur={(e) => data.onTitleChange && data.onTitleChange(e.target.value)}
          />
          <button
            className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
            onClick={() => data.onDelete && data.onDelete()}
            title="Delete Node"
          >
            <FiX size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4 flex-1">
        <div className="shrink-0">
          <label className="block text-[#00ff88] text-xs mb-1">Provide IP/Host address:</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="example.com"
              className="flex-1 bg-[#161a23] border border-gray-600 rounded px-2 py-1 text-gray-300 focus:outline-none focus:border-[#00ff88]"
              defaultValue={data.host || ''}
              onChange={(e) => data.onDataChange && data.onDataChange({ host: e.target.value })}
            />
            <button
              onClick={() => data.onRunAutomation && data.onRunAutomation(data.host)}
              className="bg-[#00ff88] text-black px-3 py-1 flex items-center justify-center rounded hover:bg-[#00cc33] transition-colors active:scale-95"
              title="Run Automated Recon"
            >
              <FiPlay size={14} />
            </button>
          </div>
          <p className="text-gray-500 text-[10px] mt-1">192.168.1.1 or example.com</p>
        </div>

        {/* Terminal output — fills remaining space */}
        <div className="flex-1 bg-black border border-[#00ff88]/50 p-2 rounded overflow-y-auto text-[#00ff88] text-xs min-h-[60px]">
          <div>[+] Checking target...</div>
          <div>[+] Valid target provided!</div>
          <div>[+] Checking if the target is up...</div>
          <div className="animate-pulse">_</div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
    </div>
  );
};

export default StartingPointNode;
