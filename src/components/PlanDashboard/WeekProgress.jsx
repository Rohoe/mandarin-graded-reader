export default function WeekProgress({ completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="week-progress" title={`${completed}/${total} activities`}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle
          className="week-progress__bg"
          cx="26" cy="26" r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="3"
        />
        <circle
          className="week-progress__fill"
          cx="26" cy="26" r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 26 26)"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span className="week-progress__label">{pct}%</span>
    </div>
  );
}
