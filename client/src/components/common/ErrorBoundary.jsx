import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            backgroundColor: 'var(--bg-canvas, #f8fafc)'
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: '12px',
              padding: '32px 28px',
              boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1))',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: 'var(--status-danger-bg, #fef2f2)',
                color: 'var(--status-danger, #ef4444)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary, #0f172a)',
                marginBottom: 8
              }}
            >
              Something went wrong in this module
            </h2>

            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary, #64748b)',
                lineHeight: 1.5,
                marginBottom: 20
              }}
            >
              The application encountered an unexpected runtime error while rendering this page. You can reload the page or return to the dashboard.
            </p>

            {this.state.error && (
              <pre
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  backgroundColor: '#f1f5f9',
                  color: '#dc2626',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: 24,
                  border: '1px solid #e2e8f0'
                }}
              >
                {this.state.error.toString()}
              </pre>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border, #cbd5e1)',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                  color: 'var(--text-primary, #1e293b)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} />
                Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--brand-green, #10b981)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <Home size={15} />
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
