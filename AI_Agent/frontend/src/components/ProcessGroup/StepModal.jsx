import { useState, useEffect, useRef, useCallback } from 'react';

function formatStepType(t) {
  const m = { gen: 'LLM generation', reason: 'Reasoning', exe: 'Execution', utility: 'Status' };
  return m[t] || t || 'Step';
}

function formatForCopy(step) {
  const lines = ['Type: ' + (step.type || 'unknown')];
  const meta = step.meta || {};
  if (meta.tool_name) lines.push('Tool: ' + meta.tool_name);
  if (meta.iteration != null) lines.push('Iteration: ' + meta.iteration);
  if (meta.chat_model) lines.push('Model: ' + meta.chat_model);
  if (meta.tool_args != null) { lines.push(''); lines.push('--- Parameters ---'); lines.push(JSON.stringify(meta.tool_args, null, 2)); }
  lines.push(''); lines.push('--- Content ---');
  lines.push(step.content || step.command || '');
  if (step.output) lines.push(step.output);
  return lines.join('\n');
}

function primaryContent(step) {
  return step.content || step.command || '';
}

export default function StepModal({ step, onClose }) {
  const [raw, setRaw] = useState(false);
  const [toast, setToast] = useState('');
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const flash = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(''), 2000);
  }, []);

  const copy = useCallback((text, label) => {
    navigator.clipboard.writeText(text).then(() => flash(label || 'Copied'), () => flash('Copy failed'));
  }, [flash]);

  if (!step) return null;
  const meta = step.meta || {};
  const full = { type: step.type, content: step.content, command: step.command, output: step.output, meta };
  const stats = [];
  if (meta.iteration != null) stats.push('Iteration: ' + meta.iteration);
  if (meta.chat_model) stats.push('Model: ' + meta.chat_model);
  if (meta.temperature != null) stats.push('Temperature: ' + meta.temperature);
  if (meta.max_tokens != null) stats.push('Max tokens: ' + meta.max_tokens);

  return (
    <div className="pg-modal-overlay" onClick={onClose}>
      <div className="pg-modal-backdrop" />
      <div className="pg-modal-panel" onClick={e => e.stopPropagation()}>
        <div className="pg-modal-header">
          <div className="pg-modal-header-main">
            <h3>Step details</h3>
            <div className="pg-modal-badges">
              <span className="pg-modal-badge">{formatStepType(step.type)}</span>
              {meta.tool_name && <span className="pg-modal-badge pg-modal-badge-mono">{meta.tool_name}</span>}
            </div>
          </div>
          <div className="pg-modal-actions">
            <button className="pg-modal-action-btn" onClick={() => copy(formatForCopy(step), 'Copied all')}>Copy all</button>
            <button className="pg-modal-action-btn" onClick={() => copy(primaryContent(step), 'Copied content')}>Content</button>
            <button className={`pg-modal-action-btn${raw ? ' active' : ''}`} onClick={() => setRaw(!raw)}>{raw ? 'Formatted' : 'Raw JSON'}</button>
            <button className="pg-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>
        <div className="pg-modal-body">
          {raw ? (
            <>
              <div className="pg-modal-section-title">Raw JSON</div>
              <pre className="pg-modal-pre">{JSON.stringify(full, null, 2)}</pre>
            </>
          ) : (
            <>
              <div className="pg-modal-section-title">Content</div>
              <pre className="pg-modal-pre">{primaryContent(step) || '(empty)'}</pre>
              {step.output && (
                <>
                  <div className="pg-modal-section-title">Output</div>
                  <pre className="pg-modal-pre">{step.output}</pre>
                </>
              )}
              {meta.tool_args != null && (
                <div className="pg-modal-kvp">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.35rem' }}>
                    <div className="pg-modal-section-title" style={{ margin: 0 }}>Call parameters</div>
                    <button className="pg-modal-action-btn" onClick={() => copy(JSON.stringify(meta.tool_args, null, 2), 'Copied params')}>Copy</button>
                  </div>
                  <pre className="pg-modal-pre">{JSON.stringify(meta.tool_args, null, 2)}</pre>
                </div>
              )}
              {stats.length > 0 && (
                <div className="pg-modal-kvp">
                  <div className="pg-modal-section-title">Model / run</div>
                  <p className="pg-modal-stats-line">{stats.join(' \u00b7 ')}</p>
                </div>
              )}
            </>
          )}
        </div>
        {toast && <div className={`pg-modal-toast${toast ? ' visible' : ''}`}>{toast}</div>}
      </div>
    </div>
  );
}
