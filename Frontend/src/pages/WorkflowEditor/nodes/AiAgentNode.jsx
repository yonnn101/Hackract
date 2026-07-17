import { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { FiX, FiActivity, FiAlertCircle } from 'react-icons/fi';
import { RiRobotLine } from 'react-icons/ri';
import AiAgentLogs from '../../../components/aiAgentLogs';
import useScanSession from '../../../hooks/scanSession';

const AiAgentNode = ({ data, selected }) => {
  const activeUsers = Object.values(data.activeUsers || {});
  const showPresence = activeUsers.length > 0;
  const objectiveRef = useRef(data.label || '');
  const [localStatus, setLocalStatus] = useState(data.status || 'Idle');
  const [initializing, setInitializing] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [toast, setToast] = useState('');

  const handleLogsChange = useCallback((nextLogs) => {
    try {
      const prev = JSON.stringify(data.logs || []);
      const cur = JSON.stringify(nextLogs || []);
      if (prev !== cur) {
        data.onDataChange?.({ logs: nextLogs });
      }
    } catch {
      data.onDataChange?.({ logs: nextLogs });
    }
  }, [data]);

  const handleStatusChange = useCallback((status) => {
    setLocalStatus(status);
    try {
      if (data.status !== status) {
        data.onDataChange?.({ status });
      }
    } catch {
      data.onDataChange?.({ status });
    }
  }, [data]);

  const {
    sessionId,
    logs,
    status,
    processing,
    initialize,
    send,
    stop,
    loadHistory,
    error,
    setError,
  } = useScanSession({
    sessionId: data.sessionId,
    pentestId: data.pentestId,
    name: data.label || 'Workflow Agent',
    onLogsChange: handleLogsChange,
    onStatusChange: handleStatusChange,
  });

  useEffect(() => {
    if (data.sessionId) loadHistory();
  }, [data.sessionId, loadHistory]);

  useEffect(() => {
    if (!error) return undefined;
    setToast(error);
    const timer = setTimeout(() => {
      setToast('');
      setError('');
    }, 4500);
    return () => clearTimeout(timer);
  }, [error, setError]);

  const displayStatus = status || localStatus || data.status || 'Idle';
  const displayLogs = logs.length ? logs : (data.logs || []);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const id = await initialize(objectiveRef.current);
      data.onDataChange?.({
        sessionId: id,
        status: 'Running',
        agentName: data.label || 'AI Agent',
      });
      data.onAgentRan?.({ agentName: data.label || 'AI Agent', sessionId: id });
    } catch (err) {
      console.error('Agent initialize failed:', err);
      setToast(err.message || 'Failed to initialize agent');
    } finally {
      setInitializing(false);
    }
  };

  const handleStop = () => {
    stop();
    data.onDataChange?.({ status: 'Idle' });
  };

  const handleSendMessage = async () => {
    const text = draftMessage.trim();
    if (!text || processing || initializing || !data.pentestId) return;

    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        setInitializing(true);
        activeSessionId = await initialize('');
        data.onDataChange?.({
          sessionId: activeSessionId,
          status: 'Running',
          agentName: data.label || 'AI Agent',
        });
      }

      await send(text);
      setDraftMessage('');
    } catch (err) {
      console.error('Failed to send message to AI Agent:', err);
      setToast(err.message || 'Failed to send message');
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div
      className={`bg-[#0b0f19] border rounded-lg font-mono text-sm transition-all relative flex flex-col h-full min-w-[260px] min-h-[300px] ${
        selected || showPresence
          ? 'border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.6)]'
          : 'border-[#00ff88]/50 shadow-[0_0_10px_rgba(0,255,136,0.3)]'
      }`}
    >
      {/* NodeResizer — drag any edge or corner to resize */}
      <NodeResizer
        minWidth={260}
        minHeight={300}
        isVisible={selected}
        lineClassName="!border-[#00ff88]/60 hover:!border-[#00ff88]"
        handleClassName="!w-2.5 !h-2.5 !rounded-sm !bg-[#00ff88] !border-[#0b0f19] !border-2 hover:!scale-125 transition-transform"
      />

      {/* Toast error */}
      {toast && (
        <div className="absolute left-3 right-3 top-3 z-20 flex items-start gap-2 rounded-md border border-red-500/40 bg-[#2a0f14] px-2.5 py-2 text-[10px] text-red-200 shadow-lg backdrop-blur-sm">
          <FiAlertCircle className="mt-0.5 shrink-0 text-red-400" size={12} />
          <div className="min-w-0 flex-1 leading-snug">{toast}</div>
          <button
            type="button"
            className="shrink-0 text-red-300 hover:text-red-100"
            onClick={() => {
              setToast('');
              setError('');
            }}
          >
            <FiX size={12} />
          </button>
        </div>
      )}

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
      <div className="p-2 flex justify-between items-center text-[#00ff88] border-b border-[#00ff88]/30 bg-[#11231a] rounded-t-lg shrink-0">
        <div className="flex items-center gap-2">
          <RiRobotLine size={16} />
          <span className="font-bold text-xs uppercase tracking-tighter">AI Agent</span>
          {/* Live status dot — replaces the old blur/spinner overlay */}
          {(processing || initializing) && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[9px] text-amber-300 uppercase tracking-widest">
                {initializing ? 'Starting' : 'Running'}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-transparent border-none text-right focus:outline-none text-gray-500 text-xs placeholder-gray-700 w-[120px]"
            placeholder="Agent objective..."
            defaultValue={data.label || ''}
            onBlur={(e) => {
              objectiveRef.current = e.target.value;
              data.onTitleChange?.(e.target.value);
            }}
          />
          <button
            type="button"
            className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
            onClick={() => data.onDelete?.()}
          >
            <FiX size={14} />
          </button>
        </div>
      </div>

      {/* Body — flex-1 so it fills remaining height when resized */}
      <div className="p-3 flex flex-col gap-3 flex-1 overflow-hidden">
        {/* Status row */}
        <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-widest shrink-0">
          <div className="flex items-center gap-1">
            <FiActivity
              size={10}
              className={processing ? 'text-amber-400 animate-pulse' : 'text-[#00ff88]'}
            />
            <span>Status: {displayStatus}</span>
          </div>
          <span className="text-[9px] text-[#00ff88]/65">In-node chat</span>
        </div>

        {/* Logs — grows to fill space */}
        <div className="flex-1 min-h-[80px] overflow-hidden">
          <AiAgentLogs logs={displayLogs} className="h-full" />
        </div>

        {/* Chat input */}
        <div className="rounded-md border border-[#00ff88]/35 bg-[#050a0f] p-2 space-y-2 shrink-0">
          <div className="text-[9px] text-[#00ff88]/70 uppercase tracking-widest">Chat Input</div>
          <textarea
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            rows={2}
            placeholder={
              sessionId
                ? 'Ask the agent what to do next...'
                : 'Initialize or send a message to start...'
            }
            className="w-full resize-none rounded border border-[#00ff88]/25 bg-[#0a141f] px-2 py-1.5 text-[11px] text-[#d3ffe8] placeholder:text-[#66a88b] focus:outline-none focus:ring-1 focus:ring-[#00ff88]/50"
          />
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-gray-500">Enter to send · Shift+Enter newline</span>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!draftMessage.trim() || processing || initializing || !data.pentestId}
              className="border border-[#00ff88]/50 text-[#00ff88] text-[10px] font-bold px-2.5 py-1 rounded hover:bg-[#00ff88]/10 transition-all disabled:opacity-40"
            >
              {processing || initializing ? 'SENDING…' : 'SEND'}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          {processing ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex-1 border border-red-500/50 text-red-400 text-[10px] font-bold py-1.5 rounded hover:bg-red-500/10 transition-all"
            >
              STOP
            </button>
          ) : (
            <button
              type="button"
              onClick={handleInitialize}
              disabled={initializing || !data.pentestId}
              className="flex-1 bg-[#00ff88] hover:bg-[#00cc33] text-black text-[10px] font-bold py-1.5 rounded transition-all active:scale-95 shadow-[0_0_10px_rgba(0,255,136,0.4)] disabled:opacity-40"
            >
              {initializing ? 'STARTING…' : 'INITIALIZE'}
            </button>
          )}
          <button
            type="button"
            onClick={() => sessionId && loadHistory()}
            disabled={!sessionId}
            className="flex-1 border border-[#00ff88]/50 text-[#00ff88] text-[10px] font-bold py-1.5 rounded hover:bg-[#00ff88]/10 transition-all disabled:opacity-40"
          >
            REFRESH
          </button>
        </div>

        {!data.pentestId && (
          <p className="text-[9px] text-amber-500/80 shrink-0">
            Link workflow to a project to run the agent.
          </p>
        )}
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
    </div>
  );
};

export default AiAgentNode;
