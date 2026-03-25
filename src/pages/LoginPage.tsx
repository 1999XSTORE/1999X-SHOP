import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader2, Zap, Shield, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const LANGS = [
  {code:'en',label:'English',flag:'🇬🇧'},{code:'ar',label:'العربية',flag:'🇸🇦'},
  {code:'bn',label:'বাংলা',flag:'🇧🇩'},{code:'th',label:'ไทย',flag:'🇹🇭'},
  {code:'vi',label:'Tiếng Việt',flag:'🇻🇳'},{code:'es',label:'Español',flag:'🇪🇸'},
  {code:'pt',label:'Português',flag:'🇧🇷'},{code:'hi',label:'हिन्दी',flag:'🇮🇳'},
  {code:'fr',label:'Français',flag:'🇫🇷'},{code:'de',label:'Deutsch',flag:'🇩🇪'},
  {code:'ja',label:'日本語',flag:'🇯🇵'},{code:'ko',label:'한국어',flag:'🇰🇷'},
  {code:'zh',label:'中文',flag:'🇨🇳'},{code:'ru',label:'Русский',flag:'🇷🇺'},
  {code:'tr',label:'Türkçe',flag:'🇹🇷'},
];

export default function LoginPage() {
  const { i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const [loading, setLoading]   = useState(false);
  const { t } = useTranslation();
  const cur = LANGS.find(l => l.code === i18n.language) || LANGS[0];
  const loginTimer = useRef<number | null>(null);

  useEffect(() => {
    const resetLoading = () => {
      if (document.visibilityState === 'visible') setLoading(false);
    };
    document.addEventListener('visibilitychange', resetLoading);
    window.addEventListener('focus', resetLoading);
    return () => {
      document.removeEventListener('visibilitychange', resetLoading);
      window.removeEventListener('focus', resetLoading);
      if (loginTimer.current) window.clearTimeout(loginTimer.current);
    };
  }, []);

  const go = async () => {
    if (loading) return;
    setLoading(true);
    if (loginTimer.current) window.clearTimeout(loginTimer.current);
    loginTimer.current = window.setTimeout(() => {
      setLoading(false);
      toast.error('Google login is taking too long. Please try again.');
    }, 12000);
    const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider:'google', options:{ redirectTo }
    });
    if (error) {
      if (loginTimer.current) window.clearTimeout(loginTimer.current);
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:'100svh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'var(--bg)'}}>
      {/* Ambient */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0}}>
        <div style={{position:'absolute',top:'10%',left:'50%',transform:'translateX(-50%)',width:700,height:400,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(109,40,217,.15) 0%,transparent 70%)',filter:'blur(60px)',animation:'gp 4s ease-in-out infinite'}} />
      </div>

      <div className="si" style={{position:'relative',zIndex:1,width:'100%',maxWidth:420}}>
        {/* Card */}
        <div className="g g-lg" style={{padding:'44px 40px',boxShadow:'0 32px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(139,92,246,.12)'}}>

          {/* Logo */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:36}}>
            <div style={{width:56,height:56,borderRadius:15,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 32px rgba(109,40,217,.45)',marginBottom:18}}>
              <Zap size={28} color="#fff"/>
            </div>
            <h1 style={{fontSize:26,fontWeight:800,color:'#fff',letterSpacing:'-.02em',margin:0,marginBottom:8}}>{t('auth.signIn')}</h1>
            <p style={{fontSize:14,color:'var(--muted)',margin:0,textAlign:'center',lineHeight:1.5}}>{t('auth.subtitle')}</p>
          </div>

          {/* Trust badges */}
          <div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:28}}>
            {[{icon:Shield,text:'Undetected',c:'var(--green)'},{icon:Zap,text:'OB52 Ready',c:'var(--purple)'},{icon:Globe,text:'Secure',c:'var(--blue)'}].map(({icon:Icon,text,c})=>(
              <span key={text} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--muted)',background:'var(--surface)',border:'1px solid var(--border)',padding:'4px 10px',borderRadius:20}}>
                <Icon size={11} color={c}/>{text}
              </span>
            ))}
          </div>

          {/* Lang picker */}
          <div style={{position:'relative',marginBottom:14}}>
            <button onClick={()=>setLangOpen(!langOpen)} style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',color:'var(--muted)',fontSize:13,fontFamily:'inherit',transition:'border-color .15s'}}
              onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--border2)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
              <span style={{display:'flex',alignItems:'center',gap:8}}><Globe size={14}/><span>{cur.flag}</span><span>{cur.label}</span></span>
              <ChevronDown size={14}/>
            </button>
            {langOpen&&(
              <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:'rgba(10,11,20,.97)',backdropFilter:'blur(20px)',border:'1px solid var(--border)',borderRadius:12,zIndex:50,maxHeight:188,overflowY:'auto',boxShadow:'0 16px 48px rgba(0,0,0,.55)'}}>
                {LANGS.map(l=>(
                  <button key={l.code} onClick={()=>{i18n.changeLanguage(l.code);setLangOpen(false);}}
                    style={{width:'100%',padding:'9px 14px',display:'flex',alignItems:'center',gap:10,fontSize:13,color:l.code===i18n.language?'var(--purple)':'var(--muted)',background:l.code===i18n.language?'rgba(109,40,217,.08)':'transparent',fontWeight:l.code===i18n.language?600:400,cursor:'pointer',border:'none',textAlign:'left',fontFamily:'inherit'}}>
                    <span>{l.flag}</span><span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{display:'flex',alignItems:'center',gap:10,margin:'18px 0'}}>
            <div className="divider" style={{flex:1}}/>
            <span style={{fontSize:11,color:'var(--dim)'}}>continue with</span>
            <div className="divider" style={{flex:1}}/>
          </div>

          {/* Google button */}
          <button onClick={go} disabled={loading} className="btn btn-p btn-lg btn-full shim-btn" style={{fontSize:15}}>
            {loading?<Loader2 size={18} className="animate-spin"/>:(
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="rgba(255,255,255,.9)" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="rgba(255,255,255,.75)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="rgba(255,255,255,.6)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="rgba(255,255,255,.45)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <p style={{textAlign:'center',marginTop:18,fontSize:12,color:'var(--dim)'}}>{t('auth.terms')}</p>
        </div>

        {/* Discord link */}
        <a href="https://discord.gg/your-server" target="_blank" rel="noopener noreferrer"
          style={{display:'block',textAlign:'center',marginTop:16,fontSize:13,color:'var(--dim)',textDecoration:'none',transition:'color .15s'}}
          onMouseEnter={e=>(e.currentTarget.style.color='var(--muted)')} onMouseLeave={e=>(e.currentTarget.style.color='var(--dim)')}>
          Need help? Contact Support on Discord →
        </a>
      </div>
    </div>
  );
}
