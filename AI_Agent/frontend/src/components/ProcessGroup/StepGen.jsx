export default function StepGen({ step, collapsed, onInfo }) {
  return (
    <div className="pg-step pg-step-gen">
      <div className="pg-step-connector" />
      <div className="pg-step-inner">
        <div className="pg-step-toolbar">
          <span className="pg-step-icon pg-icon-gen" aria-hidden="true">&#10022;</span>
          <span className="pg-step-kind">LLM generation</span>
          <span className="pg-step-tag">GEN</span>
          <button className="pg-info-btn" onClick={() => onInfo(step)} title="Step details">&#9432;</button>
        </div>
        <div className={`pg-step-body${collapsed ? ' pg-step-body-collapsed' : ''}`}>
          <pre className="pg-gen-stream">{step.content || 'Calling LLM\u2026'}</pre>
        </div>
      </div>
    </div>
  );
}
