import { useState, useEffect, useRef } from 'react';
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
import WalletPage from '@/pages/WalletPage';
import BonusPage from '@/pages/BonusPage';
import AnnouncementsPage from '@/pages/AnnouncementsPage';

const pageComponents: Record<string, React.FC> = {
  '/':              DashboardPage,
  '/products':      ProductsPage,
  '/licenses':      LicensesPage,
  '/chat':          ChatPage,
  '/support':       SupportPage,
  '/panel-status':  PanelStatusPage,
  '/wallet':        WalletPage,
  '/bonus':         BonusPage,
  '/announcements': AnnouncementsPage,
};

export default function Index() {
  const { isAuthenticated, login, logout } = useAppStore();
  const [currentPath, setCurrentPath] = useState('/');
  const intentionalLogout = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (intentionalLogout.current) return;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        intentionalLogout.current = true;
        return;
      }
      if (intentionalLogout.current) return;
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

  const handleLogout = async () => {
    intentionalLogout.current = true;
    await supabase.auth.signOut();
    logout();
    setTimeout(() => { intentionalLogout.current = false; }, 3000);
  };

  if (!isAuthenticated) return <LoginPage />;

  const PageComponent = pageComponents[currentPath] || DashboardPage;

  return (
    <AppLayout currentPath={currentPath} onNavigate={setCurrentPath} onLogout={handleLogout}>
      <PageComponent />
    </AppLayout>
  );
}
