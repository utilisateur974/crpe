export function ProgressBar({ value, label = 'Progression', tone = 'sage' }: { value: number; label?: string; tone?: string }) {
  return <div className={`progress-track ${tone}`} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
}
