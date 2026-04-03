import { useT } from '../../i18n';
import { Cloud, BarChart3, Settings as SettingsIcon, Hexagon } from 'lucide-react';

export default function SyncFooter({ cloudUser, cloudSyncing, cloudLastSynced, lastModified, onShowSettings, onShowStats, onShowFlashcards, onShowSignIn }) {
  const t = useT();

  return (
    <div className="syllabus-panel__footer">
      <div className="syllabus-panel__sync-status">
        {cloudUser ? (
          <>
            <span className="syllabus-panel__sync-icon" title={cloudUser.email || 'Signed in'}><Cloud size={14} /></span>
            {cloudSyncing ? (
              <span className="syllabus-panel__sync-label syllabus-panel__sync-label--syncing">{t('footer.syncing')}</span>
            ) : cloudLastSynced && lastModified > cloudLastSynced ? (
              <span className="syllabus-panel__sync-label syllabus-panel__sync-label--unsynced">{t('footer.unsynced')}</span>
            ) : cloudLastSynced ? (
              <span className="syllabus-panel__sync-label syllabus-panel__sync-label--synced">{t('footer.synced')}</span>
            ) : (
              <span className="syllabus-panel__sync-label syllabus-panel__sync-label--unsynced">{t('footer.notYetSynced')}</span>
            )}
          </>
        ) : (
          <>
            <span className="syllabus-panel__sync-icon syllabus-panel__sync-icon--off" title={t('footer.notSignedIn')}><Cloud size={14} /></span>
            <span className="syllabus-panel__sync-label syllabus-panel__sync-label--off">
              {t('footer.notSignedIn')}
              <button className="syllabus-panel__sign-in-link" onClick={onShowSignIn}>{t('footer.signIn')}</button>
            </span>
          </>
        )}
      </div>
      <button
        className="syllabus-panel__footer-btn"
        onClick={onShowFlashcards}
        title={t('footer.flashcardReview')}
      >
        <Hexagon size={14} /> {t('footer.cards')}
      </button>
      <button
        className="syllabus-panel__footer-btn"
        onClick={onShowStats}
        title={t('footer.learningStats')}
      >
        <BarChart3 size={14} /> {t('footer.stats')}
      </button>
      <button
        className="syllabus-panel__footer-btn"
        onClick={onShowSettings}
      >
        <SettingsIcon size={14} /> {t('footer.settings')}
      </button>
    </div>
  );
}
