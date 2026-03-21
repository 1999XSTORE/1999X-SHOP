import Topbar from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export default function AppLayout({ children, currentPath, onNavigate, onLogout }: AppLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: '#06060f' }}>
      <Topbar currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="pt-20 px-4 sm:px-6 pb-16">
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
