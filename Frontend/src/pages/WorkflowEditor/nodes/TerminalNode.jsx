import React, { useEffect, useRef } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { FiTerminal, FiX } from 'react-icons/fi';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { SerializeAddon } from '@xterm/addon-serialize';
import '@xterm/xterm/css/xterm.css';
import { useTerminalSocket } from '../../../hooks/useTerminalSocket';

const TerminalNode = ({ data, selected }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const transcriptRef = useRef(String(data.terminalTranscript || data.output || '').trim());
  const inputBufferRef = useRef(String(data.terminalInput || '').trim());
  const activeUsers = Object.values(data.activeUsers || {});
  const showPresence = activeUsers.length > 0;

  const { sendInput, sendResize, setOnOutput, isConnected } = useTerminalSocket(data.workflowId);

  useEffect(() => {
    transcriptRef.current = String(data.terminalTranscript || data.output || '').trim();
    inputBufferRef.current = String(data.terminalInput || '').trim();
  }, [data.terminalTranscript, data.output, data.terminalInput]);

  const publishTerminalState = (patch) => {
    if (data.onDataChange) {
      data.onDataChange(patch);
    }
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 11,
      fontFamily: '"Fira Code", monospace',
      theme: {
        background: '#000000',
        foreground: '#00ff88',
        cursor: '#00ff88',
        selectionBackground: 'rgba(0, 255, 136, 0.3)',
      },
      allowProposedApi: true,
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const unicode11Addon = new Unicode11Addon();
    const serializeAddon = new SerializeAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(unicode11Addon);
    term.loadAddon(serializeAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle user input
    term.onData((data) => {
      if (data === '\r') {
        const command = inputBufferRef.current.trim();
        if (command) {
          transcriptRef.current = transcriptRef.current
            ? `${transcriptRef.current}\n${command}`
            : command;

          publishTerminalState({
            terminalInput: '',
            terminalTranscript: transcriptRef.current,
            output: transcriptRef.current,
            outputLines: transcriptRef.current.split(/\r?\n/).filter(Boolean),
          });
        }

        inputBufferRef.current = '';
      } else if (data === '\u007f' || data === '\b') {
        inputBufferRef.current = inputBufferRef.current.slice(0, -1);
        publishTerminalState({ terminalInput: inputBufferRef.current });
      } else if (/^[\x20-\x7E]$/.test(data)) {
        inputBufferRef.current = `${inputBufferRef.current}${data}`;
        publishTerminalState({ terminalInput: inputBufferRef.current });
      }

      sendInput(data);
    });

    // Handle backend output
    setOnOutput((data) => {
      const plainText = String(data || '');
      transcriptRef.current = transcriptRef.current
        ? `${transcriptRef.current}\n${plainText}`
        : plainText;

      publishTerminalState({
        terminalTranscript: transcriptRef.current,
        output: transcriptRef.current,
        outputLines: transcriptRef.current.split(/\r?\n/).filter(Boolean),
      });

      term.write(data);
    });
    term.onData((data) => { sendInput(data); });
    setOnOutput((data) => { term.write(data); });

    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit();
        sendResize({ cols: term.cols, rows: term.rows });
      }
    };

    const resizeObserver = new ResizeObserver(() => { handleResize(); });
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    setTimeout(handleResize, 200);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [sendInput, sendResize, setOnOutput, data.workflowId]);

  useEffect(() => {
    if (isConnected && data.initialCommand && xtermRef.current) {
      sendInput(`${data.initialCommand}\r`);

      const nextTranscript = transcriptRef.current
        ? `${transcriptRef.current}\n${data.initialCommand}`
        : data.initialCommand;
      transcriptRef.current = nextTranscript;
      inputBufferRef.current = '';
      publishTerminalState({
        terminalInput: '',
        terminalTranscript: nextTranscript,
        output: nextTranscript,
        outputLines: nextTranscript.split(/\r?\n/).filter(Boolean),
      });

      // Clear the initialCommand in the local state so it doesn't run again on re-connects
      // We use data.onDataChange if available to update the node's permanent state
      if (data.onDataChange) {
        data.onDataChange({ initialCommand: null });
      }
    }
  }, [isConnected, data.initialCommand, sendInput, data]);

  return (
    <div
      className={`bg-[#0b0f19] border rounded-lg font-mono text-sm transition-all relative select-none flex flex-col h-full min-w-[280px] min-h-[200px] ${
        selected || showPresence
          ? 'border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.6)]'
          : 'border-[#00ff88]/50 shadow-[0_0_10px_rgba(0,255,136,0.3)]'
      }`}
    >
      {/* NodeResizer — drag any edge or corner to resize */}
      <NodeResizer
        minWidth={280}
        minHeight={200}
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
      <div className="p-2 flex justify-between items-center text-[#00ff88] border-b border-[#00ff88]/30 bg-[#161a23] rounded-t-lg shrink-0">
        <div className="flex items-center gap-2">
          <FiTerminal size={16} />
          <span className="font-bold text-xs uppercase tracking-tighter">Terminal</span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ff88] shadow-[0_0_5px_#00ff88]' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-[9px] font-black tracking-widest opacity-60">
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-transparent border-none text-right focus:outline-none text-gray-500 text-xs placeholder-gray-700 w-[120px] select-text"
            placeholder="Process title..."
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

      {/* Terminal area — fills remaining height */}
      <div className="p-3 flex-1 flex flex-col">
        <div
          className="flex-1 bg-black border border-[#00ff88]/30 rounded overflow-hidden shadow-inner select-text"
          ref={terminalRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
    </div>
  );
};

export default TerminalNode;
