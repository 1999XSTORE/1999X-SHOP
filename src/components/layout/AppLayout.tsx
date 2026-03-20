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
      {/* Full width, only top padding for floating navbar */}
      <main className="pt-20 px-4 lg:px-8 pb-10 w-full">
        {children}
      </main>
    </div>
  );
}
