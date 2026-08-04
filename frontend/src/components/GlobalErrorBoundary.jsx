import React from 'react';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ color: 'var(--danger-600)', fontSize: '24px' }}>Something went wrong.</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            We're sorry, but the application encountered an unexpected error.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', background: 'var(--brand-600)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginBottom: '20px' }}
          >
            Reload Application
          </button>
          
          {this.state.error && (
            <details style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-surface-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '14px', color: 'var(--text-primary)' }}>
              <summary style={{ fontWeight: 600, cursor: 'pointer', marginBottom: '10px' }}>Error Details (for developers)</summary>
              <div style={{ marginTop: '10px', color: 'var(--danger-700)' }}>
                {this.state.error.toString()}
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', overflowX: 'auto' }}>
                {this.state.errorInfo.componentStack}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children; 
  }
}

export default GlobalErrorBoundary;
