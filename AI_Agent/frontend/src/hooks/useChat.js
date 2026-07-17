import { useState, useCallback, useRef, useEffect } from 'react';

function loadHistory(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function saveHistory(key, msgs) {
  try { localStorage.setItem(key, JSON.stringify(msgs)); } catch { /* full */ }
}

function saveGroups(key, groups) {
  try {
    localStorage.setItem(key, JSON.stringify(groups));
  } catch { /* quota or private mode */ }
}

const WELCOME = 'Welcome to HackrAct AI Agent — your AI-powered web application penetration tester.\nAsk me to scan websites, test for vulnerabilities, or install security tools!';

let _stepSeq = 0;
function nextStepId() { return ++_stepSeq; }

let _groupSeq = 0;
function nextGroupId() { return ++_groupSeq; }

function pruneGroups(messages, groups) {
  if (!Array.isArray(groups)) return [];
  const ok = groups.filter(
    g => g && typeof g.msgIndex === 'number'
      && g.msgIndex >= 0
      && g.msgIndex < messages.length
      && messages[g.msgIndex]?.role === 'user',
  );
  const byIdx = {};
  for (const g of ok) byIdx[g.msgIndex] = g;
  return Object.values(byIdx).sort((a, b) => a.msgIndex - b.msgIndex);
}

function loadInitialState(storageKey, groupsKey) {
  let msgs = loadHistory(storageKey);
  if (!msgs.length) {
    msgs = [{ role: 'system', content: WELCOME, ts: Date.now() }];
    saveHistory(storageKey, msgs);
  }
  let grps = [];
  try {
    grps = JSON.parse(localStorage.getItem(groupsKey) || '[]');
  } catch { /* */ }
  grps = pruneGroups(msgs, grps);
  return { messages: msgs, groups: grps };
}

export default function useChat(sessionId) {
  const storageKey = 'hackract_chat_' + sessionId;
  const groupsKey = 'hackract_groups_' + sessionId;

  const initialRef = useRef(null);
  if (initialRef.current === null) {
    initialRef.current = loadInitialState(storageKey, groupsKey);
  }

  const [messages, setMessages] = useState(() => initialRef.current.messages);
  const [groups, setGroups] = useState(() => initialRef.current.groups);
  const [processing, setProcessing] = useState(false);
  const activeGroupRef = useRef(null);

  useEffect(() => {
    saveGroups(groupsKey, groups);
  }, [groups, groupsKey]);

  const addMessage = useCallback((role, content) => {
    const msg = { role, content, ts: Date.now() };
    setMessages(prev => {
      const next = [...prev, msg];
      saveHistory(storageKey, next);
      return next;
    });
  }, [storageKey]);

  /**
   * Atomically append user message and create a process group with the correct msgIndex.
   * Avoids race with msgCountRef / batched updates (fixes "only first message" process groups).
   */
  const submitUserMessage = useCallback((userMsg) => {
    let msgIndex = 0;
    setMessages(prev => {
      msgIndex = prev.length;
      const msg = { role: 'user', content: userMsg, ts: Date.now() };
      const next = [...prev, msg];
      saveHistory(storageKey, next);
      return next;
    });

    setProcessing(true);
    const group = {
      id: nextGroupId(),
      msgIndex,
      title: userMsg.replace(/\s+/g, ' ').trim().slice(0, 72),
      startTime: Date.now(),
      badge: 'GEN',
      collapsed: false,
      completed: false,
      thinkingSteps: [],
      toolSteps: [],
    };
    activeGroupRef.current = group.id;
    setGroups(prev => [...prev, group]);
    return group.id;
  }, [storageKey]);

  const updateGroup = useCallback((fn) => {
    const gid = activeGroupRef.current;
    if (!gid) return;
    setGroups(prev => prev.map(g => g.id === gid ? fn(g) : g));
  }, []);

  const finalizeGroup = useCallback((fn) => {
    const gid = activeGroupRef.current;
    activeGroupRef.current = null;
    if (!gid) return;
    setGroups(prev => prev.map(g => g.id === gid ? fn(g) : g));
  }, []);

  const handleWsMessage = useCallback((data) => {
    const { type, content = '', meta = {} } = data;
    const iter = meta.iteration ?? 0;

    if (type === 'response') {
      addMessage('assistant', content);
      // Keep body expanded so users can read the full run (thinking + tools).
      finalizeGroup(g => ({ ...g, badge: 'END', collapsed: false, completed: true }));
      setProcessing(false);
      return;
    }

    if (type === 'error') {
      addMessage('system', `Error: ${content}`);
      finalizeGroup(g => ({ ...g, badge: 'END', collapsed: false, completed: true }));
      setProcessing(false);
      return;
    }

    if (type === 'status') {
      if (content && content !== 'Processing...') {
        updateGroup(g => ({
          ...g,
          thinkingSteps: [...g.thinkingSteps, { type: 'utility', content, meta, id: nextStepId() }],
        }));
      }
      return;
    }

    if (type === 'thinking' || type === 'llm_start') {
      updateGroup(g => {
        const steps = [...g.thinkingSteps];
        const existing = steps.findIndex(s => s.type === 'gen' && s.iteration === iter);
        if (existing >= 0) {
          steps[existing] = { ...steps[existing], content, meta: { ...steps[existing].meta, ...meta } };
        } else {
          steps.push({ type: 'gen', iteration: iter, content, meta, id: nextStepId() });
        }
        return { ...g, badge: 'GEN', thinkingSteps: steps };
      });
      return;
    }

    if (type === 'thought') {
      updateGroup(g => {
        const steps = [...g.thinkingSteps];
        const genIdx = steps.findIndex(s => s.type === 'gen' && s.iteration === iter);
        if (genIdx >= 0) {
          steps[genIdx] = { ...steps[genIdx], content: 'Response received \u2014 see reasoning below.', meta: { ...steps[genIdx].meta, ...meta } };
        }
        steps.push({ type: 'reason', content, meta, id: nextStepId() });
        return { ...g, thinkingSteps: steps };
      });
      return;
    }

    if (type === 'tool') {
      const toolName = meta.tool_name || content.replace(/^Executing tool:\s*/i, '').trim();
      const argsStr = meta.tool_args != null ? JSON.stringify(meta.tool_args, null, 2) : '';
      const cmd = '$ ' + (toolName || 'tool');
      const block = argsStr ? cmd + '\n' + argsStr : cmd;
      updateGroup(g => ({
        ...g,
        badge: 'EXE',
        toolSteps: [...g.toolSteps, { type: 'exe', command: block, output: '', meta, id: nextStepId() }],
      }));
      return;
    }

    if (type === 'terminal_stream') {
      updateGroup(g => {
        const steps = [...g.toolSteps];
        if (steps.length === 0) return g;
        const last = { ...steps[steps.length - 1] };
        if (meta.stderr) {
          last.output += '\x1bSTDERR' + content;
        } else {
          last.output += content;
        }
        steps[steps.length - 1] = last;
        return { ...g, toolSteps: steps };
      });
      return;
    }

    if (type === 'tool_output') {
      const out = content.replace(/^Tool Output:\s*\n?/, '');
      updateGroup(g => {
        const steps = [...g.toolSteps];
        if (steps.length === 0) return g;
        const last = { ...steps[steps.length - 1] };
        last.output += '\n\n' + out;
        steps[steps.length - 1] = last;
        return { ...g, toolSteps: steps };
      });
      return;
    }
  }, [addMessage, updateGroup, finalizeGroup]);

  const toggleGroupCollapsed = useCallback((gid) => {
    setGroups(prev => prev.map(g => g.id === gid ? { ...g, collapsed: !g.collapsed } : g));
  }, []);

  const clearChat = useCallback(() => {
    const init = [{ role: 'system', content: WELCOME, ts: Date.now() }];
    setMessages(init);
    setGroups([]);
    saveHistory(storageKey, init);
    try { localStorage.removeItem(groupsKey); } catch { /* */ }
    activeGroupRef.current = null;
    setProcessing(false);
  }, [storageKey, groupsKey]);

  return {
    messages,
    groups,
    processing,
    addMessage,
    submitUserMessage,
    handleWsMessage,
    toggleGroupCollapsed,
    clearChat,
    setProcessing,
  };
}
