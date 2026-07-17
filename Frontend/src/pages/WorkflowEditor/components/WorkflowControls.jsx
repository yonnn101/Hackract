import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { FiPlus, FiMinus, FiMaximize, FiLock, FiUnlock } from 'react-icons/fi';

const WorkflowControls = ({ isLocked, onToggleLock, disabled }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const buttonClass = "w-10 h-10 flex items-center justify-center bg-[#161a23] border border-gray-800 text-gray-400 hover:text-[#00ff88] hover:border-[#00ff88]/50 hover:bg-[#00ff88]/10 transition-all duration-200 shadow-lg first:rounded-t-lg last:rounded-b-lg border-b-0 last:border-b";

  return (
    <div className="flex flex-col z-50 overflow-hidden rounded-lg shadow-2xl">
      <button
        onClick={() => zoomIn()}
        className={buttonClass}
        title="Zoom In"
      >
        <FiPlus size={18} />
      </button>
      <button
        onClick={() => zoomOut()}
        className={buttonClass}
        title="Zoom Out"
      >
        <FiMinus size={18} />
      </button>
      <button
        onClick={() => fitView({ duration: 800 })}
        className={buttonClass}
        title="Fit View"
      >
        <FiMaximize size={18} />
      </button>
      <button
        onClick={onToggleLock}
        disabled={disabled}
        className={`${buttonClass} ${isLocked ? 'text-[#00ff88] border-[#00ff88]/50 bg-[#00ff88]/10' : ''} ${disabled ? 'opacity-30 cursor-not-allowed text-gray-700' : ''}`}
        title={disabled ? "Edit access restricted" : (isLocked ? "Unlock Editor" : "Lock Editor")}
      >
        {isLocked ? <FiLock size={18} /> : <FiUnlock size={18} />}
      </button>
    </div>
  );
};

export default WorkflowControls;
