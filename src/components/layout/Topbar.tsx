import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Menu, X, LogOut, Globe, Wallet, Crown, Shield, ShoppingBag, Home, Key, MessageSquare, Gift, Activity, Flame } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { key: 'home',        path: '/',             tKey: 'nav.home',    icon: Home        },
  { key: 'store',       path: '/store',        tKey: 'nav.store',   icon: ShoppingBag },
  { key: 'licenses',    path: '/licenses',     tKey: 'nav.license', icon: Key         },
  { key: 'chat',        path: '/chat',         tKey: 'nav.chat',    icon: MessageSquare },
  { key: 'bonus',       path: '/bonus',        tKey: 'nav.bonus',   icon: Gift        },
  { key: 'panelStatus', path: '/panel-status', tKey: 'nav.status',  icon: Activity    },
  { key: 'trial',       path: '/trial',        tKey: 'nav.trial',   icon: Flame         },
];

const LANGUAGES = [
  { code:'en', label:'English',    flag:'🇬🇧' },
  { code:'ar', label:'العربية',   flag:'🇸🇦' },
  { code:'bn', label:'বাংলা',     flag:'🇧🇩' },
  { code:'th', label:'ไทย',       flag:'🇹🇭' },
  { code:'vi', label:'Tiếng Việt',flag:'🇻🇳' },
  { code:'es', label:'Español',   flag:'🇪🇸' },
  { code:'pt', label:'Português', flag:'🇧🇷' },
  { code:'hi', label:'हिन्दी',    flag:'🇮🇳' },
  { code:'fr', label:'Français',  flag:'🇫🇷' },
  { code:'de', label:'Deutsch',   flag:'🇩🇪' },
  { code:'ja', label:'日本語',    flag:'🇯🇵' },
  { code:'ko', label:'한국어',    flag:'🇰🇷' },
  { code:'zh', label:'中文',      flag:'🇨🇳' },
  { code:'ru', label:'Русский',   flag:'🇷🇺' },
  { code:'tr', label:'Türkçe',    flag:'🇹🇷' },
];

interface TopbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export default function Topbar({ currentPath, onNavigate, onLogout }: TopbarProps) {
  const { i18n, t } = useTranslation();
  const { balance, user } = useAppStore();
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen,    setLangOpen]    = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (langRef.current    && !langRef.current.contains(e.target as Node))    setLangOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleNav = (path: string) => { onNavigate(path); setMobileOpen(false); };

  const navLabels: Record<string, string> = {
    'nav.home': 'Home', 'nav.store': 'Shop', 'nav.license': 'License',
    'nav.chat': 'Chat', 'nav.bonus': 'Bonus', 'nav.status': 'Status', 'nav.trial': 'Free Trial',
  };

  return (
    <>
      <style>{`
        .nav-pill {
          position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
          z-index: 50; width: calc(100% - 32px); max-width: 1100px;
        }
        .nav-inner {
          display: flex; align-items: center; gap: 4px;
          padding: 6px 8px; border-radius: 22px;
          background: rgba(7, 8, 15, 0.9);
          backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 60px rgba(109,40,217,0.08);
        }
        .nav-link {
          padding: 7px 13px; border-radius: 14px; font-size: 12.5px;
          font-weight: 600; cursor: pointer; border: none; background: transparent;
          color: rgba(255,255,255,0.45); transition: all 0.18s ease;
          font-family: inherit; white-space: nowrap;
          display: flex; align-items: center; gap: 6px;
          position: relative;
        }
        .nav-link:hover {
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.06);
        }
        .nav-link.active {
          color: #fff;
          background: rgba(139,92,246,0.18);
          border: 1px solid rgba(139,92,246,0.32);
          box-shadow: 0 0 18px rgba(109,40,217,0.28);
          font-weight: 700;
        }
        /* Trial button — green free highlight */
        .nav-link.trial-highlight {
          background: linear-gradient(135deg, rgba(16,232,152,0.12), rgba(5,150,105,0.08));
          border: 1px solid rgba(16,232,152,0.3);
          color: #6ee7b7;
          box-shadow: 0 0 16px rgba(16,232,152,0.12);
        }
        .nav-link.trial-highlight:hover {
          background: linear-gradient(135deg, rgba(16,232,152,0.2), rgba(5,150,105,0.14));
          box-shadow: 0 0 24px rgba(16,232,152,0.25);
          color: #fff;
        }
        .nav-link.trial-highlight.active {
          background: linear-gradient(135deg, #10e898, #059669);
          color: #fff;
          box-shadow: 0 0 24px rgba(16,232,152,0.4);
        }
          background: linear-gradient(135deg, rgba(139,92,246,0.22), rgba(109,40,217,0.14));
          border: 1px solid rgba(139,92,246,0.4);
          color: #c4b5fd;
          box-shadow: 0 0 18px rgba(109,40,217,0.2);
        }
        .nav-link.shop-highlight:hover {
          background: linear-gradient(135deg, rgba(139,92,246,0.32), rgba(109,40,217,0.22));
          box-shadow: 0 0 28px rgba(109,40,217,0.4);
          color: #fff;
        }
        .nav-link.shop-highlight.active {
          background: linear-gradient(135deg, #8b5cf6, #6d28d9);
          color: #fff;
          box-shadow: 0 0 28px rgba(109,40,217,0.5);
        }
        .nav-btn {
          padding: 7px 10px; border-radius: 13px; border: none; cursor: pointer;
          background: transparent; color: rgba(255,255,255,0.45); display: flex;
          align-items: center; justify-content: center; transition: all 0.18s;
          font-family: inherit;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.8); }
        .balance-pill {
          display: flex; align-items: center; gap: 6px; padding: 6px 13px;
          border-radius: 14px; border: 1px solid rgba(139,92,246,0.28);
          background: rgba(139,92,246,0.1); color: #c4b5fd; font-size: 12px;
          font-weight: 700; cursor: pointer; transition: all 0.18s; font-family: inherit;
          white-space: nowrap;
        }
        .balance-pill:hover { background: rgba(139,92,246,0.2); border-color: rgba(139,92,246,0.45); }
        .logo-img {
          height: 32px; width: auto; object-fit: contain;
          filter: drop-shadow(0 0 10px rgba(139,92,246,0.5));
        }
        .dropdown {
          position: absolute; right: 0; top: calc(100% + 10px);
          background: rgba(10,10,22,0.97); backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 18px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7); padding: 6px; z-index: 60;
          min-width: 200px; overflow: hidden;
        }
        .dropdown-item {
          display: flex; align-items: center; gap: 9px; padding: 9px 12px;
          border-radius: 12px; font-size: 13px; cursor: pointer; border: none;
          background: transparent; color: rgba(255,255,255,0.65); width: 100%;
          transition: all 0.15s; font-family: inherit; text-align: left;
        }
        .dropdown-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
        .avatar-ring { border-radius: 50%; border: 2px solid rgba(139,92,246,0.3); }
        .nav-divider { width:1px; height:20px; background:rgba(255,255,255,0.07); flex-shrink:0; margin: 0 2px; }
      `}</style>

      <div className="nav-pill">
        <div className="nav-inner">

          {/* Logo */}
          <button onClick={() => handleNav('/')} style={{ display:'flex', alignItems:'center', marginRight:2, flexShrink:0, background:'none', border:'none', cursor:'pointer', padding:'4px 6px', borderRadius:12 }}>
            <img
              src="https://www.dropbox.com/scl/fi/uv2artcam1x5w1afg7ecc/1999XX-Png.png?raw=1"
              alt="1999X"
              className="logo-img"
              onError={e => {
                const tgt = e.target as HTMLImageElement;
                tgt.style.display = 'none';
                const span = document.createElement('span');
                span.textContent = '1999X';
                span.style.cssText = 'font-size:15px;font-weight:900;color:#fff;letter-spacing:-.02em';
                tgt.parentNode?.appendChild(span);
              }}
            />
          </button>

          <div className="nav-divider" />

          {/* Nav links — desktop */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map(item => {
              const isActive = currentPath === item.path;
              const isShop   = item.path === '/store';
              const isTrial  = item.path === '/trial';
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.path)}
                  className={cn(
                    'nav-link',
                    isShop  && 'shop-highlight',
                    isTrial && 'trial-highlight',
                    isActive && 'active'
                  )}
                >
                  <Icon size={13} />
                  {navLabels[item.tKey] || t(item.tKey)}
                  {isShop && !isActive && (
                    <span style={{ fontSize:8, fontWeight:900, padding:'1px 5px', borderRadius:8, background:'rgba(139,92,246,0.4)', color:'#e9d5ff', letterSpacing:'.08em' }}>BUY</span>
                  )}
                  {isTrial && !isActive && (
                    <span style={{ fontSize:8, fontWeight:900, padding:'1px 5px', borderRadius:8, background:'rgba(16,232,152,0.3)', color:'#6ee7b7', letterSpacing:'.08em' }}>FREE</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right controls */}
          <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:'auto', flexShrink:0 }}>

            {/* Balance — clicking goes to wallet */}
            <button onClick={() => handleNav('/wallet')} className="balance-pill hidden sm:flex">
              <Wallet size={12} />
              ${balance.toFixed(2)}
            </button>

            {/* Language */}
            <div style={{ position:'relative' }} ref={langRef}>
              <button onClick={() => setLangOpen(!langOpen)} className="nav-btn" title="Language">
                <Globe size={14} />
              </button>
              {langOpen && (
                <div className="dropdown" style={{ minWidth:170 }}>
                  <div style={{ padding:'6px 12px 8px', borderBottom:'1px solid rgba(255,255,255,.06)', marginBottom:4 }}>
                    <span style={{ fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.1em' }}>Language</span>
                  </div>
                  <div style={{ maxHeight:200, overflowY:'auto' }}>
                    {LANGUAGES.map(lang => (
                      <button key={lang.code} onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                        className="dropdown-item"
                        style={{ color: lang.code === i18n.language ? '#c4b5fd' : undefined, fontWeight: lang.code === i18n.language ? 600 : undefined }}>
                        <span style={{ fontSize:16 }}>{lang.flag}</span>
                        <span>{lang.label}</span>
                        {lang.code === i18n.language && <span style={{ marginLeft:'auto', fontSize:10, color:'var(--purple)' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div style={{ position:'relative' }} ref={profileRef}>
              <button onClick={() => setProfileOpen(!profileOpen)}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 10px 5px 5px', borderRadius:16, border:'1px solid rgba(255,255,255,.08)', background: profileOpen ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.04)', cursor:'pointer', transition:'all .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,.08)')}
                onMouseLeave={e => (e.currentTarget.style.background=profileOpen?'rgba(255,255,255,.08)':'rgba(255,255,255,.04)')}>
                <div style={{ position:'relative' }}>
                  {user?.avatar
                    ? <img src={user.avatar} alt={user.name} className="avatar-ring" style={{ width:27,height:27,objectFit:'cover' }}/>
                    : <div style={{ width:27,height:27,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#fff' }}>{user?.name?.charAt(0)||'U'}</div>
                  }
                  {user?.role === 'admin' && (
                    <div style={{ position:'absolute',top:-3,right:-3,width:14,height:14,borderRadius:'50%',background:'#ef4444',border:'2px solid var(--bg)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <Crown size={7} color="#fff"/>
                    </div>
                  )}
                  {user?.role === 'support' && (
                    <div style={{ position:'absolute',top:-3,right:-3,width:14,height:14,borderRadius:'50%',background:'#3b82f6',border:'2px solid var(--bg)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <Shield size={7} color="#fff"/>
                    </div>
                  )}
                </div>
                <span style={{ fontSize:12,fontWeight:600,color:'rgba(255,255,255,.8)',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
              </button>

              {profileOpen && (
                <div className="dropdown">
                  {user && (
                    <div style={{ padding:'10px 12px 12px',borderBottom:'1px solid rgba(255,255,255,.06)',marginBottom:4 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        {user.avatar
                          ? <img src={user.avatar} alt={user.name} style={{ width:36,height:36,borderRadius:'50%',objectFit:'cover' }}/>
                          : <div style={{ width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'#fff' }}>{user.name.charAt(0)}</div>
                        }
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user.name}</div>
                          <div style={{ fontSize:11,fontWeight:600,color:user.role==='admin'?'#f87171':user.role==='support'?'#60a5fa':'rgba(255,255,255,.35)',marginTop:1 }}>
                            {user.role==='admin'?'👑 Administrator':user.role==='support'?'🛡 Support Staff':user.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <button onClick={() => { onLogout(); setProfileOpen(false); }} className="dropdown-item" style={{ color:'#f87171' }}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="nav-btn lg:hidden">
              {mobileOpen ? <X size={16}/> : <Menu size={16}/>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <>
          <div style={{ position:'fixed',inset:0,zIndex:40,background:'rgba(0,0,0,.5)' }} onClick={() => setMobileOpen(false)}/>
          <div style={{ position:'fixed',top:72,left:12,right:12,zIndex:40,borderRadius:20,border:'1px solid rgba(255,255,255,.1)',padding:12,background:'rgba(8,8,18,.97)',backdropFilter:'blur(24px)',boxShadow:'0 20px 60px rgba(0,0,0,.7)' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize:12,color:'rgba(255,255,255,.4)' }}>Balance</span>
              <span style={{ fontSize:14,fontWeight:700,color:'#c4b5fd' }}>${balance.toFixed(2)}</span>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
              {navItems.map(item => {
                const Icon    = item.icon;
                const isShop  = item.path === '/store';
                const isTrial = item.path === '/trial';
                const isActive = currentPath === item.path;
                return (
                  <button key={item.key} onClick={() => handleNav(item.path)}
                    style={{ padding:'10px 14px',borderRadius:14,fontSize:13,fontWeight:600,cursor:'pointer',
                      border:`1px solid ${isActive?'rgba(139,92,246,.35)':isShop?'rgba(139,92,246,.25)':isTrial?'rgba(16,232,152,.25)':'rgba(255,255,255,.06)'}`,
                      background:isActive?'rgba(139,92,246,.18)':isShop?'rgba(139,92,246,.08)':isTrial?'rgba(16,232,152,.07)':'rgba(255,255,255,.03)',
                      color:isActive?'#c4b5fd':isShop?'#c4b5fd':isTrial?'#6ee7b7':'rgba(255,255,255,.6)',
                      textAlign:'left',fontFamily:'inherit',transition:'all .15s',
                      display:'flex',alignItems:'center',gap:7 }}>
                    <Icon size={13} />
                    {navLabels[item.tKey]}
                    {isShop  && <span style={{ fontSize:8,fontWeight:900,padding:'1px 5px',borderRadius:8,background:'rgba(139,92,246,0.4)',color:'#e9d5ff' }}>BUY</span>}
                    {isTrial && <span style={{ fontSize:8,fontWeight:900,padding:'1px 5px',borderRadius:8,background:'rgba(16,232,152,0.3)',color:'#6ee7b7' }}>FREE</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => { onLogout(); setMobileOpen(false); }}
              style={{ width:'100%',marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',gap:8,padding:'10px 14px',fontSize:13,color:'#f87171',background:'none',border:'none',cursor:'pointer',borderRadius:14,fontFamily:'inherit',transition:'all .15s' }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(239,68,68,.08)')}
              onMouseLeave={e=>(e.currentTarget.style.background='none')}>
              <LogOut size={14}/> Sign Out
            </button>
          </div>
        </>
      )}
    </>
  );
}
