export default function StepReason({ step, collapsed, onInfo }) {
  return (
    <div className="pg-step pg-step-reason">
      <div className="pg-step-connector" />
      <div className="pg-step-inner">
        <div className="pg-step-toolbar">
          <span className="pg-step-icon pg-icon-reason" aria-hidden="true">&#128173;</span>
          <span className="pg-step-kind">Reasoning</span>
          <span className="pg-step-tag" style={{ opacity: 0.85 }}>INT</span>
          <button className="pg-info-btn" onClick={() => onInfo(step)} title="Step details">&#9432;</button>
        </div>
        <div className={`pg-step-body${collapsed ? ' pg-step-body-collapsed' : ''}`}>
          <div className="pg-reason-bubble">{step.content}</div>
        </div>
      </div>
    </div>
  );
}
