export default function StepUtility({ step, onInfo }) {
  return (
    <div className="pg-step">
      <div className="pg-step-connector" />
      <div className="pg-step-inner">
        <div className="pg-utility-row">
          <span className="pg-utility-dot" />
          <span style={{ flex: 1, minWidth: 0 }}>{step.content}</span>
          <button className="pg-info-btn" onClick={() => onInfo(step)} title="Details">&#9432;</button>
        </div>
      </div>
    </div>
  );
}
