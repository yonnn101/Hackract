import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/authContext.jsx';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

/**
 * useWorkflowSocket — Real-time collaboration hook for the WorkflowEditor.
 *
 * Key design decisions:
 *  - Remote node/edge changes are delivered as PATCH events (only changed node positions)
 *    via `workflow-patch`, so we never blindly overwrite the whole local node array.
 *  - The hook exposes `applyRemotePatch` so WorkflowEditor can merge remote positions
 *    into the React Flow state without disrupting local drag interactions.
 *  - Cursor data includes `color` so remote cursors render with the correct user color.
 */
export const useWorkflowSocket = (workflowId) => {
  const { user: authUser } = useAuth();

  // ── Stable local user identity (color stays constant across renders) ──────
  const localUserRef = useRef({
    id: authUser?._id || authUser?.id || `anon_${Math.floor(Math.random() * 9000) + 1000}`,
    name: authUser?.name || authUser?.username || `Hacker_${Math.floor(Math.random() * 9000) + 1000}`,
    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`,
  });

  // Update identity when auth resolves
  useEffect(() => {
    if (authUser) {
      localUserRef.current = {
        ...localUserRef.current,
        id: authUser._id || authUser.id || localUserRef.current.id,
        name: authUser.name || authUser.fullName || authUser.username || localUserRef.current.name,
      };
    }
  }, [authUser]);

  const [socket, setSocket] = useState(null);
  const [collaborators, setCollaborators] = useState({});   // { socketId: { id, user, color } }
  const [cursors, setCursors] = useState({});               // { socketId: { x, y, user, color } }
  const [activeNodes, setActiveNodes] = useState({});       // { nodeId: { socketId: { user, color } } }

  // Patch queue delivered from remote peers: array of { nodes?, edges? } deltas
  // WorkflowEditor reads and clears this each render frame.
  const [remotePatch, setRemotePatch] = useState(null);

  // Live history events for the HistorySidebar
  const [liveHistoryEvents, setLiveHistoryEvents] = useState([]);

  // ── Connect ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!workflowId) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],   // skip polling for lower latency
      withCredentials: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    setSocket(newSocket);

    const me = localUserRef.current;

    // Join room — pass full user object so backend stores color
    newSocket.emit('join-workflow', {
      workflowId,
      user: me.name,
      color: me.color,
      userId: me.id,
    });

    // ── Presence events ──────────────────────────────────────────────────────
    newSocket.on('collaborators-list', (list) => {
      const map = {};
      list.forEach(c => { map[c.id] = c; });
      setCollaborators(map);
    });

    newSocket.on('user-joined', (data) => {
      setCollaborators(prev => ({ ...prev, [data.id]: data }));
    });

    newSocket.on('user-left', ({ id }) => {
      setCollaborators(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setCursors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setActiveNodes(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(nodeId => {
          if (next[nodeId][id]) {
            const users = { ...next[nodeId] };
            delete users[id];
            next[nodeId] = Object.keys(users).length ? users : undefined;
            if (!next[nodeId]) delete next[nodeId];
          }
        });
        return next;
      });
    });

    // ── Graph patch from remote peer ─────────────────────────────────────────
    // `workflow-updated` now carries a PATCH: only the positions/edges that changed,
    // not the full node list. WorkflowEditor merges this into its own state.
    newSocket.on('workflow-updated', (data) => {
      // data: { nodes?: PositionPatch[], edges?: Edge[], senderId? }
      // Ignore echoes of our own changes (backend already does socket.to(), but
      // double-check in case of race conditions).
      if (data.senderId === newSocket.id) return;
      setRemotePatch(data);
    });

    // ── Cursor events ────────────────────────────────────────────────────────
    newSocket.on('cursor-updated', (data) => {
      // data: { workflowId, x, y, user, color, socketId }
      if (data.socketId === newSocket.id) return;
      setCursors(prev => ({
        ...prev,
        [data.socketId]: { x: data.x, y: data.y, user: data.user, color: data.color },
      }));
    });

    // ── Node focus ───────────────────────────────────────────────────────────
    newSocket.on('node-focused', (data) => {
      setActiveNodes(prev => {
        const next = { ...prev };

        // Remove this peer from whichever node they were on before
        Object.keys(next).forEach(nodeId => {
          if (next[nodeId]?.[data.socketId]) {
            const users = { ...next[nodeId] };
            delete users[data.socketId];
            if (Object.keys(users).length === 0) delete next[nodeId];
            else next[nodeId] = users;
          }
        });

        // Register on new node (null nodeId means user deselected)
        if (data.nodeId) {
          next[data.nodeId] = {
            ...(next[data.nodeId] || {}),
            [data.socketId]: { user: data.user, color: data.color },
          };
        }

        return next;
      });
    });

    // ── History events ───────────────────────────────────────────────────────
    newSocket.on('history-event', (record) => {
      setLiveHistoryEvents(prev => [record, ...prev]);
    });

    return () => {
      newSocket.emit('leave-workflow', workflowId);
      newSocket.disconnect();
      setSocket(null);
    };
  }, [workflowId]);

  // ── Emit helpers ──────────────────────────────────────────────────────────

  /**
   * Broadcast a graph change to all peers.
   * @param {Node[]} nodes  - full current nodes array
   * @param {Edge[]} edges  - full current edges array
   */
  const emitWorkflowChange = useCallback((nodes, edges) => {
    if (!socket?.connected) return;
    socket.emit('workflow-change', {
      workflowId,
      nodes,
      edges,
      senderId: socket.id,   // so receivers can ignore their own echo
    });
  }, [socket, workflowId]);

  /**
   * Broadcast cursor position. Include color so remote cursors render correctly.
   */
  const emitCursorMove = useCallback((x, y, userObj) => {
    if (!socket?.connected) return;
    socket.emit('cursor-move', {
      workflowId,
      x,
      y,
      user: userObj.name,
      color: userObj.color,
    });
  }, [socket, workflowId]);

  /**
   * Broadcast which node this user has selected/focused.
   */
  const emitNodeFocus = useCallback((nodeId, user, color) => {
    if (!socket?.connected) return;
    socket.emit('node-focus', { workflowId, nodeId, user, color });
  }, [socket, workflowId]);

  /**
   * Consume and clear the latest remote patch. Call from WorkflowEditor's useEffect.
   */
  const consumeRemotePatch = useCallback(() => {
    const patch = remotePatch;
    setRemotePatch(null);
    return patch;
  }, [remotePatch]);

  /**
   * Broadcast a history log event to peers.
   */
  const emitHistoryEvent = useCallback((record, replacesId = null) => {
    console.log(`[HISTORY][STATE] ${replacesId ? 'Replacing' : 'Adding'} event:`, record.id);
    setLiveHistoryEvents(prev => {
      console.log('[HISTORY][STATE] Prev length:', prev.length);
      if (replacesId) {
        return prev.map(e => e.id === replacesId ? record : e);
      }
      // Deduplicate
      if (prev.some(e => e.id === record.id)) return prev;
      const next = [record, ...prev];
      console.log('[HISTORY][STATE] New length:', next.length);
      return next;
    });

    if (!socket?.connected) return;
    socket.emit('history-event', { workflowId, record });
  }, [socket, workflowId]);

  return {
    socket,
    collaborators,
    cursors,
    activeNodes,
    remotePatch,
    liveHistoryEvents,
    consumeRemotePatch,
    emitWorkflowChange,
    emitCursorMove,
    emitNodeFocus,
    emitHistoryEvent,
    user: localUserRef.current,
  };
};

export default useWorkflowSocket;
