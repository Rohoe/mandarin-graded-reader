import { useState } from 'react';
import { signInWithGoogle, signInWithApple } from '../lib/cloudSync';
import { useT } from '../i18n';
import { X } from 'lucide-react';

export default function SignInModal({ onClose }) {
  const t = useT();
  const [error, setError] = useState(null);

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign-in failed:', err);
      setError(t('signIn.error') || 'Sign-in failed. Please try again.');
    }
  }

  async function handleApple() {
    setError(null);
    try {
      await signInWithApple();
    } catch (err) {
      console.error('Apple sign-in failed:', err);
      setError(t('signIn.error') || 'Sign-in failed. Please try again.');
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card card-padded fade-in" style={{ maxWidth: 360, width: '90%', textAlign: 'center' }}>
        <button
          className="btn btn-ghost"
          onClick={onClose}
          aria-label={t('common.close')}
          style={{ position: 'absolute', top: 8, right: 8, fontSize: '1.25rem', lineHeight: 1 }}
        >
          <X size={18} />
        </button>

        <h2 className="font-display" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.25rem' }}>
          {t('signIn.title')}
        </h2>
        <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: '1.25rem' }}>
          {t('signIn.syncProgress')}
        </p>

        {error && (
          <p style={{ color: 'var(--color-error, #c0392b)', fontSize: 'var(--text-sm)', marginBottom: '0.75rem' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <button className="btn btn-primary" onClick={handleGoogle} style={{ width: '100%' }}>
            {t('signIn.google')}
          </button>
          <button className="btn btn-secondary" onClick={handleApple} style={{ width: '100%' }}>
            {t('signIn.apple')}
          </button>
        </div>
      </div>
    </div>
  );
}
