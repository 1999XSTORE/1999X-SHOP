import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

export default function LoginPage() {
  const { i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen flex" style={{ background: '#06060f' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,50,220,0.15) 0%, rgba(6,6,15,0) 100%)' }}>
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px]" style={{ background: 'rgba(99,50,220,0.2)' }} />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6332dc,#4c1d95)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white font-display text-lg">1999X</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <p className="label text-purple-400 mb-3">Premium Software Panel</p>
            <h1 className="text-5xl font-bold text-white leading-tight font-display">
              The panel that<br />
              <span style={{ background: 'linear-gradient(135deg,#a78bfa,#6332dc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                works for you
              </span>
            </h1>
          </div>
          <p className="text-white/40 text-base leading-relaxed max-w-sm">
            Fake Lag & Internal tools for Free Fire. Fast activation, instant delivery, undetected.
          </p>
          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#6332dc','#4c1d95','#7c3aed','#5b21b6'].map((c,i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white" style={{ background: c, borderColor: '#06060f' }}>
                  {String.fromCharCode(65+i)}
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">1,345+ users</p>
              <p className="text-xs text-white/30">trust 1999X</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <p className="text-xs text-white/20">OB52 · Undetected · Updated</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-sm anim-scale-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6332dc,#4c1d95)' }}>
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white font-display">1999X</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white font-display mb-1">Sign in</h2>
            <p className="text-sm text-white/35">Access your panel dashboard</p>
          </div>

          {/* Language picker */}
          <div className="relative mb-5">
            <button onClick={() => setLangOpen(!langOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="flex items-center gap-2.5 text-sm text-white/60">
                <Globe className="w-4 h-4 text-white/25" />
                <span>{currentLang.flag}</span>
                <span>{currentLang.label}</span>
              </span>
              <svg className="w-3.5 h-3.5 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {langOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border z-50 overflow-hidden shadow-2xl"
                style={{ background: 'rgba(10,10,20,0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 200, overflowY: 'auto' }}>
                {LANGUAGES.map(lang => (
                  <button key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                    className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5',
                      lang.code === i18n.language ? 'text-purple-400 font-semibold' : 'text-white/50')}>
                    <span>{lang.flag}</span><span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 divider" />
            <span className="text-xs text-white/20">continue with</span>
            <div className="flex-1 divider" />
          </div>

          {/* Google button */}
          <button onClick={handleGoogleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.97] disabled:opacity-50 shimmer"
            style={{ background: 'linear-gradient(135deg,#6332dc,#4c1d95)', boxShadow: '0 0 40px rgba(99,50,220,0.35), 0 4px 20px rgba(0,0,0,0.4)' }}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fillOpacity=".9"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fillOpacity=".8"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fillOpacity=".7"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fillOpacity=".6"/>
              </svg>
            )}
            Google
          </button>

          <p className="text-[11px] text-white/20 text-center mt-5">
            By signing in you agree to our Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
