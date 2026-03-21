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
import StorePage from '@/pages/StorePage';
import BonusPage from '@/pages/BonusPage';
import AnnouncementsPage from '@/pages/AnnouncementsPage';

const pageComponents: Record<string, React.FC> = {
  '/':              DashboardPage,
  '/licenses':      LicensesPage,
  '/chat':          ChatPage,
  '/support':       SupportPage,
  '/panel-status':  PanelStatusPage,
  '/wallet':        WalletPage,
  '/store':         StorePage,
  '/bonus':         BonusPage,
  '/announcements': AnnouncementsPage,
};

const VALID_PATHS = Object.keys(pageComponents);

// ── Persist current page across refreshes ──────────────────
const PATH_KEY = '1999x-current-path';
function getSavedPath(): string {
  try {
    const p = sessionStorage.getItem(PATH_KEY);
    return p && VALID_PATHS.includes(p) ? p : '/';
  } catch { return '/'; }
}
function savePath(p: string) {
  try { sessionStorage.setItem(PATH_KEY, p); } catch {}
}

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

  // ── Restore last page from sessionStorage ─────────────────
  const [currentPath, setCurrentPath] = useState(getSavedPath);

  // ── Auth state ─────────────────────────────────────────────
  // Start as true if already authenticated (Zustand persist loaded it)
  // This prevents the flash of login screen on refresh
  const [authReady, setAuthReady] = useState(isAuthenticated);
  const intentionalLogout = useRef(false);
  const loggingIn         = useRef(false);

  const navigate = (path: string) => {
    setCurrentPath(path);
    savePath(path);
  };

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

    // Check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (intentionalLogout.current) { setAuthReady(true); return; }
      if (session?.user) {
        // Always refresh role from DB on page load
        loginWithRole(session);
      } else {
        // No session — if Zustand thinks we're logged in, clear it
        if (isAuthenticated) logout();
        setAuthReady(true);
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

    // Safety net — show login after 5s max wait
    const safetyTimer = setTimeout(() => setAuthReady(true), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const handleLogout = async () => {
    intentionalLogout.current = true;
    savePath('/'); // reset saved path on logout
    logout();
    if (!user?.id?.startsWith('staff_')) {
      try { await supabase.auth.signOut(); } catch {}
    }
  };

  // ── Loading screen — only shown if NOT already authenticated ──
  // If Zustand has isAuthenticated=true, skip straight to app
  if (!authReady) {
    return (
      <div style={{ minHeight:'100svh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
          <img
            src="https://www.dropbox.com/scl/fi/uv2artcam1x5w1afg7ecc/1999XX-Png.png?raw=1"
            alt="1999X"
            style={{ width:52, height:52, objectFit:'contain', filter:'drop-shadow(0 0 16px rgba(139,92,246,.5))', animation:'gp 1.5s ease-in-out infinite' }}
          />
          <div style={{ display:'flex', gap:5 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width:5, height:5, borderRadius:'50%', background:'rgba(139,92,246,.6)', animation:`blink 1.2s ease-in-out ${i*0.2}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  const PageComponent = pageComponents[currentPath] || DashboardPage;

  return (
    <AppLayout currentPath={currentPath} onNavigate={navigate} onLogout={handleLogout}>
      <PageComponent />
    </AppLayout>
  );
}
