const NODE_TYPE_LABELS = {
  startingPoint: 'Starting Point',
  note: 'Note',
  ai: 'AI',
  agent: 'AI Agent',
  terminal: 'Terminal',
};

export function buildActionMessage(action, details = {}) {
  const hasLabel = typeof details.label === 'string' && details.label.trim().length > 0;
  const hasType = typeof details.type === 'string' && details.type.length > 0;

  const nodeLabelByType = hasType ? `a ${NODE_TYPE_LABELS[details.type] || details.type} node` : 'a node';
  const nodeLabel = hasLabel ? `"${details.label.trim()}"` : nodeLabelByType;

  const messages = {
    ADD_NODE: hasLabel ? `Added node ${nodeLabel}` : `Added ${nodeLabel}`,
    DELETE_NODE: hasLabel ? `Deleted node ${nodeLabel}` : `Deleted ${nodeLabel}`,
    MOVE_NODE: `Moved ${nodeLabel}`,
    UPDATE_TITLE: `Renamed node to "${details.newTitle || 'Untitled'}"`,
    CONNECT_NODES: `Connected two nodes`,
    DELETE_EDGE: `Removed a connection`,
    LINK_FINDING: `Finding  ${nodeLabel}`,
    GRAPH_CHANGED: `Updated the canvas`,
    AGENT_RAN: `Ran the "${details.agentName || 'AI'}" agent`,
    TERMINAL_EXEC: `Executed command in Terminal`,
  };

  return messages[action] || action.replace(/_/g, ' ').toLowerCase();
}
