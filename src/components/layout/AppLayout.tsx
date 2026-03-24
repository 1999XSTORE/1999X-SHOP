import Topbar from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  badgeCounts?: { chat: number; announcements: number };
}

export default function AppLayout({ children, currentPath, onNavigate, onLogout, badgeCounts }: AppLayoutProps) {
  const isChat = currentPath === '/chat';
  return (
    <div style={{ height: '100svh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} badgeCounts={badgeCounts} />
      <main style={{
        flex: 1,
        overflow: isChat ? 'hidden' : 'auto',
        paddingTop: isChat ? 76 : 86,
        paddingBottom: isChat ? 0 : 60,
        paddingLeft: isChat ? 16 : 24,
        paddingRight: isChat ? 16 : 24,
        display: isChat ? 'flex' : 'block',
        flexDirection: isChat ? 'column' : undefined,
      }}>
        <div style={{
          maxWidth: 1600,
          margin: '0 auto',
          width: '100%',
          flex: isChat ? 1 : undefined,
          display: isChat ? 'flex' : 'block',
          flexDirection: isChat ? 'column' : undefined,
          minHeight: isChat ? 0 : undefined,
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}
