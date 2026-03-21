import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader2, Shield, Zap, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', label: 'English',     flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',    flag: '🇸🇦' },
  { code: 'bn', label: 'বাংলা',      flag: '🇧🇩' },
  { code: 'th', label: 'ไทย',        flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'hi', label: 'हिन्दी',     flag: '🇮🇳' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'ja', label: '日本語',     flag: '🇯🇵' },
  { code: 'ko', label: '한국어',     flag: '🇰🇷' },
  { code: 'zh', label: '中文',       flag: '🇨🇳' },
  { code: 'ru', label: 'Русский',    flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe',     flag: '🇹🇷' },
];

export default function LoginPage() {
  const { i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const [loading, setLoading]   = useState(false);
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { toast.error(error.message); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#080810' }}>
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/40 via-transparent to-violet-950/20" />
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[120px] animate-pulse" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-800/6 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* Noise */}
      <div className="fixed inset-0 opacity-[0.015]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="animate-scale-in">

          {/* Card */}
          <div className="glass-dark rounded-3xl p-8 border border-white/8 shadow-2xl shadow-black/60">

            {/* Brand */}
            <div className="text-center mb-8">
              <div className="relative inline-flex mb-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}>
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.6)' }}>
                  <span className="text-[7px] font-black text-emerald-900">✓</span>
                </div>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>1999X</h1>
              <p className="text-[11px] text-white/30 tracking-[4px] uppercase mt-1">Premium Panel</p>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 mb-7">
              {[
                { icon: Shield, text: 'Undetected' },
                { icon: Zap,    text: 'Instant'    },
                { icon: Lock,   text: 'Secure'     },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-[10px] text-white/35">
                  <Icon className="w-3 h-3 text-violet-400" />{text}
                </div>
              ))}
            </div>

            {/* Language picker */}
            <div className="relative mb-5">
              <button onClick={() => setLangOpen(!langOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/4 border border-white/8 text-sm text-white hover:bg-white/6 transition-colors">
                <span className="flex items-center gap-2">
                  <span>{currentLang.flag}</span>
                  <span className="text-xs text-white/60">{currentLang.label}</span>
                </span>
                <Globe className="w-3.5 h-3.5 text-white/25" />
              </button>
              {langOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded-xl border border-white/10 z-50 shadow-xl"
                  style={{ background: 'rgba(8,8,16,0.97)', backdropFilter: 'blur(20px)' }}>
                  {LANGUAGES.map(lang => (
                    <button key={lang.code}
                      onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                      className={cn('w-full flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-white/5 transition-colors',
                        lang.code === i18n.language ? 'text-violet-400 font-semibold' : 'text-white/50')}>
                      <span>{lang.flag}</span><span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Google button */}
            <button onClick={handleGoogleLogin} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] disabled:opacity-50 relative overflow-hidden group btn-primary">
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all duration-300" />
              {/* Shimmer */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)' }} />
              </div>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <svg className="w-5 h-5 relative" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fillOpacity=".9"/>
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fillOpacity=".8"/>
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fillOpacity=".7"/>
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fillOpacity=".6"/>
                </svg>
              )}
              <span className="relative">Continue with Google</span>
            </button>

            <p className="text-[10px] text-white/20 text-center mt-5">
              By signing in you agree to our Terms of Service
            </p>
          </div>

          {/* Bottom glow */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-10 bg-violet-600/15 blur-2xl rounded-full" />
        </div>
      </div>
    </div>
  );
}
