export default function ReaderEmptyState({ decorativeChars, charIndex, onOpenSidebar }) {
  return (
    <div className="reader-view reader-view--empty">
      <div className="reader-view__empty-state">
        <span className="reader-view__empty-hanzi">{decorativeChars[charIndex]}</span>
        <p className="font-display reader-view__empty-text">
          Choose a topic and generate a reader to get started.
        </p>
        <button className="btn btn-primary reader-view__empty-open-menu" onClick={onOpenSidebar}>
          ☰ Open menu
        </button>
      </div>
    </div>
  );
}
