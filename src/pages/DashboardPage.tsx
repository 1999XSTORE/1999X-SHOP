import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity, notifyAll, sendNotificationEmail } from '@/lib/activity';
import { Wallet, Key, Gift, Clock, TrendingUp, Zap, Copy, CheckCircle, Eye, EyeOff, Loader2, Sparkles, Wrench, RefreshCw, Users, Globe, Plus, Trash2, Send, X, Activity } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { canManageAnnouncements } from '@/lib/roles';
import { safeFetch } from '@/lib/safeFetch';

const SUPA_URL  = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';

const BONUS_COOLDOWN = 86400000;

interface BonusRow {
  bonus_points: number;
  last_claim_time: string | null;
}
interface DBAnn { id:string; title:string; content:string; type:'update'|'maintenance'|'feature'; created_at:string; created_by?:string; }

const TYPE_CFG = {
  update:      { Icon: Sparkles, c:'var(--green)',  bg:'rgba(16,232,152,.07)',  bc:'rgba(16,232,152,.16)',  badge:'badge-green'  },
  maintenance: { Icon: Wrench,   c:'var(--purple)', bg:'rgba(109,40,217,.07)', bc:'rgba(139,92,246,.16)', badge:'badge-purple' },
  feature:     { Icon: Zap,      c:'var(--blue)',   bg:'rgba(56,189,248,.06)',  bc:'rgba(56,189,248,.14)',  badge:'badge-blue'   },
} as const;

const OFFLINE  = { status:'offline', numUsers:'0', numKeys:'0', onlineUsers:'0', version:'—' };
const safeNum  = (v: any) => { const n = parseInt(String(v ?? '0')); return isNaN(n) ? 0 : n; };
const norm     = (r: any) => { if (!r || r.status === 'offline') return OFFLINE; return { status:r.status??'online', numUsers:String(safeNum(r.numUsers??r.registered??0)), numKeys:String(safeNum(r.numKeys??r.keys??0)), onlineUsers:String(safeNum(r.onlineUsers??r.numOnlineUsers??0)), version:String(r.version??'—') }; };

async function fetchBonusRow(userId: string): Promise<BonusRow | null> {
  const { data, error } = await supabase.from('user_bonus').select('bonus_points,last_claim_time').eq('user_id', userId).maybeSingle();
  if (error) return null; return data as BonusRow | null;
}

async function upsertBonusRow(userId: string, userEmail: string, bonusPoints: number, lastClaimTime: string | null) {
  return supabase.from('user_bonus').upsert({ user_id: userId, user_email: userEmail, bonus_points: bonusPoints, last_claim_time: lastClaimTime, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

function Ticker({ expiresAt }: { expiresAt: string }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return <span style={{ color:'var(--red)', fontWeight:700, fontSize:13 }}>{t('common.expired')}</span>;

  const d = Math.floor(diff / 86400000);
  const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:3 }} className="mono">
      {d > 0 && <><span style={{ fontSize:28, fontWeight:800, color:'#fff' }}>{d}</span><span style={{ fontSize:11, color:'var(--muted)', marginRight:4 }}>d</span></>}
      <span style={{ fontSize:28, fontWeight:800, color:'#fff' }}>{h}</span>
      <span style={{ fontSize:16, color:'var(--muted)' }}>:</span>
      <span style={{ fontSize:28, fontWeight:800, color:'#fff' }}>{m}</span>
      <span style={{ fontSize:16, color:'var(--muted)' }}>:</span>
      <span style={{ fontSize:28, fontWeight:800, color:'rgba(255,255,255,.4)' }}>{s}</span>
    </div>
  );
}

function MiniCountdown({ ms }: { ms: number }) {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    const tick = () => {
      const left = ms - Date.now();
      if (left <= 0) { setTxt(''); return; }
      const d = Math.floor(left / 86400000);
      const h = String(Math.floor((left % 86400000) / 3600000)).padStart(2, '0');
      const m = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
      setTxt(d > 0 ? `${d}d ${h}:${m}:${s}` : `${h}:${m}:${s}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [ms]);
  return <span className="mono" style={{ fontWeight:700, color:'rgba(255,255,255,.7)' }}>{txt}</span>;
}

function LicCard({ lic, accent }: { lic: any; accent: 'p' | 'b' }) {
  const key = lic.key.replace('_INTERNAL', '');
  const dLeft = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const total = Math.max(30, Math.ceil((new Date(lic.expiresAt).getTime() - new Date(lic.lastLogin).getTime()) / 86400000));
  const pct = Math.min(100, (dLeft / total) * 100);
  const isPurple = accent === 'p';
  const color = isPurple ? '#8b5cf6' : '#38bdf8';
  const glow  = isPurple ? 'rgba(139,92,246,.3)' : 'rgba(56,189,248,.3)';
  const bg    = isPurple ? 'rgba(109,40,217,.08)' : 'rgba(56,189,248,.07)';
  const bc    = isPurple ? 'rgba(139,92,246,.2)'  : 'rgba(56,189,248,.18)';
  const barBg = isPurple ? 'linear-gradient(90deg,#6d28d9,#8b5cf6)' : 'linear-gradient(90deg,#0ea5e9,#38bdf8)';

  return (
    <div className="dash-lic-card" style={{ background:`linear-gradient(160deg,rgba(13,13,22,.97) 0%,rgba(9,9,16,.97) 100%)`, border:`1px solid ${bc}`, boxShadow:`0 24px 48px rgba(0,0,0,.45), 0 0 40px ${glow}` }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${color},transparent)` }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:color, boxShadow:`0 0 10px ${color}`, animation:'blink 2s infinite' }} />
          <span style={{ fontSize:13, fontWeight:700, color, letterSpacing:'.01em' }}>{lic.productName}</span>
        </div>
        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:bg, border:`1px solid ${bc}`, fontSize:10, fontWeight:800, color, letterSpacing:'.06em', textTransform:'uppercase' }}>
          • Active
        </span>
      </div>
      <Ticker expiresAt={lic.expiresAt} />
      <p style={{ fontSize:11, color:'rgba(255,255,255,.28)', margin:'5px 0 16px' }}>until {new Date(lic.expiresAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</p>
      <div style={{ height:4, borderRadius:999, background:'rgba(255,255,255,.07)', overflow:'hidden', marginBottom:14 }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:barBg, boxShadow:`0 0 8px ${glow}`, transition:'width .8s cubic-bezier(.22,1,.36,1)' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:10, color:'rgba(255,255,255,.25)', fontWeight:600 }}>{dLeft} days left</span>
        <span style={{ fontSize:10, color:'rgba(255,255,255,.25)' }}>{Math.round(pct)}% remaining</span>
      </div>
      <code style={{ fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,.18)', wordBreak:'break-all', letterSpacing:'.05em' }}>{key}</code>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, user, systemStatus } = useAppStore();
  const isSystemOnline = systemStatus === 'online';
  const isMod = canManageAnnouncements(user?.role);

  // Bonus
  const [bonusPoints, setBonusPoints] = useState(0);
  const [lastBonusClaim, setLastBonusClaim] = useState<string | null>(null);
  const [bonusCooldown, setBonusCooldown] = useState('');
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [bonusLoaded, setBonusLoaded] = useState(false);

  // Status variables
  const [lag, setLag] = useState(OFFLINE);
  const [int, setInt] = useState(OFFLINE);
  const [statsLoading, setStatsLoading] = useState(false);
  const [lastStatsUpdate, setLastStatsUpdate] = useState(new Date());

  // Announcements
  const [anns, setAnns] = useState<DBAnn[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  
  // Announcement Admin Form
  const [showForm, setShowForm] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fContent, setFContent] = useState('');
  const [fType, setFType] = useState<'update'|'maintenance'|'feature'>('update');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setBonusLoaded(false);
    fetchBonusRow(user.id).then((row) => {
      if (row) { setBonusPoints(row.bonus_points ?? 0); setLastBonusClaim(row.last_claim_time ?? null); }
      setBonusLoaded(true);
    });
  }, [user?.id]);

  useEffect(() => {
    const tick = () => {
      if (!lastBonusClaim) { setCanClaimBonus(true); setBonusCooldown(''); return; }
      const diff = BONUS_COOLDOWN - (Date.now() - new Date(lastBonusClaim).getTime());
      if (diff <= 0) { setCanClaimBonus(true); setBonusCooldown(''); return; }
      setCanClaimBonus(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setBonusCooldown(`${h}h ${m}m ${s}s`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [lastBonusClaim]);

  // Load live stats
  const loadKeyAuthStats = async () => {
    setStatsLoading(true);
    try {
      const res = await safeFetch('https://awjouzwzdkrevvnlenvn.supabase.co/functions/v1/keyauth-stats', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${ANON}`, apikey:ANON }, body:'{}' }, 10000);
      if (res?.ok) { const d = await res.json(); if (d?.lag) setLag(norm(d.lag)); if (d?.internal) setInt(norm(d.internal)); }
    } catch {}
    setStatsLoading(false); setLastStatsUpdate(new Date());
  };

  useEffect(() => {
    loadKeyAuthStats();
    const i = setInterval(loadKeyAuthStats, 60000);
    return () => clearInterval(i);
  }, []);

  // Announcements Loader
  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at', { ascending:false }).limit(10)
      .then(({ data }) => { if (data) setAnns(data as DBAnn[]); setAnnLoading(false); });

    const ch = supabase.channel('status-anns')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'announcements' }, ({ new: r }) => {
        setAnns(prev => [r as DBAnn, ...prev]);
      })
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'announcements' }, ({ old: r }) => {
        setAnns(prev => prev.filter(a => a.id !== (r as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleClaimBonus = async () => {
    if (!user || !canClaimBonus || claimingBonus || !bonusLoaded) return;
    setClaimingBonus(true);
    const latest = await fetchBonusRow(user.id);
    if (latest?.last_claim_time) {
      if (BONUS_COOLDOWN - (Date.now() - new Date(latest.last_claim_time).getTime()) > 0) {
        setLastBonusClaim(latest.last_claim_time); setCanClaimBonus(false); setClaimingBonus(false); toast.error('Already claimed recently. Please wait.'); return;
      }
    }
    const nextPoints = (latest?.bonus_points ?? bonusPoints) + 10;
    const claimTime = new Date().toISOString();
    const { error } = await upsertBonusRow(user.id, user.email, nextPoints, claimTime);
    if (error) { toast.error(t('common.error')); setClaimingBonus(false); return; }
    setBonusPoints(nextPoints); setLastBonusClaim(claimTime); setClaimingBonus(false); toast.success(t('bonus.claimed'));
    logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'bonus_claim', status:'success', meta:{ points:10, total:nextPoints } });
  };

  const handlePublishAnn = async () => {
    if (!fTitle.trim() || !fContent.trim()) { toast.error('Fill title and content'); return; }
    setPublishing(true);
    const { error } = await supabase.from('announcements').insert({ title: fTitle.trim(), content: fContent.trim(), type: fType, created_by: user?.email ?? '' });
    if (error) toast.error('Failed: ' + error.message);
    else {
      toast.success(t('status.published'));
      notifyAll({ type:'announcement', title:`📢 ${fTitle.trim()}`, body:fContent.trim().slice(0,80), linkPath:'/' });
      sendNotificationEmail({ mode:'broadcast', subject:fTitle.trim(), html:`<h2>${fTitle.trim()}</h2><p>${fContent.trim()}</p>` });
      if (user) logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'announcement_posted', product:fTitle.trim(), status:'success', meta:{ type:fType } });
      setFTitle(''); setFContent(''); setFType('update'); setShowForm(false);
    }
    setPublishing(false);
  };

  const handleDeleteAnn = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) toast.error('Delete failed: ' + error.message);
  };

  const active = licenses.filter((license) => new Date(license.expiresAt).getTime() > Date.now());
  const lagLicenses = active.filter((license) => license.productId === 'keyauth-lag');
  const internalLicenses = active.filter((license) => license.productId === 'keyauth-internal' || license.key.endsWith('_INTERNAL'));
  const approved = (transactions as any[]).filter((tx: any) => tx.status === 'approved').length;

  const totalOnline = safeNum(lag.onlineUsers) + safeNum(int.onlineUsers);
  const totalUsers  = safeNum(lag.numUsers)    + safeNum(int.numUsers);
  const typeLabel   = (tp: string) => tp === 'update' ? t('status.update') : tp === 'maintenance' ? t('status.maintenanceType') : t('status.feature');

  const stats = [
    { label:t('dashboard.balance'), val:`$${balance.toFixed(2)}`, icon:Wallet, c:'var(--purple)', bg:'rgba(109,40,217,.08)', bc:'rgba(139,92,246,.16)' },
    { label:t('dashboard.activeKeys'), val:active.length, icon:Key, c:'var(--green)', bg:'rgba(16,232,152,.06)', bc:'rgba(16,232,152,.14)' },
    { label:t('dashboard.approved'), val:approved, icon:TrendingUp, c:'var(--blue)', bg:'rgba(56,189,248,.06)', bc:'rgba(56,189,248,.14)' },
    { label:t('dashboard.bonusPoints'), val:bonusPoints, icon:Gift, c:'var(--amber)', bg:'rgba(251,191,36,.06)', bc:'rgba(251,191,36,.14)' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, paddingBottom: 60 }}>
      <style>{`
        @keyframes dash-in  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes dash-glow{ 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes dash-bar  { from{width:0} to{width:var(--w)} }
        .dash-card {
          background: linear-gradient(160deg,rgba(13,13,22,.97) 0%,rgba(8,8,16,.97) 100%);
          border: 1px solid rgba(255,255,255,.07); border-radius: 22px;
          box-shadow: 0 24px 48px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.03) inset;
          backdrop-filter: blur(20px); animation: dash-in .4s cubic-bezier(.22,1,.36,1) both;
        }
        .dash-stat {
          background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07); border-radius: 18px; padding: 22px 20px;
          transition: all .22s cubic-bezier(.22,1,.36,1); animation: dash-in .4s cubic-bezier(.22,1,.36,1) both;
        }
        .dash-stat:hover { background: rgba(255,255,255,.055); border-color: rgba(255,255,255,.12); transform: translateY(-2px); box-shadow: 0 16px 40px rgba(0,0,0,.3); }
        .dash-lic-card {
          border-radius: 20px; overflow: hidden; padding: 24px; transition: all .25s cubic-bezier(.22,1,.36,1);
          animation: dash-in .4s cubic-bezier(.22,1,.36,1) both; position: relative;
        }
        .dash-lic-card:hover { transform: translateY(-3px); }
        .dash-key-row { border-radius: 12px; padding: 12px 14px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); backdrop-filter: blur(12px); margin-bottom: 8px; }
        .dash-bonus-bar { height: 3px; border-radius: 999px; background: rgba(255,255,255,.06); overflow:hidden; margin-top:16px; }
        .status-container { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; animation: dash-in .4s cubic-bezier(.22,1,.36,1) both; animation-delay: 50ms; }
        @media (max-width: 1024px) { .status-container { grid-template-columns: 1fr; } }
      `}</style>

      {/* ══ HERO WELCOME ══ */}
      <div className="dash-card" style={{ padding:'28px 32px', position:'relative', overflow:'hidden', background:'linear-gradient(135deg,rgba(15,10,30,.98) 0%,rgba(8,8,18,.98) 60%,rgba(5,12,8,.98) 100%)', border:'1px solid rgba(139,92,246,.16)', boxShadow:'0 40px 80px rgba(0,0,0,.55), 0 0 80px rgba(109,40,217,.07)' }}>
        <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,.2) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, left:-20, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(16,232,152,.1) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(139,92,246,.5) 40%,rgba(16,232,152,.3) 70%,transparent)', pointerEvents:'none' }} />
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              {user?.avatar ? <img src={user.avatar} style={{ width:54, height:54, borderRadius:16, objectFit:'cover', border:'2px solid rgba(139,92,246,.35)', boxShadow:'0 0 24px rgba(109,40,217,.3)' }} />
                : <div style={{ width:54, height:54, borderRadius:16, background:'linear-gradient(135deg,#6d28d9,#4c1d95)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:'#fff', boxShadow:'0 0 24px rgba(109,40,217,.4)' }}>{user?.name?.charAt(0) || 'U'}</div>}
              <div style={{ position:'absolute', bottom:-3, right:-3, width:14, height:14, borderRadius:'50%', background:'#10e898', border:'2px solid rgba(8,8,18,.95)', boxShadow:'0 0 10px rgba(16,232,152,.7)' }} />
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.28)', marginBottom:5 }}>{t('dashboard.welcomeBack')}</div>
              <div style={{ fontSize:24, fontWeight:900, color:'#fff', letterSpacing:'-.02em', lineHeight:1 }}>{user?.name?.split(' ')[0] || 'User'} 👋</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:'rgba(16,232,152,.08)', border:'1px solid rgba(16,232,152,.2)' }}>
              <div className="dot dot-green" style={{ width:5, height:5 }} />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>{t('dashboard.undetected')}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:'rgba(139,92,246,.08)', border:'1px solid rgba(139,92,246,.2)' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#c4b5fd' }}>OB52 Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ STATUS + ANNOUNCEMENTS (Merged Logic into Dash Layout) ══ */}
      <div className="status-container">
        
        {/* Live System Status (Left) */}
        <div className="dash-card" style={{ padding:'24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:isSystemOnline?'rgba(16,232,152,.1)':'rgba(251,191,36,.1)', border:`1px solid ${isSystemOnline?'rgba(16,232,152,.2)':'rgba(251,191,36,.2)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CheckCircle size={22} color={isSystemOnline?'#10e898':'#fbbf24'} />
            </div>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:700, marginBottom:4 }}>{t('status.systemStatus')}</div>
              <div style={{ fontSize:16, fontWeight:800, color:'#fff', letterSpacing:'-.01em' }}>{isSystemOnline ? t('status.allOps') : t('status.maintenance')}</div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Users size={15} color="#c4b5fd" />
              <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{t('status.liveStats')}</span>
            </div>
            <button onClick={loadKeyAuthStats} disabled={statsLoading} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.3)', display:'flex', padding:4 }}>
              <RefreshCw size={13} className={statsLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
            {[{ label:t('status.totalUsers'), val:totalUsers, c:'#c4b5fd', bg:'rgba(109,40,217,.08)', bc:'rgba(139,92,246,.16)' }, { label:t('status.onlineNow'),  val:totalOnline, c:'#10e898', bg:'rgba(16,232,152,.06)', bc:'rgba(16,232,152,.14)' }].map(s => (
              <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.bc}`, borderRadius:12, padding:'14px 10px', textAlign:'center' }}>
                <div className="mono" style={{ fontSize:22, fontWeight:900, color:s.c, marginBottom:4 }}>{statsLoading ? <span style={{ opacity:.4 }}>···</span> : s.val.toLocaleString()}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', textTransform:'uppercase', fontWeight:700, letterSpacing:'.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:700, marginBottom:8 }}>{t('status.services')}</div>
          {['Authentication Server', 'License Server', 'Chat Server'].map(svc => (
            <div key={svc} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Globe size={13} style={{ color:'rgba(255,255,255,.2)' }} />
                <span style={{ fontSize:12, color:'rgba(255,255,255,.6)' }}>{svc}</span>
              </div>
              <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'#10e898' }}>
                <div className="dot dot-green" style={{ width:5, height:5 }} />{t('status.online')}
              </span>
            </div>
          ))}
        </div>

        {/* Announcements Stream (Right) */}
        <div className="dash-card" style={{ padding:'24px', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:800, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
              <Sparkles size={16} color="#fbbf24" /> {t('status.announcements')}
            </div>
            {isMod && (
              <button onClick={() => setShowForm(!showForm)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:10, background:showForm?'rgba(139,92,246,.18)':'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.25)', cursor:'pointer', color:'#c4b5fd', fontSize:11, fontWeight:700, transition:'all .15s' }}>
                {showForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> {t('status.pushAnnouncement')}</>}
              </button>
            )}
          </div>

          {isMod && showForm && (
            <div style={{ padding:'16px', borderRadius:14, background:'rgba(139,92,246,.05)', border:'1px solid rgba(139,92,246,.18)', marginBottom:16 }}>
              <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
                {(['update','feature','maintenance'] as const).map(tp => {
                  const cfg = TYPE_CFG[tp];
                  return (
                    <button key={tp} onClick={() => setFType(tp)} style={{ padding:'4px 10px', borderRadius:20, fontSize:10, fontWeight:700, cursor:'pointer', border:`1px solid ${fType===tp?cfg.c:'rgba(255,255,255,.1)'}`, background:fType===tp?cfg.bg:'rgba(255,255,255,.03)', color:fType===tp?cfg.c:'rgba(255,255,255,.4)', textTransform:'uppercase' }}>
                      {typeLabel(tp)}
                    </button>
                  );
                })}
              </div>
              <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder={t('status.annTitle')} style={{ width:'100%', background:'rgba(0,0,0,.2)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none', marginBottom:8 }}/>
              <textarea value={fContent} onChange={e => setFContent(e.target.value)} placeholder={t('status.annContent')} rows={2} style={{ width:'100%', background:'rgba(0,0,0,.2)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:13, outline:'none', resize:'vertical', marginBottom:10 }}/>
              <button onClick={handlePublishAnn} disabled={publishing} className="btn btn-p btn-full" style={{ padding:'9px 0', fontSize:13, height:'auto' }}>
                {publishing ? <><RefreshCw size={14} className="animate-spin" /> {t('status.publishing')}</> : <><Send size={14} /> {t('status.publish')}</>}
              </button>
            </div>
          )}

          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, overflowY:'auto', maxHeight:'280px', paddingRight:'6px' }} className="custom-scroll">
            {annLoading ? (
               <div style={{ textAlign:'center', color:'rgba(255,255,255,.3)', fontSize:12, padding:'20px 0' }}>{t('common.loading')}</div>
            ) : anns.length === 0 ? (
               <div style={{ textAlign:'center', color:'rgba(255,255,255,.3)', fontSize:12, padding:'20px 0', border:'1px dashed rgba(255,255,255,.1)', borderRadius:12 }}>{t('status.noAnnouncements')}</div>
            ) : (
              anns.map((ann, i) => {
                const cfg = TYPE_CFG[ann.type] ?? TYPE_CFG.update;
                return (
                  <div key={ann.id} style={{ display:'flex', gap:12, padding:'14px', borderRadius:12, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.05)', position:'relative' }}>
                     <cfg.Icon size={16} color={cfg.c} style={{ marginTop:2, flexShrink:0 }} />
                     <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                           <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{ann.title}</span>
                           <span className={`badge ${cfg.badge}`} style={{ fontSize:9, padding:'2px 6px' }}>{typeLabel(ann.type)}</span>
                           <span style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginLeft:'auto' }}>{new Date(ann.created_at).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', lineHeight:1.5, margin:0 }}>{ann.content}</p>
                     </div>
                     {isMod && (
                        <button onClick={() => handleDeleteAnn(ann.id)} style={{ position:'absolute', top:14, right:14, color:'rgba(255,255,255,.2)', background:'none', border:'none', cursor:'pointer' }}>
                          <Trash2 size={13}/>
                        </button>
                     )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ══ STATS GRID ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, animationDelay:'100ms' }} className="dash-in">
        {stats.map((stat, i) => (
          <div key={stat.label} className="dash-stat">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ width:38, height:38, borderRadius:11, background:stat.bg, border:`1px solid ${stat.bc}`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 16px ${stat.bc}` }}>
                <stat.icon size={17} style={{ color:stat.c }} />
              </div>
              <div style={{ width:6, height:6, borderRadius:'50%', background:stat.c, boxShadow:`0 0 8px ${stat.c}`, animation:'dash-glow 2s ease-in-out infinite' }} />
            </div>
            <div style={{ fontSize:32, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1, marginBottom:5 }}>{stat.val}</div>
            <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ══ ACTIVE SUBSCRIPTIONS ══ */}
      {active.length > 0 ? (
        <div style={{ animationDelay:'120ms' }} className="dash-in">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:3, height:16, borderRadius:999, background:'linear-gradient(180deg,#8b5cf6,#6d28d9)' }} />
            <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.4)' }}>{t('dashboard.activeSubscriptions')}</span>
          </div>
          <div style={{ display:'grid', gap:14, gridTemplateColumns: internalLicenses.length > 0 && lagLicenses.length > 0 ? 'repeat(auto-fit,minmax(280px,1fr))' : '1fr' }}>
            {internalLicenses.map((license) => <LicCard key={license.id} lic={license} accent="b" />)}
            {lagLicenses.map((license) => <LicCard key={license.id} lic={license} accent="p" />)}
          </div>
        </div>
      ) : (
        <div className="dash-card dash-in" style={{ padding:'52px 24px', textAlign:'center', borderStyle:'dashed', borderColor:'rgba(255,255,255,.08)', animationDelay:'120ms' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Key size={24} style={{ color:'rgba(255,255,255,.2)' }} />
          </div>
          <p style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,.45)', marginBottom:6 }}>{t('dashboard.noLicense')}</p>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.22)' }}>{t('dashboard.noLicenseDesc')}</p>
        </div>
      )}

      {/* ══ DAILY BONUS ══ */}
      <div className="dash-card dash-in" style={{ padding:'22px 24px', background:'linear-gradient(135deg,rgba(18,14,4,.98) 0%,rgba(10,8,4,.98) 100%)', border:'1px solid rgba(251,191,36,.14)', boxShadow:'0 24px 48px rgba(0,0,0,.4), 0 0 40px rgba(251,191,36,.05)', animationDelay:'150ms' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, borderRadius:'22px 22px 0 0', background:'linear-gradient(90deg,transparent,rgba(251,191,36,.4),transparent)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, flex:1 }}>
            <div style={{ width:46, height:46, borderRadius:14, background:'rgba(251,191,36,.1)', border:'1px solid rgba(251,191,36,.22)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(251,191,36,.15)', flexShrink:0 }}>
              <Gift size={22} color="#fbbf24" />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:3 }}>{t('dashboard.dailyBonus')}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.35)' }}>{t('dashboard.dailyBonusDesc')}</div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
              <span style={{ fontSize:28, fontWeight:900, color:'#fbbf24', letterSpacing:'-.03em' }}>{bonusPoints}</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontWeight:500 }}>{t('bonus.title')}</span>
            </div>
            {!bonusLoaded ? <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,.25)' }}><Loader2 size={11} className="animate-spin" /> Loading…</div>
              : canClaimBonus ? <button className="btn btn-sm" style={{ background:'linear-gradient(135deg,#fbbf24,#f59e0b)', color:'#3a1a00', fontWeight:800, border:'none', boxShadow:'0 0 20px rgba(245,158,11,.4)', padding:'9px 18px', borderRadius:11, fontSize:13 }} onClick={handleClaimBonus} disabled={claimingBonus}>{claimingBonus ? <><Loader2 size={12} className="animate-spin" /> Claiming…</> : t('dashboard.claimNow')}</button>
              : <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,.3)', fontWeight:600 }}><Clock size={11} style={{ color:'rgba(255,255,255,.25)' }} /> {bonusCooldown}</div>}
          </div>
        </div>
        <div className="dash-bonus-bar">
          <div style={{ height:'100%', width:`${bonusPoints % 100}%`, borderRadius:999, background:'linear-gradient(90deg,#f59e0b,#fbbf24)', boxShadow:'0 0 8px rgba(251,191,36,.5)', transition:'width .6s cubic-bezier(.22,1,.36,1)' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
          <span style={{ fontSize:10, color:'rgba(255,255,255,.2)', fontWeight:600 }}>{bonusPoints % 100}/100 to next reward</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,.2)' }}>Level {Math.floor(bonusPoints / 100) + 1}</span>
        </div>
      </div>
    </div>
  );
}
