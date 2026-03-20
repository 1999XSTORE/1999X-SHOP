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

async function fetchRole(email: string): Promise<'admin' | 'support' | 'user'> {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', email)
      .maybeSingle();
    if (data?.role === 'admin' || data?.role === 'support') return data.role;
  } catch {}
  return 'user';
}

export default function Index() {
  const { isAuthenticated, user, login, logout } = useAppStore();
  const [currentPath, setCurrentPath] = useState('/');
  const intentionalLogout = useRef(false);

  useEffect(() => {
    const loginWithRole = async (session: any) => {
      const email = session.user.email ?? '';
      const role  = await fetchRole(email);
      login({
        id:     session.user.id,
        email,
        name:   session.user.user_metadata?.full_name ?? email ?? 'User',
        avatar: session.user.user_metadata?.avatar_url ?? '',
        role,
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (intentionalLogout.current || !session?.user) return;
      if (!isAuthenticated) loginWithRole(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Only clear state if WE triggered it
        if (intentionalLogout.current) {
          logout();
          intentionalLogout.current = false;
        }
        return;
      }
      if (!session?.user) return;
      await loginWithRole(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    intentionalLogout.current = true;
    // Always clear local state immediately
    logout();
    // Only call Supabase signOut for real OAuth users (not role-based staff)
    if (!user?.id?.startsWith('staff_')) {
      try { await supabase.auth.signOut(); } catch {}
    }
  };

  if (!isAuthenticated) return <LoginPage />;

  const PageComponent = pageComponents[currentPath] || DashboardPage;

  return (
    <AppLayout currentPath={currentPath} onNavigate={setCurrentPath} onLogout={handleLogout}>
      <PageComponent />
    </AppLayout>
  );
}
