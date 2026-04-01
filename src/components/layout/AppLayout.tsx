import Topbar from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export default function AppLayout({ children, currentPath, onNavigate, onLogout }: AppLayoutProps) {
  const isChat   = currentPath === '/chat';
  const isWallet = currentPath === '/wallet';
  const useFlex  = isChat || isWallet;

  return (
    <div style={{ height: useFlex ? '100svh' : undefined, minHeight: useFlex ? undefined : '100svh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} />
      <main
        style={{
          flex: 1,
          overflow: isChat ? 'hidden' : 'auto',
          paddingTop: useFlex ? (isChat ? 76 : 86) : 86,
          paddingBottom: useFlex
            ? (isChat ? 'max(76px, calc(76px + env(safe-area-inset-bottom)))' : '24px')
            : 'max(60px, calc(60px + env(safe-area-inset-bottom)))',
          paddingLeft: isChat ? 'clamp(12px, 2vw, 16px)' : 'clamp(16px, 2.5vw, 24px)',
          paddingRight: isChat ? 'clamp(12px, 2vw, 16px)' : 'clamp(16px, 2.5vw, 24px)',
          display: useFlex ? 'flex' : 'block',
          flexDirection: useFlex ? 'column' : undefined,
          minWidth: 0,
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            margin: '0 auto',
            width: '100%',
            flex: useFlex ? 1 : undefined,
            display: useFlex ? 'flex' : 'block',
            flexDirection: useFlex ? 'column' : undefined,
            minHeight: useFlex ? 0 : undefined,
            minWidth: 0,
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
