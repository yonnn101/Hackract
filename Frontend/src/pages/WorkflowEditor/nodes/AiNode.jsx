import { Handle, Position, useStore, NodeResizer } from '@xyflow/react';
import { FiAlertCircle, FiCornerUpLeft, FiCpu, FiLoader, FiSend, FiX } from 'react-icons/fi';
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateWorkflowAssistantResponse } from '../../../api/assistantApi';
import {
  buildWorkflowAssistantPrompt,
  buildWorkflowNodeContextLines,
  extractConnectedNodeContext,
  formatWorkflowAssistantError,
} from '../utils/aiNodePrompt';

const makeMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeMessages = (messages) => {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((message) => {
      if (!message || typeof message !== 'object') return null;

      return {
        id: message.id || makeMessageId(),
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: String(message.content || '').trim(),
        source: message.source || '',
        repliedNodes: Array.isArray(message.repliedNodes) ? message.repliedNodes : [],
      };
    })
    .filter((message) => message && message.content);
};

const AiNode = ({ id, data, selected }) => {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState(data.draft ?? data.prompt ?? '');
  const [panelWidth, setPanelWidth] = useState(Number(data.panelWidth) || 360);
  const [messages, setMessages] = useState(() => normalizeMessages(data.messages));
  const [status, setStatus] = useState(data.status || 'idle');
  const [response, setResponse] = useState(data.response || '');
  const [errorMessage, setErrorMessage] = useState(data.error || '');
  const scrollRef = useRef(null);

  const activeUsers = Object.values(data.activeUsers || {});
  const showPresence = activeUsers.length > 0;

  useEffect(() => {
    setMessages(normalizeMessages(data.messages));
  }, [data.messages]);

  useEffect(() => {
    setDraft(data.draft ?? data.prompt ?? '');
  }, [data.draft, data.prompt]);

  useEffect(() => {
    const nextWidth = Number(data.panelWidth) || 360;
    setPanelWidth(Math.max(320, Math.min(640, nextWidth)));
  }, [data.panelWidth]);

  useEffect(() => {
    setStatus(data.status || 'idle');
    setResponse(data.response || '');
    setErrorMessage(data.error || '');
  }, [data.status, data.response, data.error]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const connectedNodeContexts = useMemo(() => {
    const incomingEdges = edges
      .filter((edge) => edge.target === id)
      .sort((left, right) => {
        const leftSource = String(left.source || '');
        const rightSource = String(right.source || '');

        if (leftSource !== rightSource) {
          return leftSource.localeCompare(rightSource);
        }

        return String(left.id || '').localeCompare(String(right.id || ''));
      });

    return incomingEdges
      .map((edge, index) => extractConnectedNodeContext(nodes.find((node) => node.id === edge.source), index, edge.id))
      .filter(Boolean);
  }, [edges, id, nodes]);

  const contextPreview = useMemo(() => buildWorkflowNodeContextLines(connectedNodeContexts), [connectedNodeContexts]);

  const repliedNodeLabels = useMemo(() => {
    const uniqueLabels = new Set();
    connectedNodeContexts.forEach((context) => {
      if (context?.sourceLabel) {
        uniqueLabels.add(context.sourceLabel);
      }
    });

    return Array.from(uniqueLabels).sort((left, right) => left.localeCompare(right));
  }, [connectedNodeContexts]);

  const persistMessages = (nextMessages, extraData = {}) => {
    const cleanedMessages = normalizeMessages(nextMessages);
    setMessages(cleanedMessages);

    if (data.onDataChange) {
      data.onDataChange({
        messages: cleanedMessages,
        draft: extraData.draft ?? draft,
        prompt: extraData.prompt ?? extraData.draft ?? draft,
        ...extraData,
      });
    }
  };

  const handleAsk = async () => {
    const typedDraft = draft.trim();
    const hasConnectedInput = connectedNodeContexts.length > 0;

    if (!typedDraft && !hasConnectedInput) {
      return;
    }

    const composedPrompt = buildWorkflowAssistantPrompt({
      userPrompt: typedDraft,
      contexts: connectedNodeContexts,
    });
    const userMessage = {
      id: makeMessageId(),
      role: 'user',
      content: typedDraft || 'Using connected node context.',
      source: typedDraft ? 'You + connected nodes' : 'Connected nodes',
      repliedNodes: repliedNodeLabels,
    };
    const nextMessages = [...messages, userMessage];

    setStatus('loading');
    setErrorMessage('');
    setResponse('');
    persistMessages(nextMessages, {
      draft: '',
      prompt: typedDraft,
      status: 'loading',
      error: '',
      response: '',
      context: contextPreview.join('\n\n'),
      sourceNodes: connectedNodeContexts,
    });
    setDraft('');
    setIsLoading(true);

    try {
      const assistantResult = await generateWorkflowAssistantResponse({
        prompt: typedDraft,
        context: contextPreview.join('\n\n'),
        sourceNodes: connectedNodeContexts,
        model: data.model,
        assistantId: data.assistantId,
        timeoutMs: connectedNodeContexts.length > 0 ? 45000 : 25000,
      });

      const assistantText = String(assistantResult.response || assistantResult.content || '').trim();
      const assistantMessage = {
        id: makeMessageId(),
        role: 'assistant',
        content: assistantText || 'No response returned from the AI assistant.',
        source: 'AI Assistant',
      };

      setStatus('success');
      setResponse(assistantMessage.content);
      persistMessages([...nextMessages, assistantMessage], {
        status: 'success',
        error: '',
        response: assistantMessage.content,
        prompt: typedDraft,
        context: contextPreview.join('\n\n'),
        sourceNodes: connectedNodeContexts,
      });
    } catch (err) {
      const friendlyMessage = formatWorkflowAssistantError(err);
      console.error('Error calling AI assistant:', err);
      setStatus('error');
      setErrorMessage(friendlyMessage);
      persistMessages([
        ...nextMessages,
        {
          id: makeMessageId(),
          role: 'assistant',
          content: friendlyMessage,
          source: 'AI Assistant',
          isError: true,
        },
      ], {
        draft: '',
        status: 'error',
        error: friendlyMessage,
        response: '',
        prompt: typedDraft,
        context: contextPreview.join('\n\n'),
        sourceNodes: connectedNodeContexts,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraftKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAsk();
    }
  };

  return (
    <div
      className={`bg-[#0b0f19] border rounded-lg font-mono text-sm transition-all relative flex flex-col h-full min-w-[240px] min-h-[180px] ${
        selected || showPresence
          ? 'border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.6)]'
          : 'border-[#00ff88]/50 shadow-[0_0_10px_rgba(0,255,136,0.3)]'
      }`}
      style={{ width: `${panelWidth}px` }}
    >
      {/* NodeResizer — drag any edge or corner to resize */}
      <NodeResizer
        minWidth={240}
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
      <div className="p-2 flex justify-between items-center text-[#00ff88] border-b border-[#00ff88]/30 shrink-0">
        <div className="flex items-center gap-2">
          <FiCpu size={16} />
          <span className="font-bold text-xs uppercase tracking-tighter">AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-transparent border-none text-right focus:outline-none text-gray-500 text-xs placeholder-gray-700 w-[100px]"
            placeholder="Task name..."
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

      {/* Body */}
      <div className="p-3 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Width</label>
          <input
            type="range"
            min={320}
            max={640}
            step={10}
            value={panelWidth}
            onChange={(event) => {
              const nextWidth = Number(event.target.value) || 360;
              setPanelWidth(nextWidth);
              data.onDataChange && data.onDataChange({ panelWidth: nextWidth });
            }}
            className="flex-1 accent-[#00ff88]"
          />
          <span className="text-[10px] text-gray-500 w-10 text-right">{panelWidth}px</span>
        </div>

        {/* Upstream nodes indicator */}
        <div className="rounded-lg border border-[#00ff88]/15 bg-black/40 p-2">
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em] text-gray-500">
            <span className="flex items-center gap-1.5">
              <FiAlertCircle size={10} className="text-[#00ff88]" />
              Upstream nodes
            </span>
            <span>{connectedNodeContexts.length}</span>
          </div>
        </div>

        {/* Chat History */}
        <div ref={scrollRef} className="bg-black/60 border border-gray-800 rounded-lg p-2 max-h-72 overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <div className="text-gray-600 text-xs leading-relaxed">
              Assistant output and chat history will appear here. Connect upstream nodes or type a message below.
            </div>
          ) : (
            messages.map((message) => {
              const isAssistant = message.role === 'assistant';
              const hasReplySources = !isAssistant && Array.isArray(message.repliedNodes) && message.repliedNodes.length > 0;

              return (
                <div key={message.id} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${isAssistant ? 'bg-[#10251d] text-[#d9ffe8] border border-[#00ff88]/30' : 'bg-[#1a1f2c] text-gray-100 border border-gray-700'}`}>
                    <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-gray-500">
                      {message.source || (isAssistant ? 'AI Assistant' : 'You')}
                    </div>
                    {hasReplySources && (
                      <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-[#00ff88]/30 bg-[#00ff88]/10 px-2 py-1 text-[10px] text-[#c9ffe2]">
                        <FiCornerUpLeft size={10} />
                        <span className="truncate">{message.repliedNodes.join(', ')}</span>
                      </div>
                    )}
                    {message.content}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="space-y-2 border-t border-[#00ff88]/10 pt-3">
          <textarea
            className="w-full min-h-24 bg-black border border-gray-800 text-gray-300 p-3 rounded-lg resize-none focus:outline-none focus:border-[#00ff88]/50"
            placeholder={connectedNodeContexts.length > 0 ? 'Ask about the connected node output...' : 'Ask something...'}
            value={draft}
            onChange={(e) => {
              const nextDraft = e.target.value;
              setDraft(nextDraft);
              setErrorMessage('');
              if (status === 'error') {
                setStatus('idle');
              }
              data.onDataChange && data.onDataChange({ draft: nextDraft, prompt: nextDraft, error: '', status: status === 'error' ? 'idle' : status });
            }}
            onKeyDown={handleDraftKeyDown}
          />

          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] text-gray-500 leading-tight">
              Connected nodes are merged into the prompt in deterministic source order.
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-[#00ff88]/50 px-3 py-2 text-[#00ff88] hover:bg-[#00ff88]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAsk}
              disabled={isLoading}
              title="Send to AI assistant"
            >
              {isLoading ? <FiLoader className="animate-spin" /> : <FiSend size={14} />}
              <span className="text-xs font-medium">{isLoading ? 'Running...' : 'Send'}</span>
            </button>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-[#00ff88] border-2 border-[#0b0f19]" />
    </div>
  );
};

export default AiNode;
