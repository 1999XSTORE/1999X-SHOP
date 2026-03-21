import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAppStore } from './lib/store';
import type { User as AppUser } from './lib/store';

// Pages / components
import BonusPage           from './components/BonusPage';
import LicensesPage        from './components/LicensesPage';
import AdminPanel          from './components/AdminPanel';
import PurchaseHistoryPage from './components/PurchaseHistoryPage';
import { PRODUCTS }        from './lib/store';
import ProductCard         from './components/ProductCard';

// Lucide icons
import {
  LayoutDashboard, ShoppingBag, Key, Flame,
  History, ShieldCheck, LogOut, Menu, X,
  Wallet, Star,
} from 'lucide-react';

// ─── Tiny Dashboard page (inline) ───────────────────────────
function DashboardPage() {
  const { user, balance, bonusPoints, licenses, claimBonus, lastBonusClaim, claimStreak } = useAppStore();
  const canClaim = !lastBonusClaim || Date.now() - new Date(lastBonusClaim).getTime() >= 86400000;
  const [claiming, setClaiming] = useState(false);
  const navigate = useNavigate();

  const handleClaim = async () => {
    setClaiming(true);
    await new Promise(r => setTimeout(r, 600));
    claimBonus();
    setClaiming(false);
  };

  const activeKeys = licenses.filter(l => l.status === 'active').length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-black mb-1" style={{ color: 'rgba(255,255,255,0.95)' }}>
          Welcome back, <span className="tg-p">{user?.name?.split(' ')[0] ?? 'User'}</span> 👋
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Here's your account overview.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Balance', value: `$${balance.toFixed(2)}`, icon: Wallet, color: '#10e898' },
          { label: 'Active Keys', value: activeKeys, icon: Key, color: '#a78bfa' },
          { label: 'Bonus Pts', value: bonusPoints, icon: Star, color: '#fbbf24' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="g rounded-2xl p-4 text-center">
            <Icon className="w-5 h-5 mx-auto mb-2" style={{ color, opacity: 0.8 }} />
            <div className="font-black text-xl leading-none mb-1" style={{ color }}>{value}</div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Quick daily claim */}
      <div className="g rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <div className="font-bold text-sm mb-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Daily Bonus {claimStreak > 1 && <span style={{ color: '#fbbf24' }}>🔥 {claimStreak} day streak!</span>}
          </div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>+10 pts daily · 100 pts = $3 reward</div>
        </div>
        <button
          onClick={canClaim ? handleClaim : () => navigate('/bonus')}
          disabled={claiming}
          className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0"
          style={{
            background: canClaim ? 'linear-gradient(135deg,#6d28d9,#8b5cf6)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${canClaim ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
            color: canClaim ? '#fff' : 'rgba(255,255,255,0.3)',
            boxShadow: canClaim ? '0 4px 20px rgba(109,40,217,0.3)' : 'none',
          }}
        >
          {claiming ? '...' : canClaim ? '⚡ Claim +10 pts' : 'View Bonus →'}
        </button>
      </div>

      {/* Active licenses quick view */}
      {activeKeys > 0 ? (
        <div className="g rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Active Licenses</span>
            <button onClick={() => navigate('/licenses')} className="text-xs" style={{ color: '#a78bfa' }}>View all →</button>
          </div>
          {licenses.filter(l => l.status === 'active').slice(0, 2).map(l => (
            <div key={l.id} className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{l.productName}</span>
              <span className="font-mono text-xs" style={{ color: '#a78bfa' }}>{l.key.substring(0, 13)}…</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="g rounded-2xl p-5 text-center">
          <Key className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>No active licenses yet.</p>
          <button onClick={() => navigate('/shop')} className="btn btn-p btn-sm">Browse Shop</button>
        </div>
      )}
    </div>
  );
}

// ─── Shop page (inline) ──────────────────────────────────────
function ShopPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black mb-1" style={{ color: 'rgba(255,255,255,0.95)' }}>Shop</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Purchase a key — delivered instantly to your account.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
      </div>
    </div>
  );
}

// ─── Google Login screen ─────────────────────────────────────
function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg,rgba(109,40,217,0.3),rgba(139,92,246,0.15))', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 40px rgba(109,40,217,0.2)' }}>
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-3xl font-black mb-2 tg-multi">1999X Panel</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Premium Software Panel — Sign in to continue</p>
        </div>

        {/* Glass card */}
        <div className="g rounded-3xl p-8">
          <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Sign in with your Google account to access your licenses, balance, and rewards.
          </p>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm transition-all"
            style={{
              background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: loading ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.9)',
            }}
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Your key is bound to your Google account for security.
        </p>
      </div>
    </div>
  );
}

// ─── Nav item definition ─────────────────────────────────────
const NAV = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/shop',     label: 'Shop',      icon: ShoppingBag },
  { to: '/licenses', label: 'Licenses',  icon: Key },
  { to: '/bonus',    label: 'Bonus',     icon: Flame },
  { to: '/history',  label: 'History',   icon: History },
];

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const { user, login, logout, isAuthenticated, balance } = useAppStore();
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Supabase auth listener
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await syncUser(session.user);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) await syncUser(session.user);
      else logout();
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncUser = async (supaUser: any) => {
    // Check admin role from user_roles table
    let role: 'user' | 'admin' | 'support' = 'user';
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('email', supaUser.email)
        .single();
      if (data?.role) role = data.role as any;
    } catch {}

    const appUser: AppUser = {
      id:     supaUser.id,
      email:  supaUser.email ?? '',
      name:   supaUser.user_metadata?.full_name ?? supaUser.email ?? 'User',
      avatar: supaUser.user_metadata?.avatar_url ?? '',
      role,
    };
    login(appUser);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  // Loading splash
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Topbar ── */}
      <header className="topbar sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 font-black text-lg" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-xl">🔑</span>
            <span className="tg-multi">1999X</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'text-white'
                      : 'hover:text-white/70'
                  }`
                }
                style={({ isActive }) => isActive ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', color: '#c4b5fd' } : { color: 'rgba(255,255,255,0.4)' }}
              >
                <Icon size={13} />
                {label}
              </NavLink>
            ))}
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all`}
                style={({ isActive }) => isActive
                  ? { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }
                  : { color: 'rgba(248,113,113,0.5)' }
                }
              >
                <ShieldCheck size={13} /> Admin
              </NavLink>
            )}
          </nav>

          {/* Right side: balance + avatar + logout */}
          <div className="flex items-center gap-2">
            {/* Balance chip */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(16,232,152,0.08)', border: '1px solid rgba(16,232,152,0.18)' }}>
              <Wallet size={11} style={{ color: '#10e898' }} />
              <span className="text-xs font-bold" style={{ color: '#10e898' }}>${balance.toFixed(2)}</span>
            </div>

            {/* Avatar */}
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" style={{ border: '1px solid rgba(139,92,246,0.3)' }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}

            {/* Logout */}
            <button onClick={handleLogout} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-red-500/10" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <LogOut size={14} />
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(v => !v)} className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(7,8,15,0.97)' }}>
            <div className="px-4 py-3 grid grid-cols-3 gap-2">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-semibold transition-all`}
                  style={({ isActive }) => isActive
                    ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', color: '#c4b5fd' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
              {user?.role === 'admin' && (
                <NavLink to="/admin" onClick={() => setMobileOpen(false)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-semibold"
                  style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#f87171' }}
                >
                  <ShieldCheck size={16} /> Admin
                </NavLink>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Page content ── */}
      <main className="flex-1">
        <Routes>
          <Route path="/"         element={<DashboardPage />} />
          <Route path="/shop"     element={<ShopPage />} />
          <Route path="/licenses" element={<LicensesPage />} />
          <Route path="/bonus"    element={<BonusPage />} />
          <Route path="/history"  element={<PurchaseHistoryPage />} />
          <Route path="/admin"    element={user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
          <Route path="*"         element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* ── Mobile bottom bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50" style={{ background: 'rgba(7,8,15,0.95)', borderTop: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>
        <div className="grid grid-cols-5 gap-0">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `flex flex-col items-center gap-1 py-3 text-[9px] font-semibold uppercase tracking-wider transition-all`}
              style={({ isActive }) => ({ color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.3)' })}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom nav spacer on mobile */}
      <div className="md:hidden h-16" />
    </div>
  );
}
