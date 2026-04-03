import './ReadingProgressBar.css';

export default function ReadingProgressBar({ progress }) {
  const pct = Math.round(progress * 100);
  return (
    <div
      className="reading-progress-bar"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div className="reading-progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
