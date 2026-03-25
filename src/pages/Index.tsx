import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeFetch';
import { logActivity } from '@/lib/activity';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import SafePageContent from '@/components/layout/SafePageContent';
import { toast } from 'sonner';
import { captureReferralFromUrl } from '@/lib/reseller';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LicensesPage = lazy(() => import('@/pages/LicensesPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const SupportPage = lazy(() => import('@/pages/SupportPage'));
const PanelStatusPage = lazy(() => import('@/pages/PanelStatusPage'));
const WalletPage = lazy(() => import('@/pages/WalletPage'));
const BonusPage = lazy(() => import('@/pages/BonusPage'));
const AnnouncementsPage = lazy(() => import('@/pages/AnnouncementsPage'));
const AdminActivityPage = lazy(() => import('@/pages/AdminActivityPage'));

const preloadCommonPages = () => {
  void import('@/pages/WalletPage');
  void import('@/pages/LicensesPage');
  void import('@/pages/ChatPage');
  void import('@/pages/DashboardPage');
};

const pageComponents: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  '/':                DashboardPage,
  '/licenses':        LicensesPage,
  '/chat':            ChatPage,
  '/support':         SupportPage,
  '/panel-status':    PanelStatusPage,
  '/wallet':          WalletPage,
  '/bonus':           BonusPage,
  '/announcements':   AnnouncementsPage,
  '/admin-activity':  AdminActivityPage,
};


const VALID_PATHS = Object.keys(pageComponents);

// ── Persist current page across refreshes ──────────────────
const PATH_KEY = '1999x-current-path';
function getSavedPath(): string {
  try {
    const currentPath = window.location.pathname === '/pay' ? '/wallet' : window.location.pathname;
    if (VALID_PATHS.includes(currentPath)) return currentPath;
    const p = sessionStorage.getItem(PATH_KEY);
    return p && VALID_PATHS.includes(p) ? p : '/';
  } catch { return '/'; }
}
function savePath(p: string) {
  try { sessionStorage.setItem(PATH_KEY, p); } catch {}
}

function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'40vh' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderRadius:16, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)' }}>
        <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,.18)', borderTopColor:'#8b5cf6', animation:'spin 0.9s linear infinite' }} />
        <span style={{ fontSize:13, color:'rgba(255,255,255,.58)', fontWeight:600 }}>Loading page...</span>
      </div>
    </div>
  );
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
  const { isAuthenticated, user, login, logout, setBalance } = useAppStore();

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
    captureReferralFromUrl();

    const loginWithRole = async (session: any) => {
      if (loggingIn.current) return;
      loggingIn.current = true;
      const email = session.user.email ?? '';
      const role  = await fetchRole(email);
      const userName = session.user.user_metadata?.full_name ?? email ?? 'User';
      login({
        id:     session.user.id,
        email,
        name:   userName,
        avatar: session.user.user_metadata?.avatar_url ?? '',
        role,
      });
      logActivity({ userId:session.user.id, userEmail:email, userName, action:'login', status:'success', meta:{ role } });
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

  useEffect(() => {
    if (!user?.id || !user.email) return;
    captureReferralFromUrl(user.email);
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    const schedule = (cb: () => void) => {
      const win = window as Window & { requestIdleCallback?: (callback: () => void) => number };
      if (typeof win.requestIdleCallback === 'function') return win.requestIdleCallback(cb);
      return window.setTimeout(cb, 600);
    };
    const cancel = (id: number) => {
      const win = window as Window & { cancelIdleCallback?: (handle: number) => void };
      if (typeof win.cancelIdleCallback === 'function') win.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };

    const id = schedule(preloadCommonPages);
    return () => cancel(id);
  }, [authReady, isAuthenticated]);

  const handleLogout = async () => {
    intentionalLogout.current = true;
    savePath('/'); // reset saved path on logout
    logout();
    if (!user?.id?.startsWith('staff_')) {
      try { await supabase.auth.signOut(); } catch {}
    }
  };

  useEffect(() => {
    if (!user || user.role === 'admin' || user.role === 'support') return;

    const creditedKey = `1999x-credited-${user.id}`;
    const rejectedKey = `1999x-rejected-${user.id}`;

    const readIds = (key: string): Set<string> => {
      try { return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]')); }
      catch { return new Set<string>(); }
    };

    const writeId = (key: string, id: string) => {
      const ids = readIds(key);
      if (ids.has(id)) return;
      ids.add(id);
      try { localStorage.setItem(key, JSON.stringify([...ids])); } catch {}
    };

    let checking = false;
    let disposed = false;

    const syncBalance = async () => {
      if (checking || disposed) return;
      checking = true;
      try {
        const { data, error } = await safeQuery(
          () => supabase.from('transactions').select('id, amount, status').eq('user_id', user.id)
        );
        if (error || !data || disposed) return;

        const rows = data as Array<{ id: string; amount: number; status: string }>;
        const approvedTotal = rows
          .filter((tx) => tx.status === 'approved')
          .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

        setBalance(approvedTotal);

        for (const tx of rows) {
          if (tx.status === 'approved') {
            const credited = readIds(creditedKey);
            if (!credited.has(tx.id)) {
              writeId(creditedKey, tx.id);
              toast.success(`Payment approved! $${Number(tx.amount || 0).toFixed(2)} added!`);
              logActivity({
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                action: 'balance_add',
                amount: Number(tx.amount) || 0,
                status: 'success',
                meta: { transaction_id: tx.id, source: 'global_balance_sync' },
              });
            }
          }

          if (tx.status === 'rejected') {
            const rejected = readIds(rejectedKey);
            if (!rejected.has(tx.id)) {
              writeId(rejectedKey, tx.id);
              toast.error(`Payment of $${Number(tx.amount || 0).toFixed(2)} was rejected.`);
            }
          }
        }
      } finally {
        checking = false;
      }
    };

    void syncBalance();

    const onFocus = () => { void syncBalance(); };
    window.addEventListener('focus', onFocus);

    const channel = supabase
      .channel(`balance-sync-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user.id}`,
      }, () => { void syncBalance(); })
      .subscribe();

    return () => {
      disposed = true;
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, [setBalance, user?.id, user?.role]);

  // ── Loading screen — only shown if NOT already authenticated ──
  // If Zustand has isAuthenticated=true, skip straight to app
  if (!authReady) {
    return (
      <div style={{ minHeight:'100svh', background:'#000', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        <style>{`
          .ld-loader {
            position: absolute;
            top: 50%;
            margin-left: -50px;
            left: 50%;
            animation: speeder 0.4s linear infinite;
          }
          .ld-loader > span {
            height: 5px;
            width: 35px;
            background: #fff;
            position: absolute;
            top: -19px;
            left: 60px;
            border-radius: 2px 10px 1px 0;
          }
          .ld-base span {
            position: absolute;
            width: 0;
            height: 0;
            border-top: 6px solid transparent;
            border-right: 100px solid #fff;
            border-bottom: 6px solid transparent;
          }
          .ld-base span:before {
            content: "";
            height: 22px;
            width: 22px;
            border-radius: 50%;
            background: #fff;
            position: absolute;
            right: -110px;
            top: -16px;
          }
          .ld-base span:after {
            content: "";
            position: absolute;
            width: 0;
            height: 0;
            border-top: 0 solid transparent;
            border-right: 55px solid #fff;
            border-bottom: 16px solid transparent;
            top: -16px;
            right: -98px;
          }
          .ld-face {
            position: absolute;
            height: 12px;
            width: 20px;
            background: #fff;
            border-radius: 20px 20px 0 0;
            transform: rotate(-40deg);
            right: -125px;
            top: -15px;
          }
          .ld-face:after {
            content: "";
            height: 12px;
            width: 12px;
            background: #fff;
            right: 4px;
            top: 7px;
            position: absolute;
            transform: rotate(40deg);
            transform-origin: 50% 50%;
            border-radius: 0 0 0 2px;
          }
          .ld-loader > span > span:nth-child(1),
          .ld-loader > span > span:nth-child(2),
          .ld-loader > span > span:nth-child(3),
          .ld-loader > span > span:nth-child(4) {
            width: 30px;
            height: 1px;
            background: #fff;
            position: absolute;
            animation: fazer1 0.2s linear infinite;
          }
          .ld-loader > span > span:nth-child(2) {
            top: 3px;
            animation: fazer2 0.4s linear infinite;
          }
          .ld-loader > span > span:nth-child(3) {
            top: 1px;
            animation: fazer3 0.4s linear infinite;
            animation-delay: -1s;
          }
          .ld-loader > span > span:nth-child(4) {
            top: 4px;
            animation: fazer4 1s linear infinite;
            animation-delay: -1s;
          }
          @keyframes fazer1 {
            0%   { left: 0; }
            100% { left: -80px; opacity: 0; }
          }
          @keyframes fazer2 {
            0%   { left: 0; }
            100% { left: -100px; opacity: 0; }
          }
          @keyframes fazer3 {
            0%   { left: 0; }
            100% { left: -50px; opacity: 0; }
          }
          @keyframes fazer4 {
            0%   { left: 0; }
            100% { left: -150px; opacity: 0; }
          }
          @keyframes speeder {
            0%   { transform: translate(2px, 1px)   rotate(0deg);  }
            10%  { transform: translate(-1px, -3px) rotate(-1deg); }
            20%  { transform: translate(-2px, 0px)  rotate(1deg);  }
            30%  { transform: translate(1px, 2px)   rotate(0deg);  }
            40%  { transform: translate(1px, -1px)  rotate(1deg);  }
            50%  { transform: translate(-1px, 3px)  rotate(-1deg); }
            60%  { transform: translate(-1px, 1px)  rotate(0deg);  }
            70%  { transform: translate(3px, 1px)   rotate(-1deg); }
            80%  { transform: translate(-2px, -1px) rotate(1deg);  }
            90%  { transform: translate(2px, 1px)   rotate(0deg);  }
            100% { transform: translate(1px, -2px)  rotate(-1deg); }
          }
          .ld-longfazers {
            position: absolute;
            width: 100%;
            height: 100%;
          }
          .ld-longfazers span {
            position: absolute;
            height: 2px;
            width: 20%;
            background: #fff;
          }
          .ld-longfazers span:nth-child(1) {
            top: 20%;
            animation: lf 0.6s linear infinite;
            animation-delay: -5s;
          }
          .ld-longfazers span:nth-child(2) {
            top: 40%;
            animation: lf2 0.8s linear infinite;
            animation-delay: -1s;
          }
          .ld-longfazers span:nth-child(3) {
            top: 60%;
            animation: lf3 0.6s linear infinite;
          }
          .ld-longfazers span:nth-child(4) {
            top: 80%;
            animation: lf4 0.5s linear infinite;
            animation-delay: -3s;
          }
          @keyframes lf {
            0%   { left: 200%; }
            100% { left: -200%; opacity: 0; }
          }
          @keyframes lf2 {
            0%   { left: 200%; }
            100% { left: -200%; opacity: 0; }
          }
          @keyframes lf3 {
            0%   { left: 200%; }
            100% { left: -100%; opacity: 0; }
          }
          @keyframes lf4 {
            0%   { left: 200%; }
            100% { left: -100%; opacity: 0; }
          }
          @keyframes ld-fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Speeder loader */}
        <div style={{ position:'relative', width:300, height:120 }}>
          <div className="ld-longfazers">
            <span /><span /><span /><span />
          </div>
          <div className="ld-loader">
            <span className="ld-base">
              <span />
            </span>
            <span>
              <span /><span /><span /><span />
            </span>
            <div className="ld-face" />
          </div>
        </div>

        {/* Branding below */}
        <div style={{ marginTop:72, textAlign:'center', animation:'ld-fade-in .7s ease both', animationDelay:'.2s' }}>
          <div style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'.06em', marginBottom:6 }}>1999X</div>
          <div style={{ fontSize:12, letterSpacing:'.2em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', fontWeight:600 }}>
            Loading your panel…
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  const PageComponent = pageComponents[currentPath] || DashboardPage;

  return (
    <AppLayout currentPath={currentPath} onNavigate={navigate} onLogout={handleLogout}>
      <SafePageContent>
        <Suspense fallback={<PageLoader />}>
          <PageComponent />
        </Suspense>
      </SafePageContent>
    </AppLayout>
  );
}
