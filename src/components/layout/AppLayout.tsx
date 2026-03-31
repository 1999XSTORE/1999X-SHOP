import Topbar from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export default function AppLayout({ children, currentPath, onNavigate, onLogout }: AppLayoutProps) {
  const isChat = currentPath === '/chat';

  return (
    <div style={{ height: isChat ? '100svh' : undefined, minHeight: isChat ? undefined : '100svh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} />
      <main
        style={{
          flex: 1,
          overflow: isChat ? 'hidden' : 'auto',
          paddingTop: isChat ? 76 : 86,
          paddingBottom: isChat
            ? 'max(76px, calc(76px + env(safe-area-inset-bottom)))'
            : 'max(60px, calc(60px + env(safe-area-inset-bottom)))',
          paddingLeft: isChat ? 'clamp(12px, 2vw, 16px)' : 'clamp(16px, 2.5vw, 24px)',
          paddingRight: isChat ? 'clamp(12px, 2vw, 16px)' : 'clamp(16px, 2.5vw, 24px)',
          display: isChat ? 'flex' : 'block',
          flexDirection: isChat ? 'column' : undefined,
          minWidth: 0,
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            margin: '0 auto',
            width: '100%',
            flex: isChat ? 1 : undefined,
            display: isChat ? 'flex' : 'block',
            flexDirection: isChat ? 'column' : undefined,
            minHeight: isChat ? 0 : undefined,
            minWidth: 0,
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
