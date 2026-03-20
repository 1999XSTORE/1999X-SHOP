import Topbar from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export default function AppLayout({ children, currentPath, onNavigate }: AppLayoutProps) {
  return (
    <div className="min-h-screen">
      <div className="app-bg-mesh" />
      <Topbar currentPath={currentPath} onNavigate={onNavigate} />
      <main className="p-4 lg:p-6 max-w-[1200px] mx-auto">
        {children}
      </main>
    </div>
  );
}
