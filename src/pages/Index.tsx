import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeFetch';
import { logActivity } from '@/lib/activity';
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
import AdminActivityPage from '@/pages/AdminActivityPage';
import SafePageContent from '@/components/layout/SafePageContent';
import { toast } from 'sonner';

const pageComponents: Record<string, React.FC> = {
  '/':              DashboardPage,
  '/licenses':      LicensesPage,
  '/chat':          ChatPage,
  '/support':       SupportPage,
  '/panel-status':  PanelStatusPage,
  '/wallet':        WalletPage,
  '/bonus':         BonusPage,
  '/announcements':    AnnouncementsPage,
  '/admin-activity':   AdminActivityPage,
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
  const { isAuthenticated, user, login, logout, addBalance } = useAppStore();

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

        for (const tx of data as Array<{ id: string; amount: number; status: string }>) {
          if (tx.status === 'approved') {
            const credited = readIds(creditedKey);
            if (!credited.has(tx.id)) {
              addBalance(Number(tx.amount) || 0);
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
  }, [addBalance, user?.id, user?.role]);

  // ── Loading screen — only shown if NOT already authenticated ──
  // If Zustand has isAuthenticated=true, skip straight to app
  if (!authReady) {
    return (
      <div style={{ minHeight:'100svh', background:'radial-gradient(circle at 20% 20%, rgba(109,40,217,.18), transparent 28%), radial-gradient(circle at 80% 75%, rgba(16,232,152,.12), transparent 24%), #05060b', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        <style>{`
          @keyframes word-spin {
            10% { transform: translateY(-102%); }
            25% { transform: translateY(-100%); }
            35% { transform: translateY(-202%); }
            50% { transform: translateY(-200%); }
            60% { transform: translateY(-302%); }
            75% { transform: translateY(-300%); }
            85% { transform: translateY(-402%); }
            100% { transform: translateY(-400%); }
          }
          @keyframes load-bar { from{width:0;} to{width:100%;} }
          @keyframes soft-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
        `}</style>

        <div style={{ position:'relative', zIndex:2, width:'min(92vw, 760px)', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ position:'relative', width:'100%', maxWidth:560, borderRadius:32, border:'1px solid rgba(255,255,255,.08)', background:'linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.015))', boxShadow:'0 30px 90px rgba(0,0,0,.6)', overflow:'hidden', padding:'42px 28px' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 30% 20%, rgba(139,92,246,.14), transparent 34%), radial-gradient(circle at 75% 80%, rgba(16,232,152,.1), transparent 30%)' }} />
            <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:24, animation:'soft-float 3.4s ease-in-out infinite' }}>
              <div style={{ width:78, height:78, borderRadius:24, background:'linear-gradient(135deg, rgba(139,92,246,.22), rgba(16,232,152,.14))', border:'1px solid rgba(255,255,255,.12)', boxShadow:'0 0 40px rgba(139,92,246,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ fontSize:26, fontWeight:900, color:'#fff', letterSpacing:'.08em' }}>1999X</div>
              </div>

              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:14, letterSpacing:'.18em', textTransform:'uppercase', color:'rgba(255,255,255,.45)', fontWeight:800, marginBottom:8 }}>
                  1999X SHOP - BUY FREE FIRE PANELS
                </div>
                <div style={{ fontSize:29, fontWeight:900, color:'#fff', lineHeight:1.2 }}>
                  Preparing your panel access
                </div>
              </div>

              <div style={{ '--bg-color': '#0d0f17' } as React.CSSProperties}>
                <div style={{ background:'rgba(10,12,18,.88)', padding:'1rem 1.6rem', borderRadius:'1.25rem', border:'1px solid rgba(255,255,255,.08)', boxShadow:'0 0 32px rgba(139,92,246,.12)' }}>
                  <div style={{ color:'rgb(145, 145, 160)', fontFamily:'Poppins, sans-serif', fontWeight:600, fontSize:25, boxSizing:'content-box', height:40, padding:'10px 10px', display:'flex', borderRadius:8 }}>
                    <p style={{ margin:0 }}>loading</p>
                    <div style={{ overflow:'hidden', position:'relative', marginLeft:6 }}>
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(var(--bg-color) 10%, transparent 30%, transparent 70%, var(--bg-color) 90%)', zIndex:20 }} />
                      {['aimbot', 'headshot', 'free', 'fire', '1999X'].map((word) => (
                        <span key={word} style={{ display:'block', height:'100%', paddingLeft:6, color:'#956afa', animation:'word-spin 4s infinite', fontWeight:800 }}>
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ width:220, height:3, borderRadius:999, background:'rgba(255,255,255,.08)', overflow:'hidden', marginTop:16 }}>
            <div style={{ width:'100%', height:'100%', background:'linear-gradient(90deg,#8b5cf6,#10e898)', boxShadow:'0 0 16px rgba(139,92,246,.5)', animation:'load-bar 2s linear both' }} />
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
        <PageComponent />
      </SafePageContent>
    </AppLayout>
  );
}
