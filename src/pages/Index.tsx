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
const ResellerPage       = lazy(() => import('@/pages/ResellerPage'));

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
  '/reseller':        ResellerPage,
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
      <div style={{ minHeight:'100svh', background:'#080809', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        <style>{`
          /* Bottom glow matching site bg */
          .ld-bg-glow {
            position: absolute;
            bottom: -100px; left: 50%; transform: translateX(-50%);
            width: 600px; height: 300px; border-radius: 50%;
            background: radial-gradient(ellipse, rgba(70,45,200,0.18) 0%, transparent 70%);
            pointer-events: none; filter: blur(2px);
          }

          /* Uiverse petal loader */
          .ld-loader-wrap {
            position: relative;
            width: 100px; height: 100px;
            filter: drop-shadow(0 0 18px rgba(92,61,153,0.45));
          }
          .ld-petal-one {
            position: absolute; top: 0; left: 0;
            animation: flowe-one 1s linear infinite;
          }
          .ld-petal-two {
            position: absolute; top: 0; left: 0;
            opacity: 0;
            transform: scale(0) translateY(-200px) translateX(-100px);
            animation: flowe-two 1s linear infinite;
            animation-delay: 0.33s;
          }
          .ld-petal-three {
            position: absolute; top: 0; left: 0;
            opacity: 0;
            transform: scale(0) translateY(-200px) translateX(100px);
            animation: flowe-three 1s linear infinite;
            animation-delay: 0.66s;
          }
          @keyframes flowe-one {
            0%   { transform: scale(0.5) translateY(-200px); opacity: 0; }
            25%  { transform: scale(0.75) translateY(-100px); opacity: 1; }
            50%  { transform: scale(1) translateY(0px); opacity: 1; }
            75%  { transform: scale(0.5) translateY(50px); opacity: 1; }
            100% { transform: scale(0) translateY(100px); opacity: 0; }
          }
          @keyframes flowe-two {
            0%   { transform: scale(0.5) rotateZ(-10deg) translateY(-200px) translateX(-100px); opacity: 0; }
            25%  { transform: scale(1) rotateZ(-5deg) translateY(-100px) translateX(-50px); opacity: 1; }
            50%  { transform: scale(1) rotateZ(0deg) translateY(0px) translateX(-25px); opacity: 1; }
            75%  { transform: scale(0.5) rotateZ(5deg) translateY(50px) translateX(0px); opacity: 1; }
            100% { transform: scale(0) rotateZ(10deg) translateY(100px) translateX(25px); opacity: 0; }
          }
          @keyframes flowe-three {
            0%   { transform: scale(0.5) rotateZ(10deg) translateY(-200px) translateX(100px); opacity: 0; }
            25%  { transform: scale(1) rotateZ(5deg) translateY(-100px) translateX(50px); opacity: 1; }
            50%  { transform: scale(1) rotateZ(0deg) translateY(0px) translateX(25px); opacity: 1; }
            75%  { transform: scale(0.5) rotateZ(-5deg) translateY(50px) translateX(0px); opacity: 1; }
            100% { transform: scale(0) rotateZ(-10deg) translateY(100px) translateX(-25px); opacity: 0; }
          }
          @keyframes ld-fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div className="ld-bg-glow" />

        {/* Petal loader */}
        <div className="ld-loader-wrap">
          {/* Petal SVG — three instances */}
          {[{cls:'ld-petal-one'},{cls:'ld-petal-two'},{cls:'ld-petal-three'}].map(({cls})=>(
            <div key={cls} className={cls}>
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g>
                  <path d="M50 10 C30 10, 10 30, 10 50 C10 70, 30 90, 50 90 C50 90, 50 70, 50 50 C50 30, 50 10, 50 10Z" fill="#7c3aed"/>
                  <path d="M50 10 C70 10, 90 30, 90 50 C90 70, 70 90, 50 90 C50 90, 50 70, 50 50 C50 30, 50 10, 50 10Z" fill="#a78bfa" opacity="0.6"/>
                </g>
              </svg>
            </div>
          ))}
        </div>

        {/* Logo + text */}
        <div style={{ marginTop:48, textAlign:'center', animation:'ld-fade-in .6s ease both', animationDelay:'.15s', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:11, letterSpacing:'.25em', textTransform:'uppercase', color:'rgba(255,255,255,.28)', fontWeight:700 }}>
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
