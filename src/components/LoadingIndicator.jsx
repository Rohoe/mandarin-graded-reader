import './LoadingIndicator.css';

const INK_CHARS = ['读', '写', '学', '文', '语', '书'];

export default function LoadingIndicator({ message = '正在生成…', fullScreen = false }) {
  return (
    <div className={`loading-indicator ${fullScreen ? 'loading-fullscreen' : ''}`}>
      <div className="ink-loader">
        {INK_CHARS.map((char, i) => (
          <span
            key={char}
            className="ink-char"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            {char}
          </span>
        ))}
      </div>
      <p className="loading-message">{message}</p>
    </div>
  );
}
