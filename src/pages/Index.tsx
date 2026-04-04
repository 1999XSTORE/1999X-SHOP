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
import { canAccessPath, getDefaultPathForRole, normalizeRole, type AppRole } from '@/lib/roles';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LicensesPage = lazy(() => import('@/pages/LicensesPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const SupportPage = lazy(() => import('@/pages/SupportPage'));
const WalletPage = lazy(() => import('@/pages/WalletPage'));
const AnnouncementsPage = lazy(() => import('@/pages/AnnouncementsPage'));
const AdminActivityPage = lazy(() => import('@/pages/AdminActivityPage'));
const ResellerPage       = lazy(() => import('@/pages/ResellerPage'));

const pageComponents: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  '/':                DashboardPage,
  '/licenses':        LicensesPage,
  '/chat':            ChatPage,
  '/support':         SupportPage,
  '/wallet':          WalletPage,
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



async function fetchRole(email: string): Promise<AppRole> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return 'user';

  const [{ data: roleRow }, { data: subscriptionRow }] = await Promise.all([
    safeQuery<any>(
      async () => await supabase.from('user_roles').select('role').eq('email', normalizedEmail).maybeSingle(),
      5000
    ),
    safeQuery<any>(
      async () => await supabase
        .from('reseller_subscriptions')
        .select('id,status')
        .eq('email', normalizedEmail)
        .in('status', ['active'])
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle(),
      5000
    ),
  ]);

  const dbRole = normalizeRole(roleRow?.role);
  if (dbRole === 'owner' || dbRole === 'admin' || dbRole === 'support') return dbRole as AppRole;
  return subscriptionRow ? 'reseller' : 'user';
}

export default function Index() {
  const { isAuthenticated, user, login, logout, addBalance, setUserRole, setOnlineUsers } = useAppStore();

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

  const [refErrorModal, setRefErrorModal] = useState(false);

  useEffect(() => {
    // 1. Verify referral link before proceeding
    import('@/lib/reseller').then(async ({ captureReferralFromUrl, fetchResellerPaymentMethods, normalizeReferralValue, clearStoredReferralEmail, getStoredReferralEmail, storeReferralEmail }) => {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref');

      if (urlRef) {
        const ref = normalizeReferralValue(urlRef);
        if (ref) {
          const pm = await fetchResellerPaymentMethods(supabase, ref);
          if (pm?._paused) {
            clearStoredReferralEmail();
            setRefErrorModal(true);
            setAuthReady(true);
            return; // stop execution for ref loading
          } else {
            storeReferralEmail(ref);
          }
        }
      } else {
        const stored = getStoredReferralEmail();
        if (stored) {
          const pm = await fetchResellerPaymentMethods(supabase, stored);
          if (pm?._paused) {
            clearStoredReferralEmail();
          }
        }
      }
      captureReferralFromUrl();

      // 2. Auth checking
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
    }); // End of import block
  }, []);

  useEffect(() => {
    if (!user?.id || !user.email) return;
    captureReferralFromUrl(user.email);
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!user?.role) return;
    if (canAccessPath(currentPath, user.role)) return;
    navigate(getDefaultPathForRole(user.role));
  }, [currentPath, user?.role]);

  useEffect(() => {
    if (!user?.email || !isAuthenticated) return;

    let cancelled = false;

    const syncRole = async () => {
      const nextRole = await fetchRole(user.email);
      if (!cancelled && nextRole !== user.role) setUserRole(nextRole);
    };

    void syncRole();
    const interval = window.setInterval(syncRole, 30000);
    const onFocus = () => { void syncRole(); };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated, user?.email]);

  const handleLogout = async () => {
    intentionalLogout.current = true;
    savePath('/'); // reset saved path on logout
    logout();
    if (!user?.id?.startsWith('staff_')) {
      try { await supabase.auth.signOut(); } catch {}
    }
  };


  useEffect(() => {
    if (!user || user.role === 'owner' || user.role === 'admin' || user.role === 'support') return;

    // ── CRITICAL: credited tracking is stored in Supabase, not localStorage ──
    // localStorage was wiped on new device/browser causing re-crediting of all old transactions
    const rejectedKey = `1999x-rejected-${user.id}`;

    const readRejected = (): Set<string> => {
      try { return new Set<string>(JSON.parse(localStorage.getItem(rejectedKey) || '[]')); }
      catch { return new Set<string>(); }
    };
    const writeRejected = (id: string) => {
      const ids = readRejected();
      if (ids.has(id)) return;
      ids.add(id);
      try { localStorage.setItem(rejectedKey, JSON.stringify([...ids])); } catch {}
    };

    let checking = false;
    let disposed = false;

    const syncBalance = async () => {
      if (checking || disposed) return;
      checking = true;
      try {
        // Fetch transactions WITH the credited flag from DB
        const { data, error } = await safeQuery(
          async () => await supabase
            .from('transactions')
            .select('id, amount, status, credited')
            .eq('user_id', user.id)
        );
        if (error || !data || disposed) return;

        const rows = data as Array<{ id: string; amount: number; status: string; credited?: boolean }>;

        for (const tx of rows) {
          if (tx.status === 'approved') {
            // Only credit if DB says it hasn't been credited yet
            // tx.credited may not exist on old rows — treat null/undefined as not credited
            const alreadyCredited = tx.credited === true;
            if (!alreadyCredited) {
              // Mark as credited in DB FIRST before adding balance (prevent race)
              const { error: markErr } = await supabase
                .from('transactions')
                .update({ credited: true })
                .eq('id', tx.id)
                .eq('user_id', user.id); // extra safety filter

              if (!markErr) {
                addBalance(Number(tx.amount) || 0);
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
              // If markErr (e.g. column doesn't exist yet), fall back silently — don't double-credit
            }
          }

          if (tx.status === 'rejected') {
            const rejected = readRejected();
            if (!rejected.has(tx.id)) {
              writeRejected(tx.id);
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
  }, [addBalance, user?.id, user?.role]);

  // ── Global Presence Tracking ────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const ch = supabase.channel('chat_presence', { config: { presence: { key: user.id } } });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const uniqueUsers = new Map();
      
      Object.values(state).flatMap((s: any) => s).forEach((s: any) => {
        if (!uniqueUsers.has(s.userId)) {
          uniqueUsers.set(s.userId, {
            userId: s.userId,
            userName: s.userName,
            userAvatar: s.userAvatar || '',
            userRole: s.userRole || 'user',
          });
        }
      });
      
      setOnlineUsers(Array.from(uniqueUsers.values()));
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({
          userId: user.id,
          userName: user.name,
          userAvatar: user.avatar || '',
          userRole: user.role || 'user',
        });
      }
    });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, user?.name, user?.avatar, user?.role, setOnlineUsers]);

  // ── Loading screen — only shown if NOT already authenticated ──
  // If Zustand has isAuthenticated=true, skip straight to app
  if (!authReady) {
    return (
      <div style={{ minHeight:'100svh', background:'#080809', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        <style>{`
          @keyframes auth-bounce {
            0%   { transform: scale(1, 0.7); }
            40%  { transform: scale(0.8, 1.2); }
            60%  { transform: scale(1, 1); }
            100% { bottom: 140px; }
          }
          @keyframes auth-step {
            0%   { box-shadow: 0 10px 0 rgba(0,0,0,0), 0 10px 0 rgba(139,92,246,.7), -35px 50px 0 rgba(139,92,246,.7), -70px 90px 0 rgba(139,92,246,.7); }
            100% { box-shadow: 0 10px 0 rgba(139,92,246,.7), -35px 50px 0 rgba(139,92,246,.7), -70px 90px 0 rgba(139,92,246,.7), -70px 90px 0 rgba(0,0,0,0); }
          }
          @keyframes auth-fade { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
          @keyframes auth-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }

          .auth-loader {
            position: relative; width: 120px; height: 90px;
            filter: drop-shadow(0 0 20px rgba(124,92,255,.5));
          }
          .auth-loader:before {
            content: ''; position: absolute;
            bottom: 30px; left: 50px;
            height: 30px; width: 30px; border-radius: 50%;
            background: linear-gradient(135deg, #7c3aed, #a78bfa);
            animation: auth-bounce .5s ease-in-out infinite alternate;
          }
          .auth-loader:after {
            content: ''; position: absolute;
            right: 0; top: 0; height: 7px; width: 45px; border-radius: 4px;
            box-shadow: 0 5px 0 rgba(167,139,250,.55), -35px 50px 0 rgba(167,139,250,.55), -70px 95px 0 rgba(167,139,250,.55);
            animation: auth-step 1s ease-in-out infinite;
          }
          .auth-glow {
            position: absolute; bottom: -80px; left: 50%; transform: translateX(-50%);
            width: 500px; height: 250px; border-radius: 50%;
            background: radial-gradient(ellipse, rgba(109,40,217,.15) 0%, transparent 70%);
            pointer-events: none;
          }
          .auth-text {
            animation: auth-fade .6s .3s ease both;
            font-size: 11px; letter-spacing: .22em; text-transform: uppercase;
            color: rgba(255,255,255,.25); font-weight: 700; margin-top: 52px;
            animation: auth-pulse 2s ease-in-out infinite;
          }
        `}</style>

        <div className="auth-glow"/>
        <div className="auth-loader"/>
        <div className="auth-text">Loading your panel…</div>
      </div>
    );
  }

  if (refErrorModal) {
    return (
      <div style={{ minHeight:'100svh', background:'#080809', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', padding: 20 }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 0 40px rgba(239,68,68,.2)' }}>
          <span style={{ fontSize: 36 }}>🚫</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12, letterSpacing: '-.02em', textAlign: 'center' }}>Reseller Link Inactive</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', maxWidth: 360, marginBottom: 32, lineHeight: 1.6 }}>
          This reseller's subscription has been paused or deleted. Please contact them or continue to the main shop to make a purchase.
        </div>
        <button onClick={() => { window.location.href = '/'; }} className="btn btn-p" style={{ padding: '14px 28px', fontSize: 15, fontWeight: 700, borderRadius: 14, boxShadow: '0 0 30px rgba(139,92,246,.3)' }}>
          Go to Main Shop
        </button>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  const PageComponent = pageComponents[currentPath] || DashboardPage;

  return (
    <AppLayout currentPath={currentPath} onNavigate={navigate} onLogout={handleLogout}>
      <SafePageContent>
        <Suspense fallback={null}>
          <PageComponent />
        </Suspense>
      </SafePageContent>
    </AppLayout>
  );
}
