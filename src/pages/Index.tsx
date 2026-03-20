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

// Look up email in user_roles table → returns 'admin' | 'support' | 'user'
async function fetchRole(email: string): Promise<'admin' | 'support' | 'user'> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', email)
      .maybeSingle();

    if (error || !data) return 'user';
    if (data.role === 'admin' || data.role === 'support') return data.role;
  } catch {
    // table may not exist yet — fall back to user
  }
  return 'user';
}

export default function Index() {
  const { isAuthenticated, login, logout } = useAppStore();
  const [currentPath, setCurrentPath] = useState('/');
  const intentionalLogout = useRef(false);

  useEffect(() => {
    // Helper: build user object with role from Supabase table
    const loginWithRole = async (session: any) => {
      const email  = session.user.email ?? '';
      const role   = await fetchRole(email);
      login({
        id:     session.user.id,
        email,
        name:   session.user.user_metadata?.full_name ?? email ?? 'User',
        avatar: session.user.user_metadata?.avatar_url ?? '',
        role,
      });
    };

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (intentionalLogout.current || !session?.user) return;
      if (!isAuthenticated) loginWithRole(session);
    });

    // Listen for auth changes (Google OAuth redirect comes through here)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        intentionalLogout.current = true;
        return;
      }
      if (intentionalLogout.current || !session?.user) return;
      await loginWithRole(session);
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
