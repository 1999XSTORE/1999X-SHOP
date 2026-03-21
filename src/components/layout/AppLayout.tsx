import Topbar from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export default function AppLayout({ children, currentPath, onNavigate, onLogout }: AppLayoutProps) {
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <Topbar currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} />
      <main style={{ paddingTop: 82, paddingBottom: 48, paddingLeft: 16, paddingRight: 16 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
