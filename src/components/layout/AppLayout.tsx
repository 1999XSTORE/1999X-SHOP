import Topbar from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export default function AppLayout({ children, currentPath, onNavigate, onLogout }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Topbar currentPath={currentPath} onNavigate={onNavigate} onLogout={onLogout} />
      <main className="pt-20 px-6 pb-12">
        {children}
      </main>
    </div>
  );
}
