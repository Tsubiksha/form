import { useTranslation } from "react-i18next";
import React from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Link } from "react-router-dom";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', padding: 48,
          textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 16,
          border: '1px solid var(--border-subtle)', margin: 24
        }}>
          <div style={{
            width: 64, height: 64, background: 'var(--danger-50)', color: 'var(--danger-600)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 24
          }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{t('ui.something_went_wrong', `Something went wrong`)}</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 460, marginBottom: 32, lineHeight: 1.6 }}>{t('ui.the_application_encountered_an_unexpecte', `The application encountered an unexpected error. Our team has been notified.
            You can try reloading the page or returning to the dashboard.`)}</p>
          
          <div style={{
            background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 8,
            padding: 16, width: '100%', maxWidth: 600, overflow: 'auto',
            textAlign: 'left', marginBottom: 32, fontSize: 13, color: 'var(--danger-500)',
            fontFamily: 'monospace'
          }}>
            <strong>{this.state.error?.toString()}</strong>
            <br />
            {this.state.errorInfo?.componentStack}
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                background: 'var(--gray-900)', color: 'white', border: 'none',
                borderRadius: 8, fontWeight: 600, cursor: 'pointer'
              }}
            >
              <RefreshCcw size={16} />{t('ui.reload_page', `Reload Page`)}</button>
            <Link
              to="/workspace/home"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)',
                borderRadius: 8, fontWeight: 600, textDecoration: 'none'
              }}
            >
              <Home size={16} />{t('ui.go_to_home', `Go to Home`)}</Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
