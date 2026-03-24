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
      <div style={{ minHeight:'100svh', background:'#07080f', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        <style>{`
          @keyframes splash-pulse { 0%,100%{transform:scale(1);filter:drop-shadow(0 0 20px rgba(139,92,246,.6));} 50%{transform:scale(1.08);filter:drop-shadow(0 0 40px rgba(139,92,246,.9)) drop-shadow(0 0 80px rgba(109,40,217,.4));} }
          @keyframes splash-ring { 0%{transform:scale(0.6);opacity:.8;} 100%{transform:scale(2.2);opacity:0;} }
          @keyframes splash-bar { 0%{width:0%;} 100%{width:100%;} }
          @keyframes splash-float { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-8px);} }
          @keyframes splash-orb { 0%,100%{opacity:.4;transform:scale(1);} 50%{opacity:.7;transform:scale(1.1);} }
          @keyframes splash-text { 0%{opacity:0;letter-spacing:8px;} 100%{opacity:1;letter-spacing:2px;} }
          @keyframes splash-fade-up { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
        `}</style>

        {/* Background ambient orbs */}
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(109,40,217,.18) 0%, transparent 70%)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', animation:'splash-orb 4s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(16,232,152,.08) 0%, transparent 70%)', top:'20%', right:'15%', animation:'splash-orb 5s ease-in-out 1s infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle, rgba(56,189,248,.08) 0%, transparent 70%)', bottom:'20%', left:'10%', animation:'splash-orb 6s ease-in-out 0.5s infinite', pointerEvents:'none' }}/>

        {/* Expanding rings */}
        {[0,1,2].map(i => (
          <div key={i} style={{ position:'absolute', width:120, height:120, borderRadius:'50%', border:'1px solid rgba(139,92,246,.3)', animation:`splash-ring 2.4s ease-out ${i*0.6}s infinite`, pointerEvents:'none' }}/>
        ))}

        {/* Main content */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0, position:'relative', zIndex:2 }}>

          {/* Logo with float animation */}
          <div style={{ animation:'splash-float 3s ease-in-out infinite', marginBottom:28 }}>
            <img
              src="https://www.dropbox.com/scl/fi/uv2artcam1x5w1afg7ecc/1999XX-Png.png?raw=1"
              alt="1999X"
              style={{ height:72, width:'auto', objectFit:'contain', animation:'splash-pulse 2s ease-in-out infinite' }}
            />
          </div>

          {/* Brand name */}
          <div style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'2px', textTransform:'uppercase', animation:'splash-text .8s cubic-bezier(.22,1,.36,1) .3s both', marginBottom:6, fontFamily:'inherit' }}>
            1999X
          </div>
          <div style={{ fontSize:11, fontWeight:500, color:'rgba(255,255,255,.3)', letterSpacing:'4px', textTransform:'uppercase', animation:'splash-fade-up .8s ease .5s both', marginBottom:32 }}>
            Premium Panel
          </div>

          {/* Loading bar */}
          <div style={{ width:180, height:2, borderRadius:2, background:'rgba(255,255,255,.06)', overflow:'hidden', animation:'splash-fade-up .5s ease .4s both' }}>
            <div style={{ height:'100%', borderRadius:2, background:'linear-gradient(90deg, #8b5cf6, #10e898)', animation:'splash-bar 2s cubic-bezier(.4,0,.2,1) .6s both', boxShadow:'0 0 8px rgba(139,92,246,.6)' }}/>
          </div>

          {/* Loading dots */}
          <div style={{ display:'flex', gap:6, marginTop:20, animation:'splash-fade-up .5s ease .7s both' }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ width:4, height:4, borderRadius:'50%', background:i%2===0?'rgba(139,92,246,.7)':'rgba(16,232,152,.5)', animation:`blink 1.4s ease-in-out ${i*0.15}s infinite` }}/>
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
      <SafePageContent>
        <PageComponent />
      </SafePageContent>
    </AppLayout>
  );
}
