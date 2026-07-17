import { useState } from 'react';
import ThinkingTrack from './ThinkingTrack';
import ToolsTrack from './ToolsTrack';

function formatDuration(ms) {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(1) + 's';
}

function badgeClass(badge) {
  if (badge === 'END') return 'pg-badge pg-badge-end';
  if (badge === 'EXE') return 'pg-badge pg-badge-exe';
  return 'pg-badge pg-badge-gen';
}

export default function ProcessGroup({ group, expandMode, onToggle, onStepClick }) {
  const [trackView, setTrackView] = useState(() => {
    try { return localStorage.getItem('hackract_pg_track_view') || 'all'; } catch { return 'all'; }
  });
  const [thinkingMin, setThinkingMin] = useState(false);
  const [toolsMin, setToolsMin] = useState(false);

  const changeTrack = (v) => {
    setTrackView(v);
    try { localStorage.setItem('hackract_pg_track_view', v); } catch {/* */}
  };

  const elapsed = Date.now() - group.startTime;
  const totalSteps = group.thinkingSteps.length + group.toolSteps.length;
  const title = group.title ? 'Task: ' + group.title : 'Agent run';
  const nThink = group.thinkingSteps.length;
  const nTools = group.toolSteps.length;

  return (
    <div className={`pg-group${group.completed ? ' pg-completed' : ''}`}>
      <button type="button" className="pg-header-btn" onClick={onToggle}>
        <span className="pg-chevron">{group.collapsed ? '\u25B6' : '\u25BC'}</span>
        <div className="pg-header-main">
          <span className="pg-title">{title}</span>
          <div className="pg-meta">
            <span className={badgeClass(group.badge)}>{group.badge}</span>
            <time>{new Date(group.startTime).toLocaleTimeString()}</time>
            <span>{totalSteps} step{totalSteps === 1 ? '' : 's'} &middot; {formatDuration(elapsed)}</span>
          </div>
        </div>
      </button>

      {!group.collapsed && (
        <div className="pg-group-body">
          <div className="pg-track-toolbar">
            <label>View</label>
            <select className="pg-track-select" value={trackView} onChange={e => changeTrack(e.target.value)}>
              <option value="all">All: thinking + tools</option>
              <option value="thinking">Thinking only</option>
              <option value="tools">Tools only</option>
            </select>
          </div>

          <div className="pg-track-panels-scroll">
            <div className="pg-track-panels">
              {trackView !== 'tools' && (
                <section className="pg-track-panel thinking">
                  <button
                    type="button"
                    className="pg-track-panel-head pg-track-panel-toggle"
                    onClick={() => setThinkingMin(v => !v)}
                    aria-expanded={!thinkingMin}
                  >
                    <span className="pg-track-chevron" aria-hidden="true">{thinkingMin ? '\u25B6' : '\u25BC'}</span>
                    <span className="pg-track-panel-title">Thinking</span>
                    <span className="pg-track-panel-hint">LLM &middot; reasoning</span>
                    <span className="pg-track-panel-meta">{nThink} step{nThink === 1 ? '' : 's'}</span>
                    <span className="pg-track-toggle-label">{thinkingMin ? 'Expand' : 'Minimize'}</span>
                  </button>
                  {!thinkingMin && (
                    <ThinkingTrack steps={group.thinkingSteps} expandMode={expandMode} onStepClick={onStepClick} />
                  )}
                </section>
              )}

              {trackView !== 'thinking' && (
                <section className="pg-track-panel tools">
                  <button
                    type="button"
                    className="pg-track-panel-head pg-track-panel-toggle"
                    onClick={() => setToolsMin(v => !v)}
                    aria-expanded={!toolsMin}
                  >
                    <span className="pg-track-chevron" aria-hidden="true">{toolsMin ? '\u25B6' : '\u25BC'}</span>
                    <span className="pg-track-panel-title">Tool execution</span>
                    <span className="pg-track-panel-hint">Commands &middot; output</span>
                    <span className="pg-track-panel-meta">{nTools} step{nTools === 1 ? '' : 's'}</span>
                    <span className="pg-track-toggle-label">{toolsMin ? 'Expand' : 'Minimize'}</span>
                  </button>
                  {!toolsMin && (
                    <ToolsTrack steps={group.toolSteps} expandMode={expandMode} onStepClick={onStepClick} />
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
