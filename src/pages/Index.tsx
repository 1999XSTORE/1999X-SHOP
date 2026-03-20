import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProductsPage from '@/pages/ProductsPage';
import LicensesPage from '@/pages/LicensesPage';
import ChatPage from '@/pages/ChatPage';
import SupportPage from '@/pages/SupportPage';
import PanelStatusPage from '@/pages/PanelStatusPage';

const pageComponents: Record<string, React.FC> = {
  '/':              DashboardPage,
  '/products':      ProductsPage,
  '/licenses':      LicensesPage,
  '/chat':          ChatPage,
  '/support':       SupportPage,
  '/panel-status':  PanelStatusPage,
};

export default function Index() {
  const { isAuthenticated, login } = useAppStore();
  const [currentPath, setCurrentPath] = useState('/');

  // Handle Supabase OAuth redirect & existing sessions
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !isAuthenticated) {
        login({
          id:     session.user.id,
          email:  session.user.email ?? '',
          name:   session.user.user_metadata?.full_name ?? session.user.email ?? 'User',
          avatar: session.user.user_metadata?.avatar_url ?? '',
          role:   'user',
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        login({
          id:     session.user.id,
          email:  session.user.email ?? '',
          name:   session.user.user_metadata?.full_name ?? session.user.email ?? 'User',
          avatar: session.user.user_metadata?.avatar_url ?? '',
          role:   'user',
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isAuthenticated) return <LoginPage />;

  const PageComponent = pageComponents[currentPath] || DashboardPage;

  return (
    <AppLayout currentPath={currentPath} onNavigate={setCurrentPath}>
      <PageComponent />
    </AppLayout>
  );
}
