import { useT } from '../../i18n';
import { X } from 'lucide-react';

export default function SyllabusToolbar({ viewMode, setViewMode, searchQuery, setSearchQuery, multiLang, langFilter, setLangFilter, langOptions, sortBy, setSortBy }) {
  const t = useT();

  return (
    <div className="syllabus-panel__toolbar">
      {/* View toggle */}
      <div className="syllabus-panel__view-toggle" role="group" aria-label="View mode">
        {[
          { id: 'all', label: t('toolbar.all') },
          { id: 'courses', label: t('toolbar.courses') },
          { id: 'readers', label: t('toolbar.readers') },
        ].map(v => (
          <button
            key={v.id}
            className={`syllabus-panel__toggle-btn ${viewMode === v.id ? 'syllabus-panel__toggle-btn--active' : ''}`}
            onClick={() => setViewMode(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="syllabus-panel__search">
        <input
          type="text"
          className="syllabus-panel__search-input"
          placeholder={t('toolbar.searchTopics')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="syllabus-panel__search-clear"
            onClick={() => setSearchQuery('')}
            aria-label={t('toolbar.clearSearch')}
          ><X size={12} /></button>
        )}
      </div>

      {/* Language pills + sort */}
      {(multiLang || langFilter !== 'all') && (
        <div className="syllabus-panel__filters">
          <div className="syllabus-panel__lang-pills" role="group" aria-label="Language filter">
            {langOptions.map(l => (
              <button
                key={l.id}
                className={`syllabus-panel__lang-pill ${langFilter === l.id ? 'syllabus-panel__lang-pill--active' : ''}`}
                onClick={() => setLangFilter(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <select
            className="syllabus-panel__sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            aria-label="Sort order"
          >
            <option value="recent">{t('toolbar.recent')}</option>
            <option value="alpha">{t('toolbar.alpha')}</option>
          </select>
        </div>
      )}

      {/* Sort (when single language) */}
      {!multiLang && langFilter === 'all' && (
        <div className="syllabus-panel__filters">
          <div style={{ flex: 1 }} />
          <select
            className="syllabus-panel__sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            aria-label="Sort order"
          >
            <option value="recent">{t('toolbar.recent')}</option>
            <option value="alpha">{t('toolbar.alpha')}</option>
          </select>
        </div>
      )}
    </div>
  );
}
