import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity, notifyAll, sendNotificationEmail } from '@/lib/activity';
import { Key, ArrowUpRight, TrendingUp, Sparkles, Loader2, Send, X, Plus, Trash2, Check, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { canManageAnnouncements } from '@/lib/roles';
import { safeFetch } from '@/lib/safeFetch';

const SUPA_URL = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';
const BONUS_COOLDOWN = 86400000;

interface DBAnn { id:string; title:string; content:string; type:'update'|'maintenance'|'feature'; created_at:string; }
const TYPE_CFG = {
  update: { c:'#5EF7A6' }, maintenance: { c:'#544388' }, feature: { c:'#EA226B' }
} as const;

const OFFLINE = { status:'offline', onlineUsers:'0' };
const norm = (r: any) => (!r || r.status === 'offline') ? OFFLINE : { status:r.status??'online', onlineUsers:String(parseInt(String(r.onlineUsers??r.numOnlineUsers??0)) || 0) };

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, user, systemStatus } = useAppStore();
  const isSystemOnline = systemStatus === 'online';
  const isMod = canManageAnnouncements(user?.role);

  // Bonus
  const [bonusPoints, setBonusPoints] = useState(0);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [bonusLoaded, setBonusLoaded] = useState(false);

  // Status variables
  const [lag, setLag] = useState(OFFLINE);
  const [int, setInt] = useState(OFFLINE);

  // Announcements
  const [anns, setAnns] = useState<DBAnn[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fContent, setFContent] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setBonusLoaded(false);
    supabase.from('user_bonus').select('bonus_points').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setBonusPoints(data.bonus_points ?? 0);
      setBonusLoaded(true);
    });
  }, [user?.id]);

  useEffect(() => {
    safeFetch('https://awjouzwzdkrevvnlenvn.supabase.co/functions/v1/keyauth-stats', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${ANON}`, apikey:ANON }, body:'{}' }, 10000)
    .then(r => r?.json()).then(d => { if (d?.lag) setLag(norm(d.lag)); if (d?.internal) setInt(norm(d.internal)); }).catch(()=>{});
  }, []);

  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at', { ascending:false }).limit(10).then(({ data }) => { if (data) setAnns(data as DBAnn[]); setAnnLoading(false); });
    const ch = supabase.channel('d-anns')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'announcements' }, ({ new: r }) => setAnns(prev => [r as DBAnn, ...prev]))
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'announcements' }, ({ old: r }) => setAnns(prev => prev.filter(a => a.id !== (r as any).id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handlePublishAnn = async () => {
    if (!fTitle.trim() || !fContent.trim()) { toast.error('Fill fields'); return; }
    setPublishing(true);
    const { error } = await supabase.from('announcements').insert({ title: fTitle.trim(), content: fContent.trim(), type: 'update', created_by: user?.email ?? '' });
    if (error) toast.error(error.message);
    else { toast.success('Published'); setFTitle(''); setFContent(''); setShowForm(false); }
    setPublishing(false);
  };
  const handleDeleteAnn = async (id: string) => supabase.from('announcements').delete().eq('id', id);

  const handleClaimBonus = async () => {
    if (!user || claimingBonus || !bonusLoaded) return;
    setClaimingBonus(true);
    const { data } = await supabase.from('user_bonus').select('bonus_points,last_claim_time').eq('user_id', user.id).maybeSingle();
    if (data?.last_claim_time && (BONUS_COOLDOWN - (Date.now() - new Date(data.last_claim_time).getTime()) > 0)) {
        toast.error('Already claimed recently. Try tomorrow!'); setClaimingBonus(false); return;
    }
    const nextPoints = (data?.bonus_points ?? bonusPoints) + 10;
    const { error } = await supabase.from('user_bonus').upsert({ user_id:user.id, user_email:user.email, bonus_points:nextPoints, last_claim_time:new Date().toISOString() });
    if (!error) { setBonusPoints(nextPoints); toast.success('Bonus claimed!'); }
    else toast.error('Failed to claim');
    setClaimingBonus(false);
  };

  const activeKeys = licenses.filter((l) => new Date(l.expiresAt).getTime() > Date.now());
  const approved = (transactions as any[]).filter((tx: any) => tx.status === 'approved').length;
  const totalOnline = parseInt(lag.onlineUsers) + parseInt(int.onlineUsers);

  return (
    <div style={{ position:'relative', minHeight:'calc(100vh - 80px)', background:'#0B0711', overflow:'hidden', borderRadius:24, fontFamily:'Inter, sans-serif', padding:'40px 0 0 0', display:'flex', flexDirection:'column', isolation:'isolate' }}>
      <style>{`
        /* AquaFi 1:1 Implementation */
        .aq-canvas {
          position: absolute; inset: 0; pointer-events: none; z-index: -1;
          background-image: 
            radial-gradient(circle at 20% 0%, rgba(67, 37, 110, 0.4) 0%, transparent 40%),
            radial-gradient(circle at 80% 0%, rgba(84, 67, 136, 0.3) 0%, transparent 40%),
            radial-gradient(circle at 50% 100%, rgba(30, 20, 50, 0.6) 0%, transparent 60%);
        }
        
        .aq-star { position: absolute; pointer-events: none; opacity: 0.6; }
        .aq-star::before, .aq-star::after {
          content: ''; position: absolute; background: #fff;
          box-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(139,92,246,0.6);
        }
        .aq-star::before { width: 1px; height: 100%; top: 0; left: 50%; transform: translateX(-50%); }
        .aq-star::after { width: 100%; height: 1px; top: 50%; left: 0; transform: translateY(-50%); }

        .aq-txt-hero { font-size: 46px; font-weight: 400; color: #FFF; letter-spacing: -0.04em; line-height: 1.15; z-index: 10; position:relative; }
        .aq-txt-sub { font-size: 14px; color: rgba(255,255,255,0.4); font-weight: 400; max-width: 480px; margin: 0 auto; line-height: 1.6; }
        
        .aq-get-started {
          margin-top: 24px; display: inline-flex; flex-direction: column; alignItems: center; gap: 12px; cursor: pointer; text-decoration: none;
        }
        .aq-get-started-text { font-size: 11px; font-weight: 500; letter-spacing: 0.1em; color: #FFF; text-transform: uppercase; }
        .aq-get-started-btn {
          width: 72px; height: 72px; border-radius: 50%; background: #FFF;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 40px rgba(255,255,255,0.4), inset 0 0 20px rgba(255,255,255,1);
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s;
        }
        .aq-get-started:hover .aq-get-started-btn { transform: scale(1.05); box-shadow: 0 0 60px rgba(255,255,255,0.6); }

        .aq-stat-floating { text-align: left; position: relative; }
        .aq-stat-floating-val { font-size: 26px; font-weight: 400; color: #fff; letter-spacing: -0.02em; line-height: 1.2;}
        .aq-stat-floating-lbl { font-size: 11px; color: rgba(255,255,255,0.3); font-weight: 400; padding-top: 2px; }

        .aq-bottom-panel {
          background: linear-gradient(180deg, rgba(26,20,38,0.7) 0%, rgba(13,10,20,0.95) 100%);
          border: 1px solid rgba(255,255,255,0.03);
          border-top: 1px solid rgba(255,255,255,0.25);
          box-shadow: inset 0 2px 20px rgba(139,92,246,0.1), 0 -10px 40px rgba(0,0,0,0.5);
          border-radius: 20px 20px 0 0;
          backdrop-filter: blur(20px);
          padding: 24px; position: relative; overflow: hidden;
        }
        
        .aq-panels-wrapper {
          display: grid; grid-template-columns: 1fr 1.2fr 1fr; align-items: end; gap: -20px;
          margin-top: auto; padding: 0 20px;
        }
        .aq-panel-left { transform: translateY(20px) scale(0.95); z-index: 1; border-top-right-radius: 0; }
        .aq-panel-right { transform: translateY(20px) scale(0.95); z-index: 1; border-top-left-radius: 0; }
        .aq-panel-center { z-index: 10; margin: 0 -30px; box-shadow: 0 -20px 60px rgba(0,0,0,0.8), inset 0 2px 30px rgba(139,92,246,0.15); border-top: 1px solid rgba(255,255,255,0.4); padding-bottom: 40px; }

        .aq-list-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        
        /* Thin Scrollbar */
        .aq-scroll::-webkit-scrollbar { width: 4px; }
        .aq-scroll::-webkit-scrollbar-track { background: transparent; }
        .aq-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>

      {/* Canvas Effects */}
      <div className="aq-canvas" />
      <div className="aq-star" style={{ width:12, height:12, top:'20%', left:'15%' }} />
      <div className="aq-star" style={{ width:16, height:16, top:'10%', right:'25%' }} />
      <div className="aq-star" style={{ width:8, height:8, top:'40%', right:'10%' }} />
      <div className="aq-star" style={{ width:14, height:14, bottom:'30%', left:'8%' }} />

      {/* ══ TOP HERO SECTION ══ */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'0 50px', position:'relative', zIndex:10 }}>
        
        {/* Left Floating Stats */}
        <div style={{ display:'flex', flexDirection:'column', gap:40, paddingTop:80 }}>
          {/* Subtle Circle decoration behind stats */}
          <div style={{ position:'absolute', left:-40, top:80, width:140, height:140, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:-1 }}>
             <ArrowUpRight size={14} color="rgba(255,255,255,0.2)" style={{ transform:'translate(-40px, 0)' }} />
          </div>
          <div className="aq-stat-floating">
            <div className="aq-stat-floating-val">${balance.toFixed(2)}</div>
            <div className="aq-stat-floating-lbl">Available Balance</div>
          </div>
          <div className="aq-stat-floating">
            <div className="aq-stat-floating-val">{approved} <span style={{fontSize:16}}>tx</span></div>
            <div className="aq-stat-floating-lbl">Approved Payments</div>
          </div>
        </div>

        {/* Center Massive Hero */}
        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', maxWidth:700 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 14px', borderRadius:99, border:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.01)', fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:32 }}>
            <Sparkles size={10} color="#8b5cf6" /> Effortless. Secure. Decentralized.
          </div>
          
          <h1 className="aq-txt-hero">
            Seamless 1999X Transactions<br />
            <span style={{ color:'#8b5cf6' }}>Powering the Future of Digital Finance</span>
          </h1>
          
          <p className="aq-txt-sub" style={{ marginTop:24, marginBottom:40 }}>
            An advanced AI-powered system that analyzes user preferences and delivers highly personalized content, ensuring a seamless and engaging experience.
          </p>

          <div className="aq-get-started" onClick={handleClaimBonus}>
             <div className="aq-get-started-text">{claimingBonus ? 'SYNCING...' : 'CLAIM BONUS'}</div>
             <div className="aq-get-started-btn">
                {claimingBonus ? <Loader2 size={24} color="#000" className="animate-spin" /> : <ArrowUpRight size={26} color="#000" strokeWidth={2.5} />}
             </div>
          </div>
        </div>

        {/* Right Floating Stats */}
        <div style={{ display:'flex', flexDirection:'column', gap:40, paddingTop:80, textAlign:'right', alignItems:'flex-end' }}>
          <div style={{ position:'absolute', right:-40, top:80, width:140, height:140, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:-1 }}>
             <ArrowUpRight size={14} color="rgba(255,255,255,0.2)" style={{ transform:'translate(40px, 0)' }} />
          </div>
          <div className="aq-stat-floating" style={{ textAlign:'right' }}>
             <div className="aq-stat-floating-val">{bonusPoints}</div>
             <div className="aq-stat-floating-lbl">Accumulated Points</div>
          </div>
          <div className="aq-stat-floating" style={{ textAlign:'right' }}>
             <div className="aq-stat-floating-val">{activeKeys.length}</div>
             <div className="aq-stat-floating-lbl">Active Instances</div>
          </div>
        </div>
      </div>

      {/* ══ THE THREE OVERLAPPING BOTTOM BOARDS ══ */}
      <div className="aq-panels-wrapper" style={{ marginTop: 'auto', minHeight: 320 }}>
        
        {/* Left Board: System Announcements */}
        <div className="aq-bottom-panel aq-panel-left">
           <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:400, color:'#fff', letterSpacing:'-0.02em', flex:1 }}>Broadcasts</div>
              {isMod && <button onClick={() => setShowForm(!showForm)} style={{ background:'none', color:'rgba(255,255,255,0.4)', border:'none', cursor:'pointer' }}><Plus size={16}/></button>}
           </div>

           {isMod && showForm && (
              <div style={{ background:'rgba(255,255,255,0.02)', padding:12, borderRadius:8, marginBottom:16 }}>
                 <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="Title..." style={{ width:'100%', background:'transparent', border:'none', borderBottom:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'6px 0', fontSize:13, outline:'none', marginBottom:8 }}/>
                 <div style={{ display:'flex', gap:8 }}>
                    <button onClick={handlePublishAnn} disabled={publishing} style={{ background:'#fff', color:'#000', border:'none', borderRadius:4, padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer', flex:1 }}>Transmit</button>
                    <button onClick={()=>setShowForm(false)} style={{ background:'rgba(255,255,255,0.1)', color:'#fff', border:'none', borderRadius:4, padding:'6px 12px', fontSize:11, cursor:'pointer' }}>Cancel</button>
                 </div>
              </div>
           )}

           <div className="aq-scroll" style={{ overflowY:'auto', maxHeight:200, paddingRight:10 }}>
              {annLoading ? <div style={{ color:'rgba(255,255,255,0.2)', fontSize:12, padding:'20px 0' }}>Decrypting...</div> : anns.length === 0 ? <div style={{ color:'rgba(255,255,255,0.2)', fontSize:12, padding:'20px 0' }}>No broadcasts</div> :
                 anns.map(a => (
                    <div key={a.id} className="aq-list-item" style={{ alignItems:'flex-start', flexDirection:'column', gap:4 }}>
                       <div style={{ display:'flex', alignItems:'center', width:'100%', justifyContent:'space-between' }}>
                          <span style={{ fontSize:13, color:'#fff', fontWeight:500 }}>{a.title}</span>
                          {isMod && <button onClick={() => handleDeleteAnn(a.id)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.2)', cursor:'pointer' }}><Trash2 size={12}/></button>}
                       </div>
                       <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>{a.content}</div>
                       <div style={{ fontSize:9, color:'rgba(255,255,255,0.2)', marginTop:4 }}>{new Date(a.created_at).toLocaleDateString()}</div>
                    </div>
                 ))
              }
           </div>
        </div>

        {/* Center Board: Active Licenses (The Star of the Show) */}
        <div className="aq-bottom-panel aq-panel-center">
           {/* Center Dome Glow Image representation */}
           <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'100%', height:'150px', background:'radial-gradient(circle at 50% 100%, rgba(139,92,246,0.1) 0%, transparent 60%)', borderBottom:'1px solid rgba(255,255,255,0.1)', borderRadius:'50%' }} />
           
           <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:30, position:'relative' }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                 <Key size={12} color="#000" />
              </div>
              <div style={{ fontSize:14, fontWeight:500, color:'#fff' }}>Active Instances</div>
           </div>

           <div className="aq-scroll" style={{ overflowY:'auto', maxHeight:220, position:'relative', zIndex:10, padding:'0 10px' }}>
              {activeKeys.length === 0 ? (
                 <div style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13, padding:'40px 0' }}>No active instances found</div>
              ) : activeKeys.map(lic => {
                 const dLeft = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
                 return (
                    <div key={lic.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                       <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:'rgba(84,67,136,0.3)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(139,92,246,0.3)' }}>
                             <Sparkles size={14} color="#8b5cf6" />
                          </div>
                          <div>
                             <div style={{ fontSize:11, color:'fff', fontWeight:500, letterSpacing:'1px', marginBottom:2 }}>{lic.key.replace('_INTERNAL','').slice(0,18)}…</div>
                             <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)' }}>{lic.productName} | {dLeft} Days Left</div>
                          </div>
                       </div>
                       <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:10, color:'#5EF7A6', marginBottom:2 }}>Active</div>
                          <div style={{ fontSize:9, color:'rgba(255,255,255,0.2)' }}>{new Date(lic.expiresAt).toLocaleDateString()}</div>
                       </div>
                    </div>
                 )
              })}
           </div>
        </div>

        {/* Right Board: Global Statistics */}
        <div className="aq-bottom-panel aq-panel-right">
           <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:400, color:'#fff', letterSpacing:'-0.02em' }}>Network Analytics</div>
           </div>
           
           <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.5, marginBottom:24 }}>
              Real-time progression of system connections. Monitor network traffic and global pings.
           </p>

           <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', paddingBottom:8, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                 <div>
                    <div style={{ fontSize:20, fontWeight:400, color:'#fff' }}>{isSystemOnline ? 'Operational' : 'Maintenance'}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>Server Health</div>
                 </div>
                 <Check size={16} color={isSystemOnline ? '#5EF7A6' : '#EA226B'} />
              </div>
              
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', paddingBottom:8, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                 <div>
                    <div style={{ fontSize:20, fontWeight:400, color:'#fff' }}>{totalOnline}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>Live Connections</div>
                 </div>
                 <TrendingUp size={16} color="#8b5cf6" />
              </div>

              {/* Fake Graph SVG matching the picture */}
              <div style={{ marginTop:10, opacity:0.6 }}>
                 <svg viewBox="0 0 200 60" width="100%" height="40" preserveAspectRatio="none">
                    <path d="M0 40 Q 20 20 40 30 T 80 10 T 120 40 T 160 20 T 200 0" fill="none" stroke="rgba(139,92,246,0.6)" strokeWidth="1.5" />
                    <path d="M0 40 Q 20 20 40 30 T 80 10 T 120 40 T 160 20 T 200 0 L 200 60 L 0 60 Z" fill="url(#gradGraph)" />
                    <defs>
                       <linearGradient id="gradGraph" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(139,92,246,0.2)" />
                          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
                       </linearGradient>
                    </defs>
                 </svg>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
