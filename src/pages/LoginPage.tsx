import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',   flag: '🇸🇦' },
  { code: 'bn', label: 'বাংলা',     flag: '🇧🇩' },
  { code: 'th', label: 'ไทย',       flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt',flag: '🇻🇳' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'hi', label: 'हिन्दी',    flag: '🇮🇳' },
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'ja', label: '日本語',    flag: '🇯🇵' },
  { code: 'ko', label: '한국어',    flag: '🇰🇷' },
  { code: 'zh', label: '中文',      flag: '🇨🇳' },
  { code: 'ru', label: 'Русский',   flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe',    flag: '🇹🇷' },
];

type AuthMode = 'login' | 'signup' | 'forgot';

export default function LoginPage() {
  const { i18n } = useTranslation();
  const { login } = useAppStore();

  const [mode, setMode]         = useState<AuthMode>('login');
  const [langOpen, setLangOpen] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { toast.error(error.message); setLoading(false); }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) { toast.error('Enter email and password'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data.user) {
      login({
        id:     data.user.id,
        email:  data.user.email ?? '',
        name:   data.user.user_metadata?.full_name ?? data.user.email ?? 'User',
        avatar: data.user.user_metadata?.avatar_url ?? '',
        role:   'user',
      });
      toast.success('Welcome back!');
    }
  };

  const handleSignup = async () => {
    if (!email || !password) { toast.error('Enter email and password'); return; }
    if (password.length < 6)  { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Account created! Check your email to verify.');
    setMode('login');
  };

  const handleForgot = async () => {
    if (!email) { toast.error('Enter your email first'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password reset email sent!');
    setMode('login');
  };

  const handleSubmit = () => {
    if (mode === 'login')  return handleEmailLogin();
    if (mode === 'signup') return handleSignup();
    if (mode === 'forgot') return handleForgot();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="app-bg-mesh" />
      <div className="glass-surface rounded-2xl p-8 w-full max-w-sm mx-4 animate-fade-up">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gradient-gold tracking-tight mb-1">1999X</h1>
          <p className="text-xs text-muted-foreground tracking-[3px] uppercase">Premium Software</p>
        </div>

        <div className="flex rounded-xl bg-secondary p-1 mb-6 gap-1">
          {(['login','signup'] as AuthMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize',
                mode === m ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              )}>
              {m}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Language
          </p>
          <button onClick={() => setLangOpen(!langOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground hover:bg-secondary/80 transition-colors">
            <span className="flex items-center gap-2">
              <span>{currentLang.flag}</span>
              <span className="text-xs font-medium">{currentLang.label}</span>
            </span>
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {langOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-xl glass-surface border border-border shadow-xl z-50">
              {LANGUAGES.map(lang => (
                <button key={lang.code} onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors',
                    lang.code === i18n.language ? 'text-primary font-semibold' : 'text-foreground'
                  )}>
                  <span>{lang.flag}</span><span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {mode !== 'forgot' && (
          <>
            <button onClick={handleGoogleLogin} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-semibold text-foreground transition-all active:scale-[0.97] disabled:opacity-60 mb-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          </>
        )}

        <div className="mb-3">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
            className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>

        {mode !== 'forgot' && (
          <div className="mb-4 relative">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Password</label>
            <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="••••••••"
              className="w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-8 text-muted-foreground hover:text-foreground transition-colors text-xs">
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-60">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'login'  && 'Sign In'}
          {mode === 'signup' && 'Create Account'}
          {mode === 'forgot' && 'Send Reset Email'}
        </button>

        <div className="flex items-center justify-between mt-4">
          {mode === 'login' && (
            <button onClick={() => setMode('forgot')} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              Forgot password?
            </button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => setMode('login')} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              ← Back to login
            </button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-5">
          By signing in you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
