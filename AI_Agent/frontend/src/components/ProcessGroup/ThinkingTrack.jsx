import StepGen from './StepGen';
import StepReason from './StepReason';
import StepUtility from './StepUtility';

function shouldCollapse(step, idx, total, expandMode) {
  if (expandMode === 'all') return false;
  if (expandMode === 'collapsed') return true;
  if (step.type === 'gen' || step.type === 'reason') return false;
  return idx < total - 1;
}

export default function ThinkingTrack({ steps, expandMode, onStepClick }) {
  if (!steps.length) return <div className="pg-steps" style={{ padding: '.5rem .75rem', color: 'var(--text-muted)', fontSize: '.75rem' }}>Waiting for LLM...</div>;
  return (
    <div className="pg-steps">
      {steps.map((s, i) => {
        const collapsed = shouldCollapse(s, i, steps.length, expandMode);
        if (s.type === 'gen') return <StepGen key={s.id} step={s} collapsed={collapsed} onInfo={onStepClick} />;
        if (s.type === 'reason') return <StepReason key={s.id} step={s} collapsed={collapsed} onInfo={onStepClick} />;
        return <StepUtility key={s.id} step={s} onInfo={onStepClick} />;
      })}
    </div>
  );
}
