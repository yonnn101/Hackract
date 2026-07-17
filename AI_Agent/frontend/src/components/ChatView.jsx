import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import ProcessGroup from './ProcessGroup/ProcessGroup';
import Composer from './Composer';

/** Step bodies always fully expanded (no sidebar toggle). */
const EXPAND_MODE = 'all';

export default function ChatView({ messages, groups, processing, onSend, onStop, onToggleGroup, onStepClick }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, groups]);

  const groupByMsgIndex = {};
  const unassignedGroups = [];

  groups.forEach(g => {
    if (g.msgIndex !== undefined && messages[g.msgIndex]?.role === 'user') {
      groupByMsgIndex[g.msgIndex] = g;
    } else {
      unassignedGroups.push(g);
    }
  });

  const items = [];
  let unassignedIdx = 0;

  messages.forEach((m, i) => {
    items.push(<MessageBubble key={`m-${i}`} role={m.role} content={m.content} ts={m.ts} />);

    if (m.role === 'user') {
      const g = groupByMsgIndex[i] || unassignedGroups[unassignedIdx++];
      if (g) {
        items.push(
          <ProcessGroup
            key={`g-${g.id}`}
            group={g}
            expandMode={EXPAND_MODE}
            onToggle={() => onToggleGroup(g.id)}
            onStepClick={onStepClick}
          />
        );
      }
    }
  });

  for (let i = unassignedIdx; i < unassignedGroups.length; i++) {
    const g = unassignedGroups[i];
    items.push(
      <ProcessGroup
        key={`g-${g.id}`}
        group={g}
        expandMode={EXPAND_MODE}
        onToggle={() => onToggleGroup(g.id)}
        onStepClick={onStepClick}
      />
    );
  }

  return (
    <div className="chat-pane">
      <div className="chat-container" ref={scrollRef}>
        {items}
      </div>
      <Composer processing={processing} onSend={onSend} onStop={onStop} />
    </div>
  );
}
