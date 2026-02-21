import { signInWithGoogle, signInWithApple } from '../lib/cloudSync';

export default function SignInModal({ onClose }) {
  async function handleGoogle() {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign-in failed:', err);
    }
  }

  async function handleApple() {
    try {
      await signInWithApple();
    } catch (err) {
      console.error('Apple sign-in failed:', err);
    }
  }

  return (
    <div className="settings-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card card-padded fade-in" style={{ maxWidth: 360, width: '90%', textAlign: 'center' }}>
        <button
          className="btn btn-ghost"
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 8, right: 8, fontSize: '1.25rem', lineHeight: 1 }}
        >
          ✕
        </button>

        <h2 className="font-display" style={{ fontSize: 'var(--text-lg)', marginBottom: '0.25rem' }}>
          Sign In
        </h2>
        <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: '1.25rem' }}>
          Sync your progress across devices
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <button className="btn btn-primary" onClick={handleGoogle} style={{ width: '100%' }}>
            Sign in with Google
          </button>
          <button className="btn btn-secondary" onClick={handleApple} style={{ width: '100%' }}>
            Sign in with Apple
          </button>
        </div>
      </div>
    </div>
  );
}
