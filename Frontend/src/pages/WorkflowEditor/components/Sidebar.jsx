import React from 'react';
import { FiPlay, FiCpu, FiFileText, FiTerminal } from 'react-icons/fi';
import { RiRobotLine } from 'react-icons/ri';

const Sidebar = ({ onAdd }) => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-16 bg-[#0b0f19] border-r border-gray-800 flex flex-col items-center py-4 gap-4 shrink-0 z-10">
      <div 
        className="w-10 h-10 rounded-lg bg-[#161a23] border border-[#00ff41]/50 flex items-center justify-center cursor-grab hover:bg-[#00ff41]/10 transition-colors active:scale-95"
        onDragStart={(event) => onDragStart(event, 'startingPoint')}
        onClick={() => onAdd && onAdd('startingPoint')}
        draggable
        title="Starting Point"
      >
        <FiPlay size={20} className="text-[#00ff41]" />
      </div>

      <div 
        className="w-10 h-10 rounded-lg bg-[#161a23] border border-[#00a3ff]/50 flex items-center justify-center cursor-grab hover:bg-[#00a3ff]/10 transition-colors active:scale-95"
        onDragStart={(event) => onDragStart(event, 'ai')}
        onClick={() => onAdd && onAdd('ai')}
        draggable
        title="AI Assistant"
      >
        <FiCpu size={20} className="text-[#00a3ff]" />
      </div>

      <div 
        className="w-10 h-10 rounded-lg bg-[#161a23] border border-[#d000ff]/50 flex items-center justify-center cursor-grab hover:bg-[#d000ff]/10 transition-colors active:scale-95"
        onDragStart={(event) => onDragStart(event, 'agent')}
        onClick={() => onAdd && onAdd('agent')}
        draggable
        title="AI Agent"
      >
        <RiRobotLine size={20} className="text-[#d000ff]" />
      </div>

      <div 
        className="w-10 h-10 rounded-lg bg-[#161a23] border border-[#ff7a00]/50 flex items-center justify-center cursor-grab hover:bg-[#ff7a00]/10 transition-colors active:scale-95"
        onDragStart={(event) => onDragStart(event, 'note')}
        onClick={() => onAdd && onAdd('note')}
        draggable
        title="Note"
      >
        <FiFileText size={20} className="text-[#ff7a00]" />
      </div>

      <div 
        className="w-10 h-10 rounded-lg bg-[#161a23] border border-[#ffb000]/50 flex items-center justify-center cursor-grab hover:bg-[#ffb000]/10 transition-colors active:scale-95"
        onDragStart={(event) => onDragStart(event, 'terminal')}
        onClick={() => onAdd && onAdd('terminal')}
        draggable
        title="Terminal"
      >
        <FiTerminal size={20} className="text-[#ffb000]" />
      </div>
    </div>
  );
};

export default Sidebar;


