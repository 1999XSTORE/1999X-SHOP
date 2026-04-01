import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity, notifyAll, sendNotificationEmail } from '@/lib/activity';
import { Wallet, Key, Gift, Clock, TrendingUp, Zap, Copy, CheckCircle, Eye, EyeOff, Loader2, Sparkles, Wrench, RefreshCw, Users, Globe, Plus, Trash2, Send, X, Activity, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { canManageAnnouncements } from '@/lib/roles';
import { safeFetch } from '@/lib/safeFetch';

const SUPA_URL  = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';

const BONUS_COOLDOWN = 86400000;
const FREE_KEY_COOLDOWN = 172800000;
const FREE_KEY_TTL = 86400000;

interface FreeRow {
  lag_key: string | null;
  internal_key: string | null;
  claimed_at: string;
  expires_at: string;
}

interface BonusRow {
  bonus_points: number;
  last_claim_time: string | null;
}
interface DBAnn { id:string; title:string; content:string; type:'update'|'maintenance'|'feature'; created_at:string; created_by?:string; }

const TYPE_CFG = {
  update:      { Icon: Sparkles, c:'#5EF7A6', bg:'rgba(94,247,166,0.1)' },
  maintenance: { Icon: Wrench,   c:'#544388', bg:'rgba(84,67,136,0.1)' },
  feature:     { Icon: Zap,      c:'#EA226B', bg:'rgba(234,34,107,0.1)' },
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
  return <span className="mono" style={{ fontWeight:500, color:'rgba(255,255,255,0.7)' }}>{txt}</span>;
}

function Ticker({ expiresAt }: { expiresAt: string }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return <span style={{ color:'var(--red)', fontWeight:500, fontSize:12 }}>{t('common.expired')}</span>;

  const d = Math.floor(diff / 86400000);
  const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:2 }} className="mono">
      {d > 0 && <><span style={{ fontSize:15, fontWeight:500, color:'#fff' }}>{d}</span><span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginRight:4 }}>d</span></>}
      <span style={{ fontSize:15, fontWeight:500, color:'#fff' }}>{h}</span>
      <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>:</span>
      <span style={{ fontSize:15, fontWeight:500, color:'#fff' }}>{m}</span>
      <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>:</span>
      <span style={{ fontSize:14, fontWeight:500, color:'rgba(255,255,255,0.5)' }}>{s}</span>
    </div>
  );
}

function LicCard({ lic, accent }: { lic: any; accent: 'p' | 'b' }) {
  const key = lic.key.replace('_INTERNAL', '');
  const dLeft = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const total = Math.max(30, Math.ceil((new Date(lic.expiresAt).getTime() - new Date(lic.lastLogin).getTime()) / 86400000));
  const pct = Math.min(100, (dLeft / total) * 100);
  
  return (
    <div className="aq-card" style={{ padding: '24px', display:'flex', flexDirection:'column', gap:'12px', transition:'transform 0.2s', cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg, rgba(84,67,136,0.3), rgba(67,37,110,0.1))', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(255,255,255,0.05)' }}>
            <Key size={14} color="#A0A0A5" />
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:'#fff', letterSpacing:'-0.01em' }}>{lic.productName}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Active Instance</div>
          </div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.03)', padding:'4px 10px', borderRadius:20, fontSize:10, color:'#fff', fontWeight:500, border:'1px solid rgba(255,255,255,0.06)' }}>
          {dLeft} Days Left
        </div>
      </div>
      
      <div style={{ height:3, borderRadius:999, background:'rgba(255,255,255,0.04)', overflow:'hidden', marginTop:10 }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:'linear-gradient(90deg, #544388, #8b5cf6)', boxShadow:'0 0 10px rgba(139,92,246,0.5)' }} />
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
        <Ticker expiresAt={lic.expiresAt} />
        <code style={{ fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,0.3)', letterSpacing:'0.05em' }}>{key.slice(0,18)}…</code>
      </div>
    </div>
  );
}

function FreeKeyCard() {
  const { t } = useTranslation();
  const { addLicense, user } = useAppStore();
  const [row, setRow] = useState<FreeRow | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('free_trial_keys').select('lag_key,internal_key,claimed_at,expires_at').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setRow(data as FreeRow | null); setDbLoading(false); });
  }, [user?.id]);

  useEffect(() => {
    const tick = () => {
      if (!row) { setCanClaim(true); setCooldownMs(0); return; }
      const next = new Date(row.claimed_at).getTime() + FREE_KEY_COOLDOWN;
      const left = next - Date.now();
      if (left <= 0) { setCanClaim(true); setCooldownMs(0); } else { setCanClaim(false); setCooldownMs(next); }
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [row?.claimed_at]);

  const handleClaim = async () => {
    if (!canClaim || generating || !user) return;
    setGenerating(true);
    toast.loading('Generating 1-day trial credentials...', { id:'free-trial' });

    try {
      const [lagRes, intRes] = await Promise.all([
        fetch(`${SUPA_URL}/functions/v1/generate-key`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${ANON}`, apikey:ANON }, body:JSON.stringify({ panel_type:'lag', days:1, hours:0, mask:'1999X-FREE-****' }) }).then(r => r.json()),
        fetch(`${SUPA_URL}/functions/v1/generate-key`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${ANON}`, apikey:ANON }, body:JSON.stringify({ panel_type:'internal', days:1, hours:0, mask:'1999X-FREE-****' }) }).then(r => r.json()),
      ]);

      const lagKey = lagRes?.success ? lagRes.key : null;
      const intKey = intRes?.success ? intRes.key : null;

      if (!lagKey && !intKey) { toast.dismiss('free-trial'); toast.error('Activation Failed'); setGenerating(false); return; }

      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + FREE_KEY_TTL).toISOString();
      const { error } = await supabase.from('free_trial_keys').upsert({ user_id:user.id, user_email:user.email, lag_key:lagKey, internal_key:intKey, claimed_at:now, expires_at:expiresAt }, { onConflict:'user_id' });

      if (error) { toast.dismiss('free-trial'); toast.error(error.message); setGenerating(false); return; }

      if (lagKey) addLicense({ id:`free_lag_${Date.now()}`, productId:'keyauth-lag', productName:'Fake Lag (Free 1 Day Trial)', key:lagKey, hwid:'', lastLogin:now, expiresAt, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });
      if (intKey) addLicense({ id:`free_int_${Date.now()}`, productId:'keyauth-internal', productName:'Internal (Free 1 Day Trial)', key:`${intKey}_INTERNAL`, hwid:'', lastLogin:now, expiresAt, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });

      setRow({ lag_key:lagKey, internal_key:intKey, claimed_at:now, expires_at:expiresAt });
      logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'free_key_claim', product:'Free 1-Day Trial Key', status:'success', meta:{ lag:!!lagKey, internal:!!intKey, expires:expiresAt } });
      toast.dismiss('free-trial'); toast.success('Trial Initialized');
    } catch (error) { toast.dismiss('free-trial'); toast.error(String(error)); }
    setGenerating(false);
  };

  if (dbLoading) return <div className="aqua-card" style={{ padding:'24px', textAlign:'center', color:'rgba(255,255,255,0.4)', fontSize:13 }}>Loading Module...</div>;

  const isActive = !!row && new Date(row.expires_at).getTime() > Date.now();
  const dDiff = cooldownMs - Date.now();
  const dCo = dDiff > 0 ? `${Math.floor(dDiff/3600000)}h ${Math.floor((dDiff%3600000)/60000)}m left` : '';

  return (
    <div className="aqua-card" style={{ padding:'32px', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', animationDelay:'250ms' }}>
      <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg, rgba(84,67,136,0.2), rgba(94,247,166,0.1))', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, boxShadow:'0 0 30px rgba(94,247,166,0.1)' }}>
        <Zap size={26} color="#5EF7A6" />
      </div>
      <h3 style={{ fontSize:20, fontWeight:400, color:'#FFF', letterSpacing:'-0.02em', margin:'0 0 8px 0' }}>Trial Node Instance</h3>
      <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', margin:'0 0 24px 0', maxWidth:200 }}>Generate a secure 24-hr trial node credential set.</p>

      {isActive && row ? (
        <div style={{ background:'rgba(94,247,166,0.05)', border:'1px solid rgba(94,247,166,0.2)', padding:'10px 16px', borderRadius:16, width:'100%', marginBottom:16 }}>
          <div style={{ fontSize:11, color:'#5EF7A6', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Trial Active</div>
          <div style={{ fontSize:18, color:'#fff', fontWeight:500 }}><MiniCountdown ms={new Date(row.expires_at).getTime()} /></div>
        </div>
      ) : canClaim ? (
         <button onClick={handleClaim} disabled={generating} className="aqua-btn" style={{ background:'rgba(94,247,166,0.1)', borderColor:'rgba(94,247,166,0.3)', color:'#5EF7A6', width:'100%', justifyContent:'center', padding:'12px' }}>
            {generating ? <Loader2 size={16} className="animate-spin" /> : 'Deploy Trial Node'}
         </button>
      ) : (
         <button className="aqua-btn" style={{ width:'100%', justifyContent:'center', padding:'12px', opacity:0.6, cursor:'not-allowed' }}>
            <Clock size={14} /> Network Cooldown: {dCo}
         </button>
      )}
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
    if (latest?.last_claim_time && (BONUS_COOLDOWN - (Date.now() - new Date(latest.last_claim_time).getTime()) > 0)) {
        setLastBonusClaim(latest.last_claim_time); setCanClaimBonus(false); setClaimingBonus(false); toast.error('Already claimed recently.'); return;
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

  const stats = [
    { label:t('dashboard.balance'), val:`$${balance.toFixed(2)}` },
    { label:t('dashboard.activeKeys'), val:active.length },
    { label:t('dashboard.approved'), val:approved },
    { label:t('dashboard.bonusPoints'), val:bonusPoints },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28, paddingBottom: 60, fontFamily:'Inter, sans-serif' }}>
      <style>{`
        /* AquaFi Aesthetic */
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
        
        .aqua-card {
          background: linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          position: relative; overflow: hidden;
          animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        .aqua-card::before {
          content: ""; position: absolute; top:0; left:0; right:0; height:1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          opacity: 0.6;
        }
        .aqua-card:hover { border-color: rgba(255,255,255,0.1); }
        
        .aqua-stat { display:flex; flex-direction:column; align-items:flex-start; animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .aqua-stat-val { font-size: 38px; font-weight: 400; color: #FFFFFF; letter-spacing: -0.03em; line-height: 1; margin-bottom: 6px; }
        .aqua-stat-lbl { font-size: 13px; font-weight: 400; color: rgba(255,255,255,0.5); letter-spacing: -0.01em; }
        
        .aqua-btn {
          background: rgba(255,255,255,0.05); color: #fff;
          border: 1px solid rgba(255,255,255,0.1); border-radius: 99px;
          padding: 8px 20px; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.2s; display:inline-flex; align-items:center; gap:8px;
        }
        .aqua-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); transform:scale(1.02); }
        .aqua-btn-primary { background: #544388; border-color: #6C5AA6; }
        .aqua-btn-primary:hover { background: #6C5AA6; border-color: #8D7ABF; box-shadow: 0 0 20px rgba(84,67,136,0.4); }

        .aqua-grid { display: grid; grid-template-columns: 240px 1fr 240px; gap: 32px; align-items: center; min-height: 380px; position: relative; }
        @media (max-width: 1024px) { .aqua-grid { grid-template-columns: 1fr; gap:24px; min-height: auto; } }
      `}</style>

      {/* ══ THE AMAZING AQUA-FI HERO SECTION ══ */}
      <div style={{ position:'relative', borderRadius:28, background:'#161316', border:'1px solid rgba(255,255,255,0.04)', overflow:'hidden', boxShadow:'inset 0 0 100px rgba(0,0,0,0.5)' }} className="aqua-card">
        {/* Background Lights */}
        <div style={{ position:'absolute', top:'-10%', left:'15%', width:'600px', height:'600px', background:'radial-gradient(circle, rgba(84,67,136,0.2) 0%, transparent 60%)', filter:'blur(40px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-20%', right:'0%', width:'500px', height:'500px', background:'radial-gradient(circle, rgba(67,37,110,0.3) 0%, transparent 60%)', filter:'blur(40px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', inset:0, background:'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', opacity:0.7, pointerEvents:'none'}} />

        <div className="aqua-grid" style={{ padding:'48px 40px', zIndex:10, position:'relative' }}>
          
          {/* Left Stats Column */}
          <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
            <div className="aqua-stat" style={{ animationDelay:'50ms' }}>
              <div className="aqua-stat-val">{stats[0].val}</div>
              <div className="aqua-stat-lbl">{stats[0].label}</div>
            </div>
            <div className="aqua-stat" style={{ animationDelay:'100ms' }}>
              <div className="aqua-stat-val">{stats[1].val}</div>
              <div className="aqua-stat-lbl">{stats[1].label}</div>
            </div>
            <div className="aqua-stat" style={{ animationDelay:'150ms' }}>
              <div className="aqua-stat-val">{stats[2].val}</div>
              <div className="aqua-stat-lbl">{stats[2].label}</div>
            </div>
          </div>

          {/* Center Main Copy */}
          <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:99, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)', fontSize:12, fontWeight:400, color:'rgba(255,255,255,0.7)', marginBottom:24, backdropFilter:'blur(10px)' }}>
              <Sparkles size={12} color="#5EF7A6" /> Premium Architecture
            </div>
            <h1 style={{ fontSize:42, fontWeight:400, color:'#FFF', letterSpacing:'-0.03em', lineHeight:1.15, marginBottom:16 }}>
              Seamless Experience with <br/>
              <span style={{ color:'#8b5cf6' }}>1999X Digital Finance</span>
            </h1>
            <p style={{ fontSize:14, fontWeight:400, color:'rgba(255,255,255,0.4)', lineHeight:1.6, maxWidth:400, margin:'0 auto 32px' }}>
              An advanced AI-powered system that analyzes user preferences and delivers highly personalized content, ensuring a seamless and engaging experience.
            </p>
            {isSystemOnline ? (
               <button className="aqua-btn aqua-btn-primary" style={{ padding:'12px 28px', fontSize:14 }}>Get Started <ArrowRight size={16} /></button>
            ) : (
               <button className="aqua-btn" style={{ padding:'12px 28px', fontSize:14, background:'rgba(234,34,107,0.1)', borderColor:'rgba(234,34,107,0.3)', color:'#EA226B' }}>Network Maintenance <Wrench size={16} /></button>
            )}
          </div>

          {/* Right Network Column */}
          <div style={{ display:'flex', flexDirection:'column', gap:32, alignItems:'flex-end', textAlign:'right' }}>
            <div className="aqua-stat" style={{ alignItems:'flex-end', animationDelay:'200ms' }}>
              <div className="aqua-stat-val">{totalUsers.toLocaleString()}+</div>
              <div className="aqua-stat-lbl">Total Users</div>
            </div>
            <div className="aqua-stat" style={{ alignItems:'flex-end', animationDelay:'250ms' }}>
              <div className="aqua-stat-val">{totalOnline.toLocaleString()}</div>
              <div className="aqua-stat-lbl">Online Sessions</div>
            </div>
            <div className="aqua-stat" style={{ alignItems:'flex-end', animationDelay:'300ms' }}>
              <div className="aqua-stat-val" style={{ color:'#5EF7A6' }}>Active</div>
              <div className="aqua-stat-lbl">Network Status</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ DIVIDED BOTTOM METRICS ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:28 }}>
        
        {/* Announcments Aqua Card */}
        <div className="aqua-card" style={{ padding:'32px', display:'flex', flexDirection:'column', animationDelay:'150ms' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <h2 style={{ fontSize:20, fontWeight:400, color:'#FFF', letterSpacing:'-0.02em', margin:0 }}>System Broadcasts</h2>
            {isMod && (
                <button onClick={() => setShowForm(!showForm)} className="aqua-btn" style={{ padding:'6px 14px', fontSize:12 }}>
                  {showForm ? <><X size={12}/> Close</> : <><Plus size={12}/> Broadcast</>}
                </button>
            )}
          </div>

          {showForm && isMod && (
            <div style={{ padding:'20px', borderRadius:16, background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.05)', marginBottom:20 }}>
               <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                  {(['update','feature','maintenance'] as const).map(tp => (
                     <button key={tp} onClick={() => setFType(tp)} style={{ padding:'6px 14px', borderRadius:20, fontSize:11, fontWeight:400, cursor:'pointer', border:`1px solid ${fType===tp?TYPE_CFG[tp].c:'rgba(255,255,255,0.05)'}`, background:fType===tp?TYPE_CFG[tp].bg:'transparent', color:fType===tp?TYPE_CFG[tp].c:'rgba(255,255,255,0.4)', textTransform:'capitalize' }}>
                        {tp}
                     </button>
                  ))}
               </div>
               <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="Forecast Title" style={{ width:'100%', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, padding:'12px 14px', color:'#fff', fontSize:13, outline:'none', marginBottom:12 }}/>
               <textarea value={fContent} onChange={e=>setFContent(e.target.value)} placeholder="Transmission details..." rows={2} style={{ width:'100%', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, padding:'12px 14px', color:'#fff', fontSize:13, outline:'none', resize:'vertical', marginBottom:16 }}/>
               <button onClick={handlePublishAnn} disabled={publishing} className="aqua-btn aqua-btn-primary" style={{ width:'100%', justifyContent:'center', padding:'10px' }}>
                  {publishing ? <><Loader2 size={14} className="animate-spin" /> Transmitting...</> : <><Send size={14} /> Transmit Broadcast</>}
               </button>
            </div>
          )}

          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10, overflowY:'auto', maxHeight: showForm?'180px':'300px', paddingRight:'10px' }} className="custom-scroll">
            {annLoading ? (
               <div style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13, padding:'30px 0' }}>Decrypting streams...</div>
            ) : anns.length === 0 ? (
               <div style={{ textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:13, padding:'40px 0', border:'1px dashed rgba(255,255,255,0.08)', borderRadius:16 }}>No active broadcasts</div>
            ) : (
              anns.map((ann) => {
                const cfg = TYPE_CFG[ann.type] ?? TYPE_CFG.update;
                return (
                  <div key={ann.id} style={{ display:'flex', gap:16, padding:'16px', borderRadius:16, background:'rgba(255,255,255,0.015)', border:'1px solid rgba(255,255,255,0.03)', position:'relative', transition:'background 0.2s', cursor:'default' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'} onMouseOut={e => e.currentTarget.style.background='rgba(255,255,255,0.015)'}>
                     <div style={{ width:32, height:32, borderRadius:'50%', background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <cfg.Icon size={14} color={cfg.c} />
                     </div>
                     <div style={{ flex:1, minWidth:0, paddingTop:2 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                           <span style={{ fontSize:15, fontWeight:500, color:'#fff', letterSpacing:'-0.01em' }}>{ann.title}</span>
                           <span style={{ fontSize:10, color:cfg.c, border:`1px solid ${cfg.c}40`, padding:'2px 8px', borderRadius:20 }}>{ann.type}</span>
                        </div>
                        <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:1.6, margin:0 }}>{ann.content}</p>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:12 }}>{new Date(ann.created_at).toLocaleDateString()}</div>
                     </div>
                     {isMod && (
                        <button onClick={() => handleDeleteAnn(ann.id)} style={{ position:'absolute', top:22, right:16, color:'rgba(255,255,255,0.2)', background:'none', border:'none', cursor:'pointer' }}>
                          <Trash2 size={14}/>
                        </button>
                     )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bonus & Mini Network */}
        <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
          
          <div className="aqua-card" style={{ padding:'32px', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', animationDelay:'200ms' }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg, rgba(84,67,136,0.2), rgba(234,34,107,0.1))', border:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, boxShadow:'0 0 30px rgba(84,67,136,0.1)' }}>
              <Gift size={26} color="#ffffff" />
            </div>
            <h3 style={{ fontSize:20, fontWeight:400, color:'#FFF', letterSpacing:'-0.02em', margin:'0 0 8px 0' }}>Daily Reward Network</h3>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.4)', margin:'0 0 24px 0', maxWidth:200 }}>Initialize your daily sync bonus to amplify credentials.</p>
            
            <div style={{ fontSize:32, fontWeight:400, color:'#fff', letterSpacing:'-0.03em', marginBottom:4 }}>{bonusPoints}<span style={{fontSize:18, color:'rgba(255,255,255,0.4)'}}> pts</span></div>

            <div style={{ height:2, width:'100%', background:'rgba(255,255,255,0.05)', borderRadius:4, overflow:'hidden', margin:'16px 0 24px' }}>
              <div style={{ height:'100%', width:`${bonusPoints % 100}%`, background:'#544388' }} />
            </div>

            {canClaimBonus ? (
               <button onClick={handleClaimBonus} disabled={claimingBonus} className="aqua-btn aqua-btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
                  {claimingBonus ? <Loader2 size={16} className="animate-spin" /> : 'Sync Bonus Now'}
               </button>
            ) : (
               <button className="aqua-btn" style={{ width:'100%', justifyContent:'center', padding:'12px', opacity:0.6, cursor:'not-allowed' }}>
                  <Clock size={14} /> {bonusCooldown}
               </button>
            )}
          </div>

          <FreeKeyCard />

        </div>

      </div>

      {/* ══ ACTIVE SUBSCRIPTIONS ══ */}
      {active.length > 0 && (
         <div style={{ animationDelay:'250ms' }}>
            <h2 style={{ fontSize:20, fontWeight:400, color:'#FFF', letterSpacing:'-0.02em', marginBottom:20, paddingLeft:4 }}>Connected Environments</h2>
            <div style={{ display:'grid', gap:20, gridTemplateColumns: internalLicenses.length > 0 && lagLicenses.length > 0 ? 'repeat(auto-fit,minmax(280px,1fr))' : '1fr' }}>
               {internalLicenses.map((license) => <LicCard key={license.id} lic={license} accent="b" />)}
               {lagLicenses.map((license) => <LicCard key={license.id} lic={license} accent="p" />)}
            </div>
         </div>
      )}

    </div>
  );
}
