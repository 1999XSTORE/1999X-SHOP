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
  const activeNavIndex = Math.max(0, navItems.findIndex((item) => item.path === currentPath));

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
        @keyframes gold-pulse {
          0%,100% { box-shadow: 0 0 18px rgba(251,191,36,.55), 0 0 6px rgba(251,191,36,.25) inset; }
          50%      { box-shadow: 0 0 32px rgba(251,191,36,.85), 0 0 12px rgba(251,191,36,.35) inset; }
        }
        @keyframes gold-shine { 0%{left:-120%} 100%{left:160%} }
        @keyframes nav-in { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        @keyframes mob-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }

        /* pill */
        .nav-pill { position:fixed; top:14px; left:50%; transform:translateX(-50%); z-index:50; width:calc(100% - 24px); max-width:1100px; animation:nav-in .4s ease both; }

        /* glass radio */
        .glass-radio-group { display:flex; position:relative; background:rgba(255,255,255,.045); border-radius:15px; box-shadow:inset 0 1px 0 rgba(255,255,255,.08); overflow:visible; width:fit-content; padding:3px; gap:1px; }
        .glass-glider { position:absolute; top:3px; bottom:3px; width:calc((100% - 6px) / 6); border-radius:12px; z-index:1; transition:transform .48s cubic-bezier(0.34,1.56,0.64,1); background:linear-gradient(135deg,rgba(251,191,36,.28),rgba(245,158,11,.22),rgba(217,119,6,.18)); border:1px solid rgba(251,191,36,.3); box-shadow:0 0 20px rgba(251,191,36,.4); animation:gold-pulse 2.8s ease-in-out infinite; overflow:hidden; }
        .glass-glider::after { content:''; position:absolute; top:0; bottom:0; width:45%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent); animation:gold-shine 3s ease-in-out infinite; pointer-events:none; }

        /* nav links */
        .nav-link { min-width:90px; padding:10px 13px; border-radius:12px; font-size:13px; font-weight:600; cursor:pointer; border:none; background:transparent; color:rgba(255,255,255,.48); transition:color .25s,text-shadow .25s; font-family:inherit; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:6px; position:relative; z-index:2; }
        .nav-link:hover { color:rgba(255,255,255,.82); }
        .nav-link.active { color:#fde68a; font-weight:700; text-shadow:0 0 18px rgba(251,191,36,.7),0 0 6px rgba(251,191,36,.4); }
        .nav-link .nav-ic { opacity:.42; transition:opacity .2s,filter .2s; }
        .nav-link:hover .nav-ic,.nav-link.active .nav-ic { opacity:1; }
        .nav-link.active .nav-ic { filter:drop-shadow(0 0 5px rgba(251,191,36,.8)); }
        .nav-badge { position:absolute; top:3px; right:3px; min-width:15px; height:15px; padding:0 4px; border-radius:999px; background:linear-gradient(135deg,#f59e0b,#d97706); border:2px solid rgba(6,6,16,.95); display:inline-flex; align-items:center; justify-content:center; font-size:8px; font-weight:900; color:#000; box-shadow:0 0 10px rgba(245,158,11,.6); }

        /* right buttons */
        .nav-btn { padding:7px 9px; border-radius:12px; border:none; cursor:pointer; background:transparent; color:rgba(255,255,255,.38); display:flex; align-items:center; justify-content:center; transition:all .18s; font-family:inherit; }
        .nav-btn:hover { background:rgba(255,255,255,.07); color:rgba(255,255,255,.75); }
        .balance-pill { display:flex; align-items:center; gap:5px; padding:6px 13px; border-radius:12px; border:1px solid rgba(251,191,36,.22); background:rgba(251,191,36,.07); color:#fde68a; font-size:12px; font-weight:700; cursor:pointer; transition:all .2s; font-family:inherit; white-space:nowrap; }
        .balance-pill:hover { background:rgba(251,191,36,.13); border-color:rgba(251,191,36,.4); box-shadow:0 0 22px rgba(251,191,36,.22); }
        .logo-img { height:28px; width:auto; object-fit:contain; filter:drop-shadow(0 0 10px rgba(251,191,36,.4)); }
        .avatar-ring { border-radius:50%; border:2px solid rgba(251,191,36,.35); }

        /* dropdown */
        .dropdown { position:absolute; right:0; top:calc(100% + 10px); background:rgba(8,8,18,.97); backdrop-filter:blur(28px); border:1px solid rgba(255,255,255,.09); border-radius:18px; box-shadow:0 24px 64px rgba(0,0,0,.75); padding:6px; z-index:60; min-width:210px; overflow:hidden; animation:nav-in .22s ease both; }
        .dropdown-item { display:flex; align-items:center; gap:9px; padding:9px 12px; border-radius:11px; font-size:13px; cursor:pointer; border:none; background:transparent; color:rgba(255,255,255,.6); width:100%; transition:all .15s; font-family:inherit; text-align:left; }
        .dropdown-item:hover { background:rgba(255,255,255,.06); color:#fff; }

        /* ══ MOBILE BOTTOM NAV ══ */
        .mob-bottom-nav { display:none; position:fixed; bottom:0; left:0; right:0; z-index:50; background:rgba(6,6,16,0.97); backdrop-filter:blur(32px); border-top:1px solid rgba(255,255,255,.09); box-shadow:0 -4px 24px rgba(0,0,0,.5); padding:6px 0 calc(6px + env(safe-area-inset-bottom)); }
        .mob-bottom-inner { display:flex; align-items:center; justify-content:space-around; max-width:500px; margin:0 auto; padding:0 8px; }
        .mob-nav-btn { display:flex; flex-direction:column; align-items:center; gap:3px; padding:8px 10px; min-width:54px; border-radius:14px; border:1px solid transparent; background:transparent; cursor:pointer; font-family:inherit; transition:all .2s; position:relative; -webkit-tap-highlight-color:transparent; }
        .mob-nav-btn:active { transform:scale(.9); }
        .mob-nav-btn .mob-lbl { font-size:10px; font-weight:600; color:rgba(255,255,255,.35); transition:color .2s; }
        .mob-nav-btn svg { color:rgba(255,255,255,.32); transition:color .2s,filter .2s; }
        .mob-nav-btn.mob-on { background:rgba(251,191,36,.08); border-color:rgba(251,191,36,.2); }
        .mob-nav-btn.mob-on .mob-lbl { color:#fde68a; font-weight:700; }
        .mob-nav-btn.mob-on svg { color:#fde68a; filter:drop-shadow(0 0 6px rgba(251,191,36,.7)); }
        .mob-badge { position:absolute; top:4px; right:5px; min-width:14px; height:14px; padding:0 3px; border-radius:999px; background:linear-gradient(135deg,#f59e0b,#d97706); display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:900; color:#000; }

        /* responsive */
        @media (max-width:1023px) {
          .mob-bottom-nav { display:block; }
          .desk-nav { display:none !important; }
          .balance-pill { display:none !important; }
        }
        @media (min-width:1024px) {
          .mob-menu-btn { display:none !important; }
        }
      `}</style>

      {/* ══ TOP PILL ══ */}
      <div className="nav-pill">
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', padding:'6px 8px', borderRadius:22, background:'rgba(6,6,16,0.92)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', border:'1px solid rgba(255,255,255,0.07)', boxShadow:'0 8px 48px rgba(0,0,0,.65)', minHeight:52 }}>

          {/* Left: Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:6, justifySelf:'start' }}>
            <button onClick={() => handleNav('/')} style={{ display:'flex', alignItems:'center', background:'none', border:'none', cursor:'pointer', padding:'4px 6px', borderRadius:12 }}>
              <img src="https://www.dropbox.com/scl/fi/uv2artcam1x5w1afg7ecc/1999XX-Png.png?raw=1" alt="1999X" className="logo-img"
                onError={e => { const t2=e.target as HTMLImageElement; t2.style.display='none'; const s=document.createElement('span'); s.textContent='1999X'; s.style.cssText='font-size:15px;font-weight:900;color:#fff;letter-spacing:-.02em'; t2.parentNode?.appendChild(s); }} />
            </button>
            <div style={{ width:1, height:20, background:'rgba(255,255,255,0.07)', flexShrink:0 }} />
          </div>

          {/* Center: Nav — auto column = always exactly centered */}
          <div className="desk-nav" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div className="glass-radio-group">
              <div className="glass-glider" style={{ transform:`translateX(${activeNavIndex * 100}%)` }} />
              {navItems.map(item => (
                <button key={item.key} onClick={() => handleNav(item.path)} className={cn('nav-link', currentPath===item.path && 'active')}>
                  <item.Icon size={13} className="nav-ic" />
                  {t(item.tKey)}
                  {item.path==='/chat' && chatUnread>0 && <span className="nav-badge">{chatUnread>9?'9+':chatUnread}</span>}
                  {item.path==='/panel-status' && annUnread>0 && <span className="nav-badge">{annUnread>9?'9+':annUnread}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Controls — always end-aligned */}
          <div style={{ display:'flex', alignItems:'center', gap:3, justifySelf:'end' }}>
            <button onClick={() => handleNav('/wallet')} className="balance-pill"><Wallet size={12}/>${balance.toFixed(2)}</button>

            {/* Language */}
            <div style={{ position:'relative' }} ref={langRef}>
              <button onClick={() => setLangOpen(!langOpen)} className="nav-btn"><Globe size={14}/></button>
              {langOpen && (
                <div className="dropdown" style={{ minWidth:170 }}>
                  <div style={{ padding:'6px 12px 8px', borderBottom:'1px solid rgba(255,255,255,.06)', marginBottom:4 }}>
                    <span style={{ fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.1em' }}>Language</span>
                  </div>
                  <div style={{ maxHeight:200, overflowY:'auto' }}>
                    {LANGUAGES.map(lang => (
                      <button key={lang.code} onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }} className="dropdown-item"
                        style={{ color:lang.code===i18n.language?'#fde68a':undefined, fontWeight:lang.code===i18n.language?600:undefined }}>
                        <span style={{ fontSize:16 }}>{lang.flag}</span><span>{lang.label}</span>
                        {lang.code===i18n.language && <span style={{ marginLeft:'auto',fontSize:10,color:'#f59e0b' }}>✓</span>}
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
                  {user?.avatar ? <img src={user.avatar} alt={user.name} className="avatar-ring" style={{ width:26,height:26,objectFit:'cover' }}/>
                    : <div style={{ width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'#fff' }}>{user?.name?.charAt(0)||'U'}</div>}
                  {user?.role==='admin' && <div style={{ position:'absolute',top:-3,right:-3,width:13,height:13,borderRadius:'50%',background:'#ef4444',border:'2px solid var(--bg)',display:'flex',alignItems:'center',justifyContent:'center' }}><Crown size={6} color="#fff"/></div>}
                  {user?.role==='support' && <div style={{ position:'absolute',top:-3,right:-3,width:13,height:13,borderRadius:'50%',background:'#3b82f6',border:'2px solid var(--bg)',display:'flex',alignItems:'center',justifyContent:'center' }}><Shield size={6} color="#fff"/></div>}
                </div>
                <span style={{ fontSize:12,fontWeight:600,color:'rgba(255,255,255,.8)',maxWidth:70,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user?.name?.split(' ')[0]||'User'}</span>
              </button>
              {profileOpen && (
                <div className="dropdown">
                  {user && (
                    <div style={{ padding:'10px 12px 12px',borderBottom:'1px solid rgba(255,255,255,.06)',marginBottom:4 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        {user.avatar ? <img src={user.avatar} alt={user.name} style={{ width:34,height:34,borderRadius:'50%',objectFit:'cover' }}/>
                          : <div style={{ width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff' }}>{user.name.charAt(0)}</div>}
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user.name}</div>
                          <div style={{ fontSize:11,fontWeight:600,color:user.role==='admin'?'#f87171':user.role==='support'?'#60a5fa':'rgba(255,255,255,.35)',marginTop:1 }}>
                            {user.role==='admin'?'👑 Administrator':user.role==='support'?'🛡 Support Staff':user.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {user?.role==='admin' && (<>
                    <button onClick={() => { handleNav('/admin-activity'); setProfileOpen(false); }} className="dropdown-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Activity Logs
                    </button>
                    <div style={{ height:1,background:'rgba(255,255,255,.06)',margin:'4px 0' }}/>
                  </>)}
                  <button onClick={() => { onLogout(); setProfileOpen(false); }} className="dropdown-item" style={{ color:'#f87171' }}>
                    <LogOut size={14}/> {t('nav.signOut')}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile: hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="nav-btn mob-menu-btn">
              {mobileOpen ? <X size={18}/> : <Menu size={18}/>}
            </button>
          </div>
        </div>
      </div>

      {/* ══ MOBILE: hamburger dropdown (profile + logout) ══ */}
      {mobileOpen && (
        <>
          <div style={{ position:'fixed',inset:0,zIndex:40,background:'rgba(0,0,0,.5)' }} onClick={() => setMobileOpen(false)}/>
          <div style={{ position:'fixed',top:70,right:12,zIndex:50,width:230,borderRadius:18,border:'1px solid rgba(255,255,255,.1)',padding:'8px',background:'rgba(8,8,18,.97)',backdropFilter:'blur(28px)',boxShadow:'0 20px 60px rgba(0,0,0,.7)',animation:'mob-in .22s ease both' }}>
            {user && (
              <div style={{ padding:'10px 12px 12px',borderBottom:'1px solid rgba(255,255,255,.06)',marginBottom:4 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  {user.avatar ? <img src={user.avatar} style={{ width:32,height:32,borderRadius:'50%',objectFit:'cover' }}/>
                    : <div style={{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff' }}>{user.name.charAt(0)}</div>}
                  <div>
                    <div style={{ fontSize:13,fontWeight:700,color:'#fff' }}>{user.name}</div>
                    <div style={{ fontSize:11,color:'#fde68a' }}>${balance.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
            <div style={{ padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,.06)',marginBottom:4 }}>
              <div style={{ fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8 }}>Language</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                {LANGUAGES.slice(0,8).map(lang => (
                  <button key={lang.code} onClick={() => { i18n.changeLanguage(lang.code); setMobileOpen(false); }}
                    style={{ padding:'4px 8px',borderRadius:8,background:lang.code===i18n.language?'rgba(251,191,36,.15)':'rgba(255,255,255,.05)',border:`1px solid ${lang.code===i18n.language?'rgba(251,191,36,.3)':'rgba(255,255,255,.08)'}`,cursor:'pointer',fontSize:11,color:lang.code===i18n.language?'#fde68a':'rgba(255,255,255,.55)',fontFamily:'inherit' }}>
                    {lang.flag} {lang.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {user?.role==='admin' && (
              <button onClick={() => { handleNav('/admin-activity'); setMobileOpen(false); }} className="dropdown-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Activity Logs
              </button>
            )}
            <button onClick={() => { onLogout(); setMobileOpen(false); }} className="dropdown-item" style={{ color:'#f87171' }}>
              <LogOut size={14}/> {t('nav.signOut')}
            </button>
          </div>
        </>
      )}

      {/* ══ MOBILE BOTTOM NAV BAR ══ */}
      <div className="mob-bottom-nav">
        <div className="mob-bottom-inner">
          {navItems.map(item => (
            <button key={item.key} className={cn('mob-nav-btn', currentPath===item.path && 'mob-on')} onClick={() => handleNav(item.path)}>
              {item.path==='/chat' && chatUnread>0 && <span className="mob-badge">{chatUnread>9?'9+':chatUnread}</span>}
              {item.path==='/panel-status' && annUnread>0 && <span className="mob-badge">{annUnread>9?'9+':annUnread}</span>}
              <item.Icon size={22}/>
              <span className="mob-lbl">{t(item.tKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
