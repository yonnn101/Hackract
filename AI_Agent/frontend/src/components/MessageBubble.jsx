import AssistantMessage from './AssistantMessage';

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export default function MessageBubble({ role, content, ts }) {
  if (role === 'assistant') {
    return <AssistantMessage content={content} ts={ts} />;
  }

  return (
    <div className={`message ${role}`}>
      <div className="message-content">
        <span dangerouslySetInnerHTML={{ __html: escapeHtml(content).replace(/\n/g, '<br/>') }} />
        {ts && <div className="timestamp">{new Date(ts).toLocaleTimeString()}</div>}
      </div>
    </div>
  );
}
