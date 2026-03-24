import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Menu, X, LogOut, Globe, Wallet, Crown, Shield, Home, ShoppingBag, Key, MessageCircle, Gift, Activity } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Nav order: Home > Shop > License > Chat > Bonus > Status
const navItems = [
  { key: 'dashboard',   path: '/',            tKey: 'nav.home',    Icon: Home          },
  { key: 'wallet',      path: '/wallet',       tKey: 'nav.shop',    Icon: ShoppingBag   },
  { key: 'licenses',    path: '/licenses',     tKey: 'nav.license', Icon: Key           },
  { key: 'chat',        path: '/chat',         tKey: 'nav.chat',    Icon: MessageCircle },
  { key: 'bonus',       path: '/bonus',        tKey: 'nav.bonus',   Icon: Gift          },
  { key: 'panelStatus', path: '/panel-status', tKey: 'nav.status',  Icon: Activity      },
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
  const [chatUnread,  setChatUnread]  = useState(0);
  const [annUnread,   setAnnUnread]   = useState(0);
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

  useEffect(() => {
    if (!user) return;

    const loadCounts = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id,type,is_read')
        .or(`user_id.eq.${user.id},user_id.eq.all`)
        .eq('is_read', false)
        .in('type', ['chat', 'announcement']);

      const rows = data ?? [];
      setChatUnread(rows.filter((row: any) => row.type === 'chat').length);
      setAnnUnread(rows.filter((row: any) => row.type === 'announcement').length);
    };

    loadCounts();

    const ch = supabase.channel(`topbar-notifs-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        loadCounts();
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const markByTypeRead = async (type: 'chat' | 'announcement') => {
      const { data } = await supabase
        .from('notifications')
        .select('id')
        .or(`user_id.eq.${user.id},user_id.eq.all`)
        .eq('type', type)
        .eq('is_read', false);

      const ids = (data ?? []).map((row: any) => row.id);
      if (ids.length) {
        await supabase.from('notifications').update({ is_read: true }).in('id', ids);
      }
      if (type === 'chat') setChatUnread(0);
      if (type === 'announcement') setAnnUnread(0);
    };

    if (currentPath === '/chat' && chatUnread > 0) markByTypeRead('chat');
    if (currentPath === '/panel-status' && annUnread > 0) markByTypeRead('announcement');
  }, [currentPath, user?.id, chatUnread, annUnread]);

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileOpen(false);
    if (path === '/chat') setChatUnread(0);
    if (path === '/panel-status') setAnnUnread(0);
  };

  return (
    <>
      <style>{`
        .nav-pill {
          position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
          z-index: 50; width: calc(100% - 24px); max-width: 1100px;
        }
        .nav-inner {
          display: flex; align-items: center; gap: 3px;
          padding: 7px 8px; border-radius: 22px;
          background: rgba(8, 8, 18, 0.9);
          backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03) inset;
        }
        .nav-link {
          padding: 7px 11px; border-radius: 13px; font-size: 12.5px;
          font-weight: 500; cursor: pointer; border: none; background: transparent;
          color: rgba(255,255,255,0.45); transition: all 0.18s ease;
          font-family: inherit; white-space: nowrap;
          display: flex; align-items: center; gap: 5px;
          position: relative;
        }
        .nav-link:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.06); }
        .nav-link.active {
          color: #fff;
          background: rgba(139,92,246,0.18);
          border: 1px solid rgba(139,92,246,0.28);
          box-shadow: 0 0 18px rgba(109,40,217,0.22);
          font-weight: 600;
        }
        .nav-link .nav-ic { opacity: 0.55; transition: opacity 0.18s; }
        .nav-link:hover .nav-ic, .nav-link.active .nav-ic { opacity: 1; }
        .nav-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          min-width: 15px;
          height: 15px;
          padding: 0 4px;
          border-radius: 999px;
          background: linear-gradient(135deg,#8b5cf6,#6d28d9);
          border: 2px solid rgba(8,8,18,0.95);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 900;
          color: #fff;
          line-height: 1;
          box-shadow: 0 0 10px rgba(109,40,217,.5);
        }
        .nav-btn {
          padding: 7px 9px; border-radius: 13px; border: none; cursor: pointer;
          background: transparent; color: rgba(255,255,255,0.45); display: flex;
          align-items: center; justify-content: center; transition: all 0.18s;
          font-family: inherit;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.8); }
        .balance-pill {
          display: flex; align-items: center; gap: 5px; padding: 6px 12px;
          border-radius: 13px; border: 1px solid rgba(139,92,246,0.25);
          background: rgba(139,92,246,0.1); color: #c4b5fd; font-size: 12px;
          font-weight: 700; cursor: pointer; transition: all 0.18s; font-family: inherit;
          white-space: nowrap;
        }
        .balance-pill:hover { background: rgba(139,92,246,0.18); border-color: rgba(139,92,246,0.4); box-shadow: 0 0 14px rgba(109,40,217,0.25); }
        .logo-img { height: 30px; width: auto; object-fit: contain; filter: drop-shadow(0 0 10px rgba(139,92,246,0.5)); }
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
        .mob-nav-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 6px; }
        .mob-nav-item {
          padding: 11px 6px; border-radius: 13px; font-size: 11.5px; font-weight: 500;
          cursor: pointer; border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5);
          text-align: center; font-family: inherit; transition: all 0.15s;
          display: flex; flex-direction: column; align-items: center; gap: 5px;
        }
        .mob-nav-item.active { border-color: rgba(139,92,246,0.3); background: rgba(139,92,246,0.12); color: #c4b5fd; }
      `}</style>

      <div className="nav-pill">
        <div className="nav-inner">

          {/* Logo */}
          <button onClick={() => handleNav('/')} style={{ display:'flex', alignItems:'center', marginRight:2, flexShrink:0, background:'none', border:'none', cursor:'pointer', padding:'4px 6px', borderRadius:12 }}>
            <img
              src="https://www.dropbox.com/scl/fi/uv2artcam1x5w1afg7ecc/1999XX-Png.png?raw=1"
              alt="1999X" className="logo-img"
              onError={e => {
                const t2 = e.target as HTMLImageElement; t2.style.display='none';
                const s = document.createElement('span'); s.textContent='1999X';
                s.style.cssText='font-size:15px;font-weight:900;color:#fff;letter-spacing:-.02em';
                t2.parentNode?.appendChild(s);
              }}
            />
          </button>

          <div style={{ width:1, height:20, background:'rgba(255,255,255,0.07)', flexShrink:0, margin:'0 2px' }} />

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map(item => (
              <button key={item.key} onClick={() => handleNav(item.path)}
                className={cn('nav-link', currentPath === item.path && 'active')}>
                <item.Icon size={13} className="nav-ic" />
                {t(item.tKey)}
                {item.path === '/chat' && chatUnread > 0 && (
                  <span className="nav-badge">{chatUnread > 9 ? '9+' : chatUnread}</span>
                )}
                {item.path === '/panel-status' && annUnread > 0 && (
                  <span className="nav-badge">{annUnread > 9 ? '9+' : annUnread}</span>
                )}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div style={{ display:'flex', alignItems:'center', gap:3, marginLeft:'auto', flexShrink:0 }}>

            <button onClick={() => handleNav('/wallet')} className="balance-pill hidden sm:flex">
              <Wallet size={12} />${balance.toFixed(2)}
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
                        style={{ color: lang.code===i18n.language?'#c4b5fd':undefined, fontWeight: lang.code===i18n.language?600:undefined }}>
                        <span style={{ fontSize:16 }}>{lang.flag}</span>
                        <span>{lang.label}</span>
                        {lang.code===i18n.language && <span style={{ marginLeft:'auto',fontSize:10,color:'var(--purple)' }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div style={{ position:'relative' }} ref={profileRef}>
              <button onClick={() => setProfileOpen(!profileOpen)}
                style={{ display:'flex',alignItems:'center',gap:7,padding:'5px 9px 5px 5px',borderRadius:15,border:'1px solid rgba(255,255,255,.08)',background:profileOpen?'rgba(255,255,255,.08)':'rgba(255,255,255,.04)',cursor:'pointer',transition:'all .15s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.08)')}
                onMouseLeave={e=>(e.currentTarget.style.background=profileOpen?'rgba(255,255,255,.08)':'rgba(255,255,255,.04)')}>
                <div style={{ position:'relative' }}>
                  {user?.avatar
                    ? <img src={user.avatar} alt={user.name} className="avatar-ring" style={{ width:26,height:26,objectFit:'cover' }}/>
                    : <div style={{ width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff' }}>{user?.name?.charAt(0)||'U'}</div>
                  }
                  {user?.role==='admin'   && <div style={{ position:'absolute',top:-3,right:-3,width:13,height:13,borderRadius:'50%',background:'#ef4444',border:'2px solid var(--bg)',display:'flex',alignItems:'center',justifyContent:'center' }}><Crown  size={6} color="#fff"/></div>}
                  {user?.role==='support' && <div style={{ position:'absolute',top:-3,right:-3,width:13,height:13,borderRadius:'50%',background:'#3b82f6',border:'2px solid var(--bg)',display:'flex',alignItems:'center',justifyContent:'center' }}><Shield size={6} color="#fff"/></div>}
                </div>
                <span style={{ fontSize:12,fontWeight:600,color:'rgba(255,255,255,.8)',maxWidth:70,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                  {user?.name?.split(' ')[0]||'User'}
                </span>
              </button>

              {profileOpen && (
                <div className="dropdown">
                  {user && (
                    <div style={{ padding:'10px 12px 12px',borderBottom:'1px solid rgba(255,255,255,.06)',marginBottom:4 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        {user.avatar
                          ? <img src={user.avatar} alt={user.name} style={{ width:34,height:34,borderRadius:'50%',objectFit:'cover' }}/>
                          : <div style={{ width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff' }}>{user.name.charAt(0)}</div>
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
                  {user?.role === 'admin' && (
                    <>
                      <button onClick={() => { handleNav('/admin-activity'); setProfileOpen(false); }} className="dropdown-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        Activity Logs
                      </button>
                      <div style={{ height:1,background:'rgba(255,255,255,.06)',margin:'4px 0' }}/>
                    </>
                  )}
                  <button onClick={() => { onLogout(); setProfileOpen(false); }} className="dropdown-item" style={{ color:'#f87171' }}>
                    <LogOut size={14} /> {t('nav.signOut')}
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => setMobileOpen(!mobileOpen)} className="nav-btn lg:hidden">
              {mobileOpen ? <X size={16}/> : <Menu size={16}/>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <>
          <div style={{ position:'fixed',inset:0,zIndex:40,background:'rgba(0,0,0,.5)' }} onClick={() => setMobileOpen(false)}/>
          <div style={{ position:'fixed',top:70,left:10,right:10,zIndex:40,borderRadius:20,border:'1px solid rgba(255,255,255,.1)',padding:'14px 12px',background:'rgba(8,8,18,.97)',backdropFilter:'blur(24px)',boxShadow:'0 20px 60px rgba(0,0,0,.7)' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,.06)' }}>
              <span style={{ fontSize:12,color:'rgba(255,255,255,.4)' }}>{t('dashboard.balance')}</span>
              <span style={{ fontSize:14,fontWeight:700,color:'#c4b5fd' }}>${balance.toFixed(2)}</span>
            </div>
            <div className="mob-nav-grid">
              {navItems.map(item => (
                <button key={item.key} onClick={() => handleNav(item.path)}
                  className={cn('mob-nav-item', currentPath===item.path && 'active')}>
                  <item.Icon size={18} style={{ opacity: currentPath===item.path?1:0.5 }} />
                  <span>{t(item.tKey)}</span>
                  {item.path === '/chat' && chatUnread > 0 && (
                    <span style={{ fontSize:10, fontWeight:800, color:'#c4b5fd' }}>+{chatUnread > 9 ? '9' : chatUnread}</span>
                  )}
                  {item.path === '/panel-status' && annUnread > 0 && (
                    <span style={{ fontSize:10, fontWeight:800, color:'#c4b5fd' }}>+{annUnread > 9 ? '9' : annUnread}</span>
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => { onLogout(); setMobileOpen(false); }}
              style={{ width:'100%',marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',gap:8,padding:'10px 14px',fontSize:13,color:'#f87171',background:'none',border:'none',cursor:'pointer',borderRadius:13,fontFamily:'inherit',transition:'all .15s' }}
              onMouseEnter={e=>(e.currentTarget.style.background='rgba(239,68,68,.08)')}
              onMouseLeave={e=>(e.currentTarget.style.background='none')}>
              <LogOut size={14}/> {t('nav.signOut')}
            </button>
          </div>
        </>
      )}
    </>
  );
}
