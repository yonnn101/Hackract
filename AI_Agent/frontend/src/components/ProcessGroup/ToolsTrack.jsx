import StepExe from './StepExe';

function shouldCollapse(idx, total, expandMode) {
  if (expandMode === 'all') return false;
  if (expandMode === 'collapsed') return true;
  return idx < total - 1;
}

export default function ToolsTrack({ steps, expandMode, onStepClick }) {
  if (!steps.length) return <div className="pg-steps" style={{ padding: '.5rem .75rem', color: 'var(--text-muted)', fontSize: '.75rem' }}>No tool calls yet</div>;
  return (
    <div className="pg-steps">
      {steps.map((s, i) => (
        <StepExe key={s.id} step={s} collapsed={shouldCollapse(i, steps.length, expandMode)} onInfo={onStepClick} />
      ))}
    </div>
  );
}
