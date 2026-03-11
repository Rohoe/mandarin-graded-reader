import { getLang } from '../../lib/languages';

export default function ArchivedSection({ archivedSyllabi, archivedStandalone, archivedOpen, setArchivedOpen, generatedReaders, onUnarchiveSyllabus, onUnarchiveReader, onDelete }) {
  const archivedCount = archivedSyllabi.length + archivedStandalone.length;
  if (archivedCount === 0) return null;

  return (
    <div className="syllabus-panel__archived-section">
      <button
        className="syllabus-panel__archived-header"
        onClick={() => setArchivedOpen(o => !o)}
        aria-expanded={archivedOpen}
        aria-controls="archived-items-list"
      >
        <span className="form-label text-muted">Archived ({archivedCount})</span>
        <span className="syllabus-panel__caret-btn">{archivedOpen ? '▾' : '▸'}</span>
      </button>
      {archivedOpen && (
        <ul id="archived-items-list" className="syllabus-panel__list" role="list">
          {archivedSyllabi.map(s => (
            <li key={s.id}>
              <div className="syllabus-panel__lesson-btn syllabus-panel__standalone-item syllabus-panel__archived-item">
                <span className="syllabus-panel__lesson-text">
                  <span className="syllabus-panel__lesson-zh text-chinese">{s.topic}</span>
                  <span className="syllabus-panel__lesson-en text-muted">
                    {getLang(s.langId).proficiency.name} {s.level} · Syllabus
                  </span>
                </span>
                <button
                  className="btn btn-ghost btn-sm syllabus-panel__archive-btn"
                  onClick={() => onUnarchiveSyllabus(s.id)}
                  aria-label="Unarchive syllabus"
                  title="Unarchive"
                >↩</button>
                <button
                  className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                  onClick={() => onDelete(s.id, s.topic, 'syllabus')}
                  aria-label="Delete syllabus"
                  title="Delete permanently"
                >×</button>
              </div>
            </li>
          ))}
          {archivedStandalone.map(r => (
            <li key={r.key}>
              <div className="syllabus-panel__lesson-btn syllabus-panel__standalone-item syllabus-panel__archived-item">
                <span className="syllabus-panel__lesson-text">
                  <span className="syllabus-panel__lesson-zh text-chinese">
                    {r.titleZh || generatedReaders[r.key]?.titleZh || r.topic}
                  </span>
                  <span className="syllabus-panel__lesson-en text-muted">
                    {getLang(r.langId).proficiency.name} {r.level}
                  </span>
                </span>
                <button
                  className="btn btn-ghost btn-sm syllabus-panel__archive-btn"
                  onClick={() => onUnarchiveReader(r.key)}
                  aria-label="Unarchive reader"
                  title="Unarchive"
                >↩</button>
                <button
                  className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                  onClick={() => onDelete(r.key, r.topic, 'standalone')}
                  aria-label="Delete reader"
                  title="Delete permanently"
                >×</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
