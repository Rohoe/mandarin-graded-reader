import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const boundary = this.props.name || 'unnamed';
    const componentStack = errorInfo?.componentStack || '';
    console.error(`[ErrorBoundary:${boundary}]`, error, errorInfo);
    // Persist so the user can recover the stack after refresh (prod is minified)
    try {
      localStorage.setItem('gradedReader_lastError', JSON.stringify({
        boundary,
        message: error?.message || String(error),
        stack: error?.stack || '',
        componentStack,
        at: new Date().toISOString(),
        url: window.location.href,
      }));
    } catch { /* quota / privacy mode — ignore */ }
    this.setState({ componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: null });
  };

  handleCopy = () => {
    const text = [
      `Boundary: ${this.props.name || 'unnamed'}`,
      `Message: ${this.state.error?.message || ''}`,
      `Stack:\n${this.state.error?.stack || ''}`,
      `Component stack:${this.state.componentStack || ''}`,
    ].join('\n\n');
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 'var(--space-6, 1.5rem)',
          textAlign: 'center',
          color: 'var(--color-text, #1A1814)',
        }}>
          <p style={{ fontSize: 'var(--text-lg, 1.125rem)', marginBottom: 'var(--space-3, 0.75rem)' }}>
            Something went wrong{this.props.name ? ` in ${this.props.name}` : ''}.
          </p>
          <p style={{
            fontSize: 'var(--text-sm, 0.875rem)',
            color: 'var(--color-text-secondary, #6B6660)',
            marginBottom: 'var(--space-4, 1rem)',
            fontFamily: 'monospace',
            maxWidth: '40ch',
            margin: '0 auto var(--space-4, 1rem)',
            wordBreak: 'break-word',
          }}>
            {this.state.error?.message}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2, 0.5rem)', justifyContent: 'center', marginBottom: 'var(--space-3, 0.75rem)' }}>
            <button className="btn btn-primary btn-sm" onClick={this.handleReset}>
              Try Again
            </button>
            {(this.state.componentStack || this.state.error?.stack) && (
              <button className="btn btn-ghost btn-sm" onClick={this.handleCopy}>
                Copy details
              </button>
            )}
          </div>
          {this.state.componentStack && (
            <details style={{
              maxWidth: '60ch',
              margin: '0 auto',
              textAlign: 'left',
              fontSize: 'var(--text-xs, 0.75rem)',
              color: 'var(--color-text-secondary, #6B6660)',
            }}>
              <summary style={{ cursor: 'pointer' }}>Technical details</summary>
              <pre style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                marginTop: 'var(--space-2, 0.5rem)',
              }}>{this.state.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
