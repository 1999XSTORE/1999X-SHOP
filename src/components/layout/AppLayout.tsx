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
      <main className="pt-20 px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
