import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeFetch';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import LicensesPage from '@/pages/LicensesPage';
import ChatPage from '@/pages/ChatPage';
import SupportPage from '@/pages/SupportPage';
import PanelStatusPage from '@/pages/PanelStatusPage';
import WalletPage from '@/pages/WalletPage';
import BonusPage from '@/pages/BonusPage';
import AnnouncementsPage from '@/pages/AnnouncementsPage';

const pageComponents: Record<string, React.FC> = {
  '/':              DashboardPage,
  '/licenses':      LicensesPage,
  '/chat':          ChatPage,
  '/support':       SupportPage,
  '/panel-status':  PanelStatusPage,
  '/wallet':        WalletPage,
  '/bonus':         BonusPage,
  '/announcements': AnnouncementsPage,
};

// Fetch role with timeout — never hangs on page load
async function fetchRole(email: string): Promise<'admin' | 'support' | 'user'> {
  const { data } = await safeQuery(
    () => supabase.from('user_roles').select('role').eq('email', email).maybeSingle(),
    5000
  );
  if (data?.role === 'admin' || data?.role === 'support') return data.role;
  return 'user';
}

export default function Index() {
  const { isAuthenticated, user, login, logout } = useAppStore();
  const [currentPath, setCurrentPath]   = useState('/');
  const [authReady, setAuthReady]       = useState(false); // tracks if session check is done
  const intentionalLogout               = useRef(false);
  const loggingIn                       = useRef(false);

  useEffect(() => {
    const loginWithRole = async (session: any) => {
      if (loggingIn.current) return;
      loggingIn.current = true;
      const email = session.user.email ?? '';
      const role  = await fetchRole(email);
      login({
        id:     session.user.id,
        email,
        name:   session.user.user_metadata?.full_name ?? email ?? 'User',
        avatar: session.user.user_metadata?.avatar_url ?? '',
        role,
      });
      loggingIn.current = false;
      setAuthReady(true);
    };

    // Check existing session — always resolves within ~3s
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (intentionalLogout.current) { setAuthReady(true); return; }
      if (session?.user && !isAuthenticated) {
        loginWithRole(session);
      } else {
        setAuthReady(true); // no session — show login immediately
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (intentionalLogout.current) {
          logout();
          intentionalLogout.current = false;
          setAuthReady(true);
        }
        return;
      }
      if (!session?.user) return;
      await loginWithRole(session);
    });

    // Safety net — if auth check takes more than 4s, stop the spinner regardless
    const safetyTimer = setTimeout(() => setAuthReady(true), 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const handleLogout = async () => {
    intentionalLogout.current = true;
    logout(); // clear immediately — don't wait
    if (!user?.id?.startsWith('staff_')) {
      try { await supabase.auth.signOut(); } catch {}
    }
  };

  // Show nothing while checking auth — max 4 seconds then shows login
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center animate-pulse">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <p className="text-xs text-white/30">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  const PageComponent = pageComponents[currentPath] || DashboardPage;

  return (
    <AppLayout currentPath={currentPath} onNavigate={setCurrentPath} onLogout={handleLogout}>
      <PageComponent />
    </AppLayout>
  );
}
