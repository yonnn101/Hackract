import { useRef, useCallback } from 'react';

function renderOutput(output) {
  if (!output) return null;
  const parts = output.split('\x1bSTDERR');
  return parts.map((chunk, i) => {
    if (i === 0) return chunk || null;
    return <span key={i} className="pg-terminal-stderr">{chunk}</span>;
  });
}

export default function StepExe({ step, collapsed, onInfo }) {
  const preRef = useRef(null);

  const copy = useCallback(() => {
    const text = preRef.current?.textContent || '';
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  return (
    <div className="pg-step pg-step-exe">
      <div className="pg-step-connector" />
      <div className="pg-step-inner">
        <div className="pg-step-toolbar">
          <span className="pg-step-icon pg-icon-exe" aria-hidden="true">&#9656;</span>
          <span className="pg-step-kind">Execution</span>
          <span className="pg-step-tag">EXE</span>
          <button className="pg-info-btn" onClick={() => onInfo(step)} title="Step details">&#9432;</button>
        </div>
        <div className={`pg-step-body${collapsed ? ' pg-step-body-collapsed' : ''}`}>
          <div className="pg-terminal">
            <div className="pg-terminal-bar">
              <span className="pg-terminal-label">terminal</span>
              <button className="pg-copy-btn" onClick={copy}>Copy</button>
            </div>
            <pre className="pg-terminal-body" ref={preRef}>
              {step.command}
              {step.output ? renderOutput(step.output) : null}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
