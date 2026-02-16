import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'unnamed'}]`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
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
          <button className="btn btn-primary btn-sm" onClick={this.handleReset}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
