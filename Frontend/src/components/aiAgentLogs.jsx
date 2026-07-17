import { useEffect, useRef } from 'react';

const LEVEL_STYLES = {
  info: 'text-[#00ff88]/80',
  thinking: 'text-cyan-400/90',
  tool: 'text-amber-400/90',
  terminal: 'text-gray-300 font-mono',
  response: 'text-[#00ff88]',
  error: 'text-red-400',
};

const AiAgentLogs = ({ logs = [], className = '', autoScroll = true, emptyMessage = 'Awaiting objectives...' }) => {
  const endRef = useRef(null);

  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  return (
    <div
      className={`bg-black/50 border border-[#00ff88]/20 rounded p-2 text-[11px] font-mono overflow-y-auto ${className}`}
    >
      {logs.length === 0 ? (
        <div className="italic opacity-40 text-[#00ff88]/60">{emptyMessage}</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className={`flex gap-2 mb-0.5 ${LEVEL_STYLES[log.level] || LEVEL_STYLES.info}`}>
            <span className="opacity-40 shrink-0">[{log.time}]</span>
            <span className="whitespace-pre-wrap break-words">{log.message}</span>
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
};

export default AiAgentLogs;
