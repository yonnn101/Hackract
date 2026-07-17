import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiActivity } from 'react-icons/fi';
import AiAgentLogs from '../components/aiAgentLogs';
import useScanSession from '../hooks/scanSession';

const AiAgentLogsPage = () => {
  const { sessionId } = useParams();
  const {
    logs,
    status,
    processing,
    socketStatus,
    loadHistory,
    stop,
    send,
  } = useScanSession({ sessionId });

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSend = (e) => {
    e.preventDefault();
    const form = e.target;
    const input = form.elements.message;
    const text = input.value.trim();
    if (!text) return;
    send(text);
    input.value = '';
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-200 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/projects" className="flex items-center gap-2 text-[#00ff88] hover:underline text-sm">
            <FiArrowLeft size={16} />
            Back to projects
          </Link>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <FiActivity className="text-[#00ff88]" />
            <span>Status: {status}</span>
            <span>Socket: {socketStatus}</span>
            {processing && (
              <button
                type="button"
                onClick={stop}
                className="px-2 py-1 border border-red-500/50 text-red-400 rounded hover:bg-red-500/10"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#00ff88] font-mono">AI Agent Session</h1>
        <p className="text-xs text-gray-500 font-mono">{sessionId}</p>

        <AiAgentLogs logs={logs} className="h-[60vh]" />

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            name="message"
            type="text"
            placeholder="Send a message to the agent..."
            className="flex-1 bg-black/50 border border-[#00ff88]/30 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#00ff88]"
            disabled={!sessionId}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#00ff88] text-black text-sm font-bold rounded hover:bg-[#00cc33] disabled:opacity-50"
            disabled={!sessionId || processing}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiAgentLogsPage;
