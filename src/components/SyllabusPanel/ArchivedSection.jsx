import { getLang } from '../../lib/languages';
import { useT } from '../../i18n';

export default function ArchivedSection({ archivedSyllabi, archivedStandalone, archivedPaths = [], archivedOpen, setArchivedOpen, generatedReaders, onUnarchiveSyllabus, onUnarchiveReader, onUnarchivePath, onDelete }) {
  const t = useT();
  const archivedCount = archivedSyllabi.length + archivedStandalone.length + archivedPaths.length;
  if (archivedCount === 0) return null;

  return (
    <div className="syllabus-panel__archived-section">
      <button
        className="syllabus-panel__archived-header"
        onClick={() => setArchivedOpen(o => !o)}
        aria-expanded={archivedOpen}
        aria-controls="archived-items-list"
      >
        <span className="form-label text-muted">{t('archived.title', { count: archivedCount })}</span>
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
                    {getLang(s.langId).proficiency.name} {s.level} · {t('archived.syllabus')}
                  </span>
                </span>
                <button
                  className="btn btn-ghost btn-sm syllabus-panel__archive-btn"
                  onClick={() => onUnarchiveSyllabus(s.id)}
                  aria-label={t('archived.unarchiveSyllabus')}
                  title={t('archived.unarchive')}
                >↩</button>
                <button
                  className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                  onClick={() => onDelete(s.id, s.topic, 'syllabus')}
                  aria-label={t('archived.deleteSyllabus')}
                  title={t('archived.deletePermanently')}
                >×</button>
              </div>
            </li>
          ))}
          {archivedPaths.map(p => (
            <li key={p.id}>
              <div className="syllabus-panel__lesson-btn syllabus-panel__standalone-item syllabus-panel__archived-item">
                <span className="syllabus-panel__lesson-text">
                  <span className="syllabus-panel__lesson-zh">📚 {p.title}</span>
                  <span className="syllabus-panel__lesson-en text-muted">
                    {p.units?.length || 0} units · {t('archived.syllabus')}
                  </span>
                </span>
                <button
                  className="btn btn-ghost btn-sm syllabus-panel__archive-btn"
                  onClick={() => onUnarchivePath?.(p.id)}
                  aria-label={t('archived.unarchive')}
                  title={t('archived.unarchive')}
                >↩</button>
                <button
                  className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                  onClick={() => onDelete(p.id, p.title, 'path')}
                  aria-label={t('common.delete')}
                  title={t('archived.deletePermanently')}
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
                  aria-label={t('archived.unarchiveReader')}
                  title={t('archived.unarchive')}
                >↩</button>
                <button
                  className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                  onClick={() => onDelete(r.key, r.topic, 'standalone')}
                  aria-label={t('standalone.deleteReader')}
                  title={t('archived.deletePermanently')}
                >×</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
