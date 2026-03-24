import { Component, type ErrorInfo, type ReactNode } from 'react';

interface PageErrorBoundaryProps {
  children: ReactNode;
  title?: string;
}

interface PageErrorBoundaryState {
  hasError: boolean;
}

export default class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorBoundaryState> {
  state: PageErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PageErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Page render failed:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            borderRadius: 20,
            padding: '28px 24px',
            background: 'rgba(255,255,255,.03)',
            border: '1px solid rgba(248,113,113,.2)',
            boxShadow: '0 16px 48px rgba(0,0,0,.35)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#fca5a5', marginBottom: 12 }}>
            Page Error
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 10 }}>
            {this.props.title ?? 'This page could not load.'}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', margin: 0 }}>
            A page update caused a render error. Reloading will usually recover the app while we fix the broken component.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              marginTop: 18,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid rgba(139,92,246,.28)',
              background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}
