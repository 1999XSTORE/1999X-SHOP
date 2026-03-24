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

  // ── Loading screen — only shown if NOT already authenticated ──
  // If Zustand has isAuthenticated=true, skip straight to app
  if (!authReady) {
    return (
      <div style={{ minHeight:'100svh', background:'radial-gradient(circle at 20% 20%, rgba(109,40,217,.18), transparent 28%), radial-gradient(circle at 80% 75%, rgba(16,232,152,.12), transparent 24%), #05060b', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        <style>{`
          @keyframes bullet-travel { 0%{transform:translateX(-180px) translateY(-10px) scale(.7);} 45%{transform:translateX(0) translateY(0) scale(1);} 100%{transform:translateX(30px) translateY(2px) scale(.92);} }
          @keyframes flash-hit { 0%,42%{opacity:0;} 48%{opacity:1;} 100%{opacity:0;} }
          @keyframes skull-shatter { 0%,42%{transform:scale(1) rotate(0deg); filter:drop-shadow(0 0 20px rgba(139,92,246,.35));} 55%{transform:scale(1.12) rotate(-3deg);} 100%{transform:scale(.92) rotate(4deg); filter:drop-shadow(0 0 34px rgba(16,232,152,.28));} }
          @keyframes shard-burst { 0%,42%{opacity:0; transform:translate(0,0) scale(.4);} 55%{opacity:1;} 100%{opacity:0; transform:translate(var(--tx), var(--ty)) scale(1);} }
          @keyframes load-bar { from{width:0;} to{width:100%;} }
        `}</style>

        <div style={{ position:'relative', zIndex:2, width:'min(92vw, 760px)', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ position:'relative', width:'100%', aspectRatio:'16 / 9', borderRadius:30, border:'1px solid rgba(255,255,255,.08)', background:'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.01))', boxShadow:'0 30px 90px rgba(0,0,0,.6)', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at center, rgba(139,92,246,.1), transparent 45%)' }} />
            <div style={{ position:'absolute', left:'18%', top:'44%', width:110, height:20, borderRadius:999, background:'linear-gradient(90deg,#e5f6ff,#9be7ff)', boxShadow:'0 0 32px rgba(155,231,255,.8)', animation:'bullet-travel 2s cubic-bezier(.2,.8,.2,1) both' }} />
            <div style={{ position:'absolute', left:'50%', top:'50%', width:24, height:24, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,255,255,.95), rgba(139,92,246,.5), transparent 70%)', transform:'translate(-50%,-50%)', animation:'flash-hit 2s ease-out both' }} />
            <div style={{ position:'absolute', left:'50%', top:'49%', transform:'translate(-50%,-50%)', width:220, height:240, animation:'skull-shatter 2s ease-out both' }}>
              <div style={{ position:'absolute', inset:0, clipPath:'polygon(50% 0%, 78% 12%, 92% 38%, 88% 66%, 68% 90%, 50% 100%, 32% 90%, 12% 66%, 8% 38%, 22% 12%)', background:'linear-gradient(135deg, rgba(16,232,152,.28), rgba(139,92,246,.35) 55%, rgba(255,255,255,.08))', border:'1px solid rgba(255,255,255,.12)' }} />
              <div style={{ position:'absolute', left:48, top:76, width:42, height:42, borderRadius:'50%', background:'rgba(5,6,11,.88)', boxShadow:'0 0 18px rgba(16,232,152,.28)' }} />
              <div style={{ position:'absolute', right:48, top:76, width:42, height:42, borderRadius:'50%', background:'rgba(5,6,11,.88)', boxShadow:'0 0 18px rgba(139,92,246,.35)' }} />
              <div style={{ position:'absolute', left:'50%', top:126, transform:'translateX(-50%)', width:28, height:34, clipPath:'polygon(50% 0%, 100% 100%, 0% 100%)', background:'rgba(5,6,11,.9)' }} />
              <div style={{ position:'absolute', left:46, right:46, bottom:44, height:24, borderTop:'1px solid rgba(255,255,255,.12)' }} />
            </div>
            {[
              ['-90px','-70px'], ['110px','-58px'], ['-120px','58px'], ['90px','82px'], ['24px','-110px'], ['-14px','124px'],
            ].map(([tx, ty], i) => (
              <div key={i} style={{ '--tx': tx, '--ty': ty } as any}>
                <div style={{ position:'absolute', left:'50%', top:'50%', width:18, height:18, background:i % 2 === 0 ? 'rgba(139,92,246,.75)' : 'rgba(16,232,152,.72)', clipPath:'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', animation:'shard-burst 2s ease-out both', animationDelay:`${0.02 * i}s` }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop:22, fontSize:13, letterSpacing:'.26em', textTransform:'uppercase', color:'rgba(255,255,255,.55)', textAlign:'center' }}>
            Cinematic Boot Sequence
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
