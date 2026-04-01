import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity, notifyAll, sendNotificationEmail } from '@/lib/activity';
import {
  Gift, Clock, Zap, Copy, CheckCircle, Eye, EyeOff,
  Loader2, Sparkles, Send, X, Plus, Trash2,
  Users, Activity, Shield, Star
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { canManageAnnouncements } from '@/lib/roles';
import { safeFetch } from '@/lib/safeFetch';

const SUPA_URL = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';
const BONUS_COOLDOWN = 86400000;
const FREE_KEY_COOLDOWN = 172800000;
const FREE_KEY_TTL = 86400000;

interface FreeRow { lag_key: string|null; internal_key: string|null; claimed_at: string; expires_at: string; }
interface BonusRow { bonus_points: number; last_claim_time: string|null; }
interface DBAnn { id:string; title:string; content:string; type:'update'|'maintenance'|'feature'; created_at:string; created_by?:string; }

const OFFLINE = { status:'offline', numUsers:'0', numKeys:'0', onlineUsers:'0', version:'—' };
const safeNum = (v: any) => { const n = parseInt(String(v??'0')); return isNaN(n)?0:n; };
const norm = (r: any) => { if (!r||r.status==='offline') return OFFLINE; return { status:r.status??'online', numUsers:String(safeNum(r.numUsers??r.registered??0)), numKeys:String(safeNum(r.numKeys??r.keys??0)), onlineUsers:String(safeNum(r.onlineUsers??r.numOnlineUsers??0)), version:String(r.version??'—') }; };

async function fetchBonusRow(userId: string): Promise<BonusRow|null> {
  const { data, error } = await supabase.from('user_bonus').select('bonus_points,last_claim_time').eq('user_id', userId).maybeSingle();
  if (error) return null; return data as BonusRow|null;
}
async function upsertBonusRow(userId: string, userEmail: string, bonusPoints: number, lastClaimTime: string|null) {
  return supabase.from('user_bonus').upsert({ user_id:userId, user_email:userEmail, bonus_points:bonusPoints, last_claim_time:lastClaimTime, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
}
async function generateKey(panelType: 'lag'|'internal', days: number) {
  try {
    const res = await fetch(`${SUPA_URL}/functions/v1/generate-key`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${ANON}`, apikey:ANON }, body:JSON.stringify({ panel_type:panelType, days }) });
    return await res.json();
  } catch(e) { return { success:false, message:String(e) }; }
}

/* ── Animated number count-up ───────────────────────────── */
function CountUp({ to, duration = 900 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (to === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * to));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to]);
  return <>{val.toLocaleString()}</>;
}

/* ── Live countdown ─────────────────────────────────────── */
function MiniCountdown({ ms }: { ms: number }) {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    const tick = () => {
      const left = ms - Date.now();
      if (left <= 0) { setTxt(''); return; }
      const h = String(Math.floor((left%86400000)/3600000)).padStart(2,'0');
      const m = String(Math.floor((left%3600000)/60000)).padStart(2,'0');
      const s = String(Math.floor((left%60000)/1000)).padStart(2,'0');
      setTxt(`${h}:${m}:${s}`);
    };
    tick(); const id = setInterval(tick,1000); return ()=>clearInterval(id);
  }, [ms]);
  return <span>{txt}</span>;
}

/* ── Reward modal (logic unchanged, new skin) ───────────── */
function RewardModal({ bonusPoints, userId, userEmail, onClose, onRedeem }: {
  bonusPoints: number; userId: string; userEmail: string;
  onClose: () => void; onRedeem: (pts: number) => void;
}) {
  const { addBalance, addLicense } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<null|'balance'|'key'>(null);
  const [genKey, setGenKey] = useState('');
  const [copied, setCopied] = useState(false);
  const keyExpiry = new Date(Date.now()+3*86400000).toISOString();

  const claimBalance = async () => {
    addBalance(3); onRedeem(bonusPoints-100);
    await upsertBonusRow(userId, userEmail, bonusPoints-100, null);
    setSuccess('balance'); toast.success('$3 added to your balance!');
  };
  const claimKey = async () => {
    setLoading(true);
    let result = await generateKey('internal', 3);
    if (!result.success) result = await generateKey('lag', 3);
    if (result.success && result.key) {
      const newPts = bonusPoints-100;
      const panelId = result.panel_type==='lag'?'keyauth-lag':'keyauth-internal';
      const panelName = result.panel_type==='lag'?'Fake Lag':'Internal';
      const bonusKey = result.panel_type==='lag' ? result.key : result.key+'_INTERNAL';
      addLicense({ id:`bonus_${Math.random().toString(36).slice(2,10)}`, productId:panelId, productName:`${panelName} (Bonus)`, key:bonusKey, hwid:'', lastLogin:new Date().toISOString(), expiresAt:keyExpiry, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });
      await supabase.from('user_licenses').upsert([{
        user_id:userId, user_email:userEmail, product_id:panelId, product_name:`${panelName} (Bonus)`,
        license_key:bonusKey, keyauth_username:result.key, hwid:'', last_login:new Date().toISOString(),
        expires_at:keyExpiry, status:'active', ip:'', device:'', hwid_resets_used:0, hwid_reset_month:new Date().getMonth(),
      }], { onConflict:'user_id,license_key' });
      onRedeem(newPts); await upsertBonusRow(userId, userEmail, newPts, null);
      setGenKey(result.key); setSuccess('key'); toast.success('3-Day key generated!');
    } else { toast.error('Key generation failed'); }
    setLoading(false);
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.85)',backdropFilter:'blur(24px)',padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:'100%',maxWidth:400,borderRadius:24,background:'rgba(14,14,20,.97)',border:'1px solid rgba(124,92,255,.25)',boxShadow:'0 0 60px rgba(124,92,255,.18), 0 0 0 1px rgba(255,255,255,.04) inset',padding:'32px 28px',position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute',top:14,right:14,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:9,width:30,height:30,cursor:'pointer',color:'rgba(255,255,255,.45)',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={13}/></button>
        {!success ? (
          <>
            <div style={{ textAlign:'center',marginBottom:26 }}>
              <div style={{ fontSize:36,marginBottom:10 }}>🎁</div>
              <div style={{ fontSize:19,fontWeight:700,color:'#fff',marginBottom:5 }}>Choose Reward</div>
              <p style={{ fontSize:12,color:'rgba(255,255,255,.4)' }}>100 points → pick your reward</p>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {[
                { onClick:claimBalance, icon:'💰', title:'$3 Balance', sub:'Add to wallet', border:'rgba(170,255,0,.2)', bg:'rgba(170,255,0,.05)', col:'#AAFF00' },
                { onClick:claimKey, icon:loading?null:'🔑', title:'3-Day Key', sub:'Free panel license', border:'rgba(124,92,255,.22)', bg:'rgba(124,92,255,.06)', col:'#7C5CFF' },
              ].map((opt,i)=>(
                <button key={i} onClick={opt.onClick} disabled={loading&&i===1}
                  style={{ padding:'16px 18px',borderRadius:14,background:opt.bg,border:`1px solid ${opt.border}`,cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'all .18s',fontFamily:'inherit',textAlign:'left' }}
                  onMouseEnter={e=>{e.currentTarget.style.filter='brightness(1.15)';}}
                  onMouseLeave={e=>{e.currentTarget.style.filter='none';}}>
                  {loading&&i===1?<Loader2 size={20} className="animate-spin" color={opt.col}/>:<span style={{ fontSize:24 }}>{opt.icon}</span>}
                  <div><div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{opt.title}</div><div style={{ fontSize:11,color:'rgba(255,255,255,.38)' }}>{opt.sub}</div></div>
                </button>
              ))}
            </div>
          </>
        ) : success==='balance' ? (
          <div style={{ textAlign:'center',padding:'16px 0' }}>
            <div style={{ fontSize:44,marginBottom:12 }}>✅</div>
            <div style={{ fontSize:17,fontWeight:700,color:'#AAFF00',marginBottom:18 }}>$3 Added!</div>
            <button onClick={onClose} style={{ padding:'10px 26px',borderRadius:11,background:'rgba(170,255,0,.1)',border:'1px solid rgba(170,255,0,.25)',cursor:'pointer',color:'#AAFF00',fontFamily:'inherit',fontWeight:700,fontSize:13 }}>Done</button>
          </div>
        ) : (
          <div style={{ textAlign:'center',padding:'16px 0' }}>
            <div style={{ fontSize:44,marginBottom:12 }}>🔑</div>
            <div style={{ fontSize:17,fontWeight:700,color:'#7C5CFF',marginBottom:14 }}>Key Generated!</div>
            <div style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:11,padding:'11px 13px',marginBottom:14,display:'flex',alignItems:'center',gap:9 }}>
              <code style={{ flex:1,fontSize:11,fontFamily:'monospace',color:'rgba(255,255,255,.8)',wordBreak:'break-all' }}>{genKey}</code>
              <button onClick={()=>{navigator.clipboard.writeText(genKey);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'5px 8px',cursor:'pointer',color:'rgba(255,255,255,.55)',flexShrink:0 }}>{copied?<CheckCircle size={12}/>:<Copy size={12}/>}</button>
            </div>
            <button onClick={onClose} style={{ padding:'10px 26px',borderRadius:11,background:'rgba(124,92,255,.1)',border:'1px solid rgba(124,92,255,.25)',cursor:'pointer',color:'#7C5CFF',fontFamily:'inherit',fontWeight:700,fontSize:13 }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Free Key Card ──────────────────────────────────────── */
function FreeKeyCard({ delay }: { delay: string }) {
  const { addLicense, user } = useAppStore();
  const [row, setRow] = useState<FreeRow|null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('free_trial_keys').select('lag_key,internal_key,claimed_at,expires_at').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setRow(data as FreeRow|null); setDbLoading(false); });
  }, [user?.id]);

  useEffect(() => {
    const tick = () => {
      if (!row) { setCanClaim(true); setCooldownMs(0); return; }
      const next = new Date(row.claimed_at).getTime()+FREE_KEY_COOLDOWN;
      const left = next-Date.now();
      if (left<=0) { setCanClaim(true); setCooldownMs(0); } else { setCanClaim(false); setCooldownMs(next); }
    };
    tick(); const id = setInterval(tick,1000); return ()=>clearInterval(id);
  }, [row?.claimed_at]);

  const handleClaim = async () => {
    if (!canClaim||generating||!user) return;
    setGenerating(true);
    toast.loading('Generating trial…', { id:'free-trial' });
    try {
      const [lagRes, intRes] = await Promise.all([
        fetch(`${SUPA_URL}/functions/v1/generate-key`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ANON}`,apikey:ANON},body:JSON.stringify({panel_type:'lag',days:1,hours:0,mask:'1999X-FREE-****'})}).then(r=>r.json()),
        fetch(`${SUPA_URL}/functions/v1/generate-key`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ANON}`,apikey:ANON},body:JSON.stringify({panel_type:'internal',days:1,hours:0,mask:'1999X-FREE-****'})}).then(r=>r.json()),
      ]);
      const lagKey = lagRes?.success?lagRes.key:null;
      const intKey = intRes?.success?intRes.key:null;
      if (!lagKey&&!intKey) { toast.dismiss('free-trial'); toast.error('Generation Failed'); setGenerating(false); return; }
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now()+FREE_KEY_TTL).toISOString();
      const { error } = await supabase.from('free_trial_keys').upsert({ user_id:user.id,user_email:user.email,lag_key:lagKey,internal_key:intKey,claimed_at:now,expires_at:expiresAt },{ onConflict:'user_id' });
      if (error) { toast.dismiss('free-trial'); toast.error(error.message); setGenerating(false); return; }
      const licRows: any[] = [];
      if (lagKey) { addLicense({ id:`free_lag_${Date.now()}`,productId:'keyauth-lag',productName:'Fake Lag (Free Trial)',key:lagKey,hwid:'',lastLogin:now,expiresAt,status:'active',ip:'',device:'',hwidResetsUsed:0,hwidResetMonth:new Date().getMonth() }); licRows.push({ user_id:user.id,user_email:user.email,product_id:'keyauth-lag',product_name:'Fake Lag (Free Trial)',license_key:lagKey,keyauth_username:lagKey,hwid:'',last_login:now,expires_at:expiresAt,status:'active',ip:'',device:'',hwid_resets_used:0,hwid_reset_month:new Date().getMonth() }); }
      if (intKey) { addLicense({ id:`free_int_${Date.now()}`,productId:'keyauth-internal',productName:'Internal (Free Trial)',key:`${intKey}_INTERNAL`,hwid:'',lastLogin:now,expiresAt,status:'active',ip:'',device:'',hwidResetsUsed:0,hwidResetMonth:new Date().getMonth() }); licRows.push({ user_id:user.id,user_email:user.email,product_id:'keyauth-internal',product_name:'Internal (Free Trial)',license_key:`${intKey}_INTERNAL`,keyauth_username:intKey,hwid:'',last_login:now,expires_at:expiresAt,status:'active',ip:'',device:'',hwid_resets_used:0,hwid_reset_month:new Date().getMonth() }); }
      if (licRows.length > 0) await supabase.from('user_licenses').upsert(licRows, { onConflict:'user_id,license_key' });
      setRow({ lag_key:lagKey,internal_key:intKey,claimed_at:now,expires_at:expiresAt });
      toast.dismiss('free-trial'); toast.success('Trial activated! Check Licenses tab.');
    } catch(e) { toast.dismiss('free-trial'); toast.error(String(e)); }
    setGenerating(false);
  };

  if (dbLoading) return null;
  const isActive = !!row && new Date(row.expires_at).getTime()>Date.now();

  return (
    <div className="g-card" style={{ animationDelay:delay, '--glow':'rgba(170,255,0,.2)' } as any}>
      {/* Accent glow corner */}
      <div style={{ position:'absolute',top:-40,right:-30,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(170,255,0,.08) 0%,transparent 70%)',pointerEvents:'none' }}/>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:20 }}>
        <div style={{ width:40,height:40,borderRadius:12,background:'rgba(170,255,0,.08)',border:'1px solid rgba(170,255,0,.18)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <Zap size={17} color="#AAFF00"/>
        </div>
        <div>
          <div style={{ fontSize:14,fontWeight:700,color:'#fff',letterSpacing:'-.01em' }}>Free Trial</div>
          <div style={{ fontSize:10,color:'rgba(255,255,255,.35)',letterSpacing:'.06em',textTransform:'uppercase',marginTop:1 }}>48hr cooldown · Internal + Lag</div>
        </div>
      </div>

      {isActive && row ? (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          {/* Active timer */}
          <div style={{ padding:'14px 16px',borderRadius:14,background:'rgba(170,255,0,.04)',border:'1px solid rgba(170,255,0,.14)' }}>
            <div style={{ fontSize:9,color:'#AAFF00',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',marginBottom:6 }}>TRIAL ACTIVE — EXPIRES IN</div>
            <div style={{ fontSize:28,fontWeight:700,color:'#AAFF00',fontFamily:'monospace',letterSpacing:'.05em' }}>
              <MiniCountdown ms={new Date(row.expires_at).getTime()}/>
            </div>
          </div>
          {/* View Keys */}
          <button onClick={()=>setRevealed(!revealed)}
            style={{ padding:'10px 14px',borderRadius:11,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',cursor:'pointer',color:'rgba(255,255,255,.55)',fontSize:12,fontFamily:'inherit',fontWeight:600,display:'flex',alignItems:'center',gap:6,justifyContent:'center',transition:'all .18s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)';e.currentTarget.style.color='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.04)';e.currentTarget.style.color='rgba(255,255,255,.55)';}}>
            {revealed?<EyeOff size={13}/>:<Eye size={13}/>} {revealed?'Hide Keys':'View Keys'}
          </button>
          {revealed && (
            <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
              {row.lag_key&&<div style={{ padding:'9px 12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize:8,color:'rgba(255,255,255,.28)',fontWeight:700,marginBottom:3,letterSpacing:'.1em',textTransform:'uppercase' }}>Fake Lag</div><code style={{ fontSize:11,color:'rgba(255,255,255,.65)',fontFamily:'monospace',wordBreak:'break-all' }}>{row.lag_key}</code></div>}
              {row.internal_key&&<div style={{ padding:'9px 12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize:8,color:'rgba(255,255,255,.28)',fontWeight:700,marginBottom:3,letterSpacing:'.1em',textTransform:'uppercase' }}>Internal</div><code style={{ fontSize:11,color:'rgba(255,255,255,.65)',fontFamily:'monospace',wordBreak:'break-all' }}>{row.internal_key}</code></div>}
            </div>
          )}
        </div>
      ) : canClaim ? (
        <button onClick={handleClaim} disabled={generating}
          style={{ width:'100%',padding:'13px',borderRadius:12,background:'rgba(170,255,0,.09)',border:'1px solid rgba(170,255,0,.22)',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,color:'#AAFF00',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all .2s',boxShadow:generating?'none':'0 0 20px rgba(170,255,0,.1)' }}
          onMouseEnter={e=>{if(!generating){e.currentTarget.style.background='rgba(170,255,0,.16)';e.currentTarget.style.boxShadow='0 0 28px rgba(170,255,0,.2)';}}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(170,255,0,.09)';e.currentTarget.style.boxShadow='0 0 20px rgba(170,255,0,.1)';}}>
          {generating?<Loader2 size={14} className="animate-spin"/>:<Zap size={14}/>}
          {generating?'Generating…':'Claim Free Trial'}
        </button>
      ) : (
        <div style={{ padding:'14px 16px',borderRadius:14,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.06)',textAlign:'center' }}>
          <div style={{ fontSize:9,color:'rgba(255,255,255,.28)',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',marginBottom:6 }}>NEXT TRIAL IN</div>
          <div style={{ fontSize:26,fontWeight:700,color:'rgba(255,255,255,.5)',fontFamily:'monospace',letterSpacing:'.05em' }}>
            <MiniCountdown ms={cooldownMs}/>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, user, systemStatus } = useAppStore();
  const isSystemOnline = systemStatus==='online';
  const isMod = canManageAnnouncements(user?.role);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── State ────────────────────────────────────────────────
  const [bonusPoints, setBonusPoints] = useState(0);
  const [lastBonusClaim, setLastBonusClaim] = useState<string|null>(null);
  const [bonusCooldown, setBonusCooldown] = useState('');
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [bonusLoaded, setBonusLoaded] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [lag, setLag] = useState(OFFLINE);
  const [int, setInt] = useState(OFFLINE);
  const [statsLoading, setStatsLoading] = useState(false);
  const [anns, setAnns] = useState<DBAnn[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fContent, setFContent] = useState('');
  const [fType, setFType] = useState<'update'|'maintenance'|'feature'>('update');
  const [publishing, setPublishing] = useState(false);
  const [expandedAnn, setExpandedAnn] = useState<string|null>(null);
  // Arc animation
  const [arcOffset, setArcOffset] = useState(251);

  // ── Effects ──────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setBonusLoaded(false);
    fetchBonusRow(user.id).then(row => {
      if (row) { setBonusPoints(row.bonus_points??0); setLastBonusClaim(row.last_claim_time??null); }
      setBonusLoaded(true);
    });
  }, [user?.id]);

  useEffect(() => {
    const tick = () => {
      if (!lastBonusClaim) { setCanClaimBonus(true); setBonusCooldown(''); return; }
      const diff = BONUS_COOLDOWN-(Date.now()-new Date(lastBonusClaim).getTime());
      if (diff<=0) { setCanClaimBonus(true); setBonusCooldown(''); return; }
      setCanClaimBonus(false);
      const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
      setBonusCooldown(`${h}h ${m}m ${s}s`);
    };
    tick(); const id=setInterval(tick,1000); return ()=>clearInterval(id);
  }, [lastBonusClaim]);

  const loadKeyAuthStats = async () => {
    setStatsLoading(true);
    try {
      const res = await safeFetch(`${SUPA_URL}/functions/v1/keyauth-stats`,{ method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ANON}`,apikey:ANON},body:'{}' },10000);
      if (res?.ok) { const d=await res.json(); if(d?.lag) setLag(norm(d.lag)); if(d?.internal) setInt(norm(d.internal)); }
    } catch {}
    setStatsLoading(false);
  };

  useEffect(() => { loadKeyAuthStats(); const i=setInterval(loadKeyAuthStats,60000); return ()=>clearInterval(i); }, []);

  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at',{ ascending:false }).limit(10)
      .then(({ data }) => { if (data) setAnns(data as DBAnn[]); setAnnLoading(false); });
    const ch = supabase.channel('dash-anns')
      .on('postgres_changes',{ event:'INSERT',schema:'public',table:'announcements' },({ new:r })=>setAnns(prev=>[r as DBAnn,...prev]))
      .on('postgres_changes',{ event:'DELETE',schema:'public',table:'announcements' },({ old:r })=>setAnns(prev=>prev.filter(a=>a.id!==(r as any).id)))
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  }, []);

  // Arc animate on mount
  useEffect(() => {
    const ARC_LEN = 251;
    const fill = Math.min(1, balance / Math.max(balance + 20, 100));
    const target = ARC_LEN - fill * ARC_LEN;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setArcOffset(ARC_LEN - eased * (ARC_LEN - target));
      if (t < 1) requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => requestAnimationFrame(tick), 300);
    return () => clearTimeout(timer);
  }, [balance]);

  // Dot-grid canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      t += 0.0003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const spacing = 36;
      const cols = Math.ceil(canvas.width / spacing) + 2;
      const rows = Math.ceil(canvas.height / spacing) + 2;
      const ox = (t * 8) % spacing;
      const oy = (t * 5) % spacing;
      for (let c = -1; c < cols; c++) {
        for (let r = -1; r < rows; r++) {
          const x = c * spacing - ox;
          const y = r * spacing - oy;
          // subtle wave opacity
          const wave = 0.5 + 0.5 * Math.sin(c * 0.4 + t * 2) * Math.cos(r * 0.4 + t * 1.5);
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.022 + 0.018 * wave})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  // ── Handlers ─────────────────────────────────────────────
  const handleClaimBonus = async () => {
    if (!user||!canClaimBonus||claimingBonus||!bonusLoaded) return;
    setClaimingBonus(true);
    const latest = await fetchBonusRow(user.id);
    if (latest?.last_claim_time&&(BONUS_COOLDOWN-(Date.now()-new Date(latest.last_claim_time).getTime())>0)) {
      setLastBonusClaim(latest.last_claim_time); setCanClaimBonus(false); setClaimingBonus(false); toast.error('Already claimed recently.'); return;
    }
    const nextPoints=(latest?.bonus_points??bonusPoints)+10;
    const claimTime=new Date().toISOString();
    const { error } = await upsertBonusRow(user.id,user.email,nextPoints,claimTime);
    if (error) { toast.error('Error claiming bonus'); setClaimingBonus(false); return; }
    setBonusPoints(nextPoints); setLastBonusClaim(claimTime); setClaimingBonus(false);
    toast.success('+10 bonus points!');
    logActivity({ userId:user.id,userEmail:user.email,userName:user.name,action:'bonus_claim',status:'success',meta:{ points:10,total:nextPoints } });
  };

  const handlePublishAnn = async () => {
    if (!fTitle.trim()||!fContent.trim()) { toast.error('Fill title and content'); return; }
    setPublishing(true);
    const { error } = await supabase.from('announcements').insert({ title:fTitle.trim(),content:fContent.trim(),type:fType,created_by:user?.email??'' });
    if (error) toast.error('Failed: '+error.message);
    else {
      toast.success('Published');
      notifyAll({ type:'announcement',title:`📢 ${fTitle.trim()}`,body:fContent.trim().slice(0,80),linkPath:'/' });
      sendNotificationEmail({ mode:'broadcast',subject:fTitle.trim(),html:`<h2>${fTitle.trim()}</h2><p>${fContent.trim()}</p>` });
      if (user) logActivity({ userId:user.id,userEmail:user.email,userName:user.name,action:'announcement_posted',product:fTitle.trim(),status:'success',meta:{ type:fType } });
      setFTitle(''); setFContent(''); setFType('update'); setShowForm(false);
    }
    setPublishing(false);
  };

  const handleDeleteAnn = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id',id);
    if (error) toast.error('Delete failed');
  };

  // ── Derived ───────────────────────────────────────────────
  const active = licenses.filter(l=>new Date(l.expiresAt).getTime()>Date.now());
  const totalOnline = safeNum(lag.onlineUsers)+safeNum(int.onlineUsers);
  const totalUsers  = safeNum(lag.numUsers)+safeNum(int.numUsers);
  const progressPct = bonusPoints % 100;
  const firstName   = user?.name?.split(' ')[0] || 'User';
  const ARC_LEN     = 251;
  const arcFill     = ARC_LEN - arcOffset;

  const TYPE_CFG = {
    update:      { emoji:'✨', color:'#AAFF00', bg:'rgba(170,255,0,.07)',  border:'rgba(170,255,0,.18)'  },
    maintenance: { emoji:'🔧', color:'#a78bfa', bg:'rgba(167,139,250,.07)',border:'rgba(167,139,250,.18)' },
    feature:     { emoji:'⚡', color:'#7C5CFF', bg:'rgba(124,92,255,.07)', border:'rgba(124,92,255,.2)'  },
  } as const;

  /* ── RENDER ─────────────────────────────────────────────── */
  return (
    <div style={{ position:'relative', minHeight:'100%', paddingBottom:80, fontFamily:"'Inter',sans-serif" }}>

      {/* ── Global CSS ── */}
      <style>{`
        /* Keyframes */
        @keyframes g-in   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes g-pulse{ 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.5);opacity:1} }
        @keyframes g-glow { 0%,100%{box-shadow:0 0 8px #AAFF00,0 0 18px rgba(170,255,0,.35)} 50%{box-shadow:0 0 14px #AAFF00,0 0 32px rgba(170,255,0,.6)} }
        @keyframes g-shi  { 0%{transform:translateX(-120%)} 100%{transform:translateX(220%)} }
        @keyframes g-bar  { from{width:0} to{width:var(--bw,0%)} }
        @keyframes g-spin { to{transform:rotate(360deg)} }

        /* Card base */
        .g-card {
          position:relative; overflow:hidden;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 24px 22px;
          animation: g-in 0.55s cubic-bezier(0.22,1,0.36,1) both;
          transition: border-color .22s ease, box-shadow .22s ease, transform .28s cubic-bezier(.22,1,.36,1);
          /* shimmer top line */
        }
        .g-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.09),transparent);
          pointer-events:none;
        }
        .g-card:hover {
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-3px);
          box-shadow: 0 0 0 1px rgba(255,255,255,.04), 0 20px 60px rgba(0,0,0,.55), 0 0 40px var(--glow,rgba(255,255,255,.04));
        }
        /* shimmer sweep */
        .g-card .g-sweep {
          position:absolute; top:0; bottom:0; left:0; width:50%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.025),transparent);
          animation:g-shi 5s ease-in-out infinite;
          pointer-events:none;
        }

        /* Live dot */
        .g-live-dot {
          width:8px; height:8px; border-radius:50%; background:#AAFF00;
          animation: g-pulse 2s ease-in-out infinite, g-glow 2s ease-in-out infinite;
          flex-shrink:0;
        }

        /* Progress bar */
        .g-bar-track { height:5px; border-radius:99px; background:rgba(255,255,255,.06); overflow:hidden; }
        .g-bar-fill  { height:100%; border-radius:99px; animation:g-bar .9s cubic-bezier(.22,1,.36,1) both; position:relative; overflow:hidden; }
        .g-bar-fill::after { content:''; position:absolute; top:0; bottom:0; left:0; width:60%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);
          animation:g-shi 2.5s ease-in-out infinite; }

        /* Claim button */
        .g-btn {
          width:100%; padding:13px; border-radius:13px; border:none; cursor:pointer;
          font-family:inherit; font-size:13px; font-weight:700; color:#000;
          background:linear-gradient(135deg,#AAFF00,#85cc00);
          box-shadow:0 0 24px rgba(170,255,0,.3),0 4px 14px rgba(0,0,0,.25);
          display:flex; align-items:center; justify-content:center; gap:7px;
          transition:all .22s cubic-bezier(.22,1,.36,1); position:relative; overflow:hidden;
        }
        .g-btn::before { content:''; position:absolute; top:0; bottom:0; left:-100%; width:50%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent);
          transition:left .4s ease; pointer-events:none; }
        .g-btn:hover { transform:translateY(-2px); box-shadow:0 0 36px rgba(170,255,0,.5),0 8px 20px rgba(0,0,0,.35); }
        .g-btn:hover::before { left:150%; }
        .g-btn:disabled {
          background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.08);
          color:rgba(255,255,255,.3); box-shadow:none; cursor:not-allowed; transform:none !important;
        }

        /* Labels */
        .g-lbl {
          font-size:10px; font-weight:600; letter-spacing:.12em;
          text-transform:uppercase; color:rgba(255,255,255,.45);
        }

        /* Bento grid */
        .g-bento { display:grid; gap:14px; }
        .g-col2  { grid-template-columns:1fr 1fr; }
        @media(max-width:860px) { .g-col2 { grid-template-columns:1fr; } }
      `}</style>

      {/* ── Animated dot-grid canvas ── */}
      <canvas ref={canvasRef} style={{ position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,opacity:.6 }}/>

      {/* ── Content ── */}
      <div style={{ position:'relative',zIndex:1 }}>

        {/* ═══ REWARD MODAL ═══ */}
        {showRewardModal && user && (
          <RewardModal bonusPoints={bonusPoints} userId={user.id} userEmail={user.email}
            onClose={()=>setShowRewardModal(false)}
            onRedeem={pts=>{ setBonusPoints(pts); setShowRewardModal(false); }}/>
        )}

        {/* ═══ WELCOME HEADER ═══ */}
        <div style={{ marginBottom:30, animation:'g-in .45s both' }}>
          {/* System badge */}
          <div style={{ display:'inline-flex',alignItems:'center',gap:7,marginBottom:12,
            padding:'4px 12px',borderRadius:99,
            background:isSystemOnline?'rgba(170,255,0,.08)':'rgba(245,158,11,.08)',
            border:`1px solid ${isSystemOnline?'rgba(170,255,0,.2)':'rgba(245,158,11,.2)'}` }}>
            <div className={isSystemOnline?'g-live-dot':undefined}
              style={isSystemOnline?{}:{ width:8,height:8,borderRadius:'50%',background:'#F59E0B',flexShrink:0 }}/>
            <span style={{ fontSize:10,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',
              color:isSystemOnline?'#AAFF00':'#F59E0B' }}>
              {isSystemOnline?'System Online':'Maintenance'}
            </span>
          </div>
          {/* Name */}
          <h1 style={{ fontSize:'clamp(28px,5vw,44px)',fontWeight:700,color:'#fff',
            letterSpacing:'-.04em',margin:0,lineHeight:1.1,marginBottom:6 }}>
            Welcome back,{' '}
            <span style={{ color:'#7C5CFF' }}>{firstName}</span>
          </h1>
          <p style={{ fontSize:11,color:'rgba(255,255,255,.3)',margin:0,
            fontWeight:600,letterSpacing:'.2em',textTransform:'uppercase' }}>
            1999X Free Fire Panel
          </p>
        </div>

        {/* ═══ ANNOUNCEMENTS ═══ */}
        {!annLoading && anns.length > 0 && (
          <div style={{ marginBottom:18, animation:'g-in .4s .05s both' }}>
            {isMod && (
              <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:7 }}>
                <button onClick={()=>setShowForm(!showForm)}
                  style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:9,
                    background:showForm?'rgba(248,113,113,.07)':'rgba(255,255,255,.04)',
                    border:`1px solid ${showForm?'rgba(248,113,113,.15)':'rgba(255,255,255,.08)'}`,
                    cursor:'pointer',color:showForm?'#f87171':'rgba(255,255,255,.45)',
                    fontSize:11,fontFamily:'inherit',fontWeight:600 }}>
                  {showForm?<><X size={10}/>Close</>:<><Plus size={10}/>Post</>}
                </button>
              </div>
            )}
            {showForm && isMod && (
              <div style={{ padding:'14px',borderRadius:14,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',marginBottom:10 }}>
                <div style={{ display:'flex',gap:6,marginBottom:9,flexWrap:'wrap' }}>
                  {(['update','feature','maintenance'] as const).map(tp=>(
                    <button key={tp} onClick={()=>setFType(tp)}
                      style={{ padding:'3px 11px',borderRadius:20,fontSize:10,fontWeight:700,cursor:'pointer',
                        border:`1px solid ${fType===tp?TYPE_CFG[tp].color:TYPE_CFG[tp].border}`,
                        background:fType===tp?TYPE_CFG[tp].bg:'transparent',
                        color:fType===tp?TYPE_CFG[tp].color:'rgba(255,255,255,.35)',fontFamily:'inherit' }}>{tp}</button>
                  ))}
                </div>
                <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="Title…"
                  style={{ width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:8,padding:'8px 11px',color:'#fff',fontSize:12,outline:'none',marginBottom:7,fontFamily:'inherit',boxSizing:'border-box' }}/>
                <textarea value={fContent} onChange={e=>setFContent(e.target.value)} placeholder="Content…" rows={2}
                  style={{ width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:8,padding:'8px 11px',color:'#fff',fontSize:12,outline:'none',resize:'vertical',fontFamily:'inherit',marginBottom:9,boxSizing:'border-box' }}/>
                <button onClick={handlePublishAnn} disabled={publishing}
                  style={{ width:'100%',padding:'9px',borderRadius:9,background:'rgba(124,92,255,.15)',border:'1px solid rgba(124,92,255,.3)',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'#7C5CFF',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                  {publishing?<><Loader2 size={12} className="animate-spin"/>Sending…</>:<><Send size={12}/>Publish</>}
                </button>
              </div>
            )}
            <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
              {anns.map((ann,i)=>{
                const cfg = TYPE_CFG[ann.type]??TYPE_CFG.update;
                const expanded = expandedAnn===ann.id;
                return (
                  <div key={ann.id} onClick={()=>setExpandedAnn(expanded?null:ann.id)}
                    style={{ padding:'12px 15px',borderRadius:13,background:'rgba(255,255,255,.03)',
                      border:`1px solid rgba(255,255,255,.07)`,borderLeft:`3px solid ${cfg.color}55`,
                      cursor:'pointer',transition:'all .16s',animationDelay:`${i*.04}s` }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.055)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';}}>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <span style={{ fontSize:13 }}>{cfg.emoji}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:13,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:expanded?'normal':'nowrap' }}>{ann.title}</div>
                        {!expanded&&<div style={{ fontSize:11,color:'rgba(255,255,255,.32)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:1 }}>{ann.content}</div>}
                      </div>
                      <span style={{ fontSize:8,fontWeight:700,padding:'2px 6px',borderRadius:99,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,letterSpacing:'.06em',textTransform:'uppercase',flexShrink:0 }}>{ann.type}</span>
                      {isMod&&<button onClick={e=>{e.stopPropagation();handleDeleteAnn(ann.id);}}
                        style={{ padding:'3px',borderRadius:5,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.18)',flexShrink:0 }}
                        onMouseEnter={e=>e.currentTarget.style.color='#f87171'}
                        onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.18)'}><Trash2 size={10}/></button>}
                    </div>
                    {expanded&&<p style={{ fontSize:12,color:'rgba(255,255,255,.45)',lineHeight:1.6,margin:'9px 0 0 21px' }}>{ann.content}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {isMod && anns.length===0 && (
          <div style={{ marginBottom:16,display:'flex',gap:10,alignItems:'flex-start',flexWrap:'wrap' }}>
            <button onClick={()=>setShowForm(!showForm)}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:9,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',cursor:'pointer',color:'rgba(255,255,255,.4)',fontSize:11,fontFamily:'inherit',fontWeight:600 }}>
              <Plus size={11}/> Post Announcement
            </button>
            {showForm && (
              <div style={{ flex:1,display:'flex',flexDirection:'column',gap:7,padding:'13px',borderRadius:12,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.07)',minWidth:260 }}>
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  {(['update','feature','maintenance'] as const).map(tp=>(
                    <button key={tp} onClick={()=>setFType(tp)} style={{ padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,cursor:'pointer',border:`1px solid ${fType===tp?TYPE_CFG[tp].color:TYPE_CFG[tp].border}`,background:fType===tp?TYPE_CFG[tp].bg:'transparent',color:fType===tp?TYPE_CFG[tp].color:'rgba(255,255,255,.32)',fontFamily:'inherit' }}>{tp}</button>
                  ))}
                </div>
                <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="Title…" style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:7,padding:'7px 10px',color:'#fff',fontSize:12,outline:'none',fontFamily:'inherit' }}/>
                <textarea value={fContent} onChange={e=>setFContent(e.target.value)} placeholder="Content…" rows={2} style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:7,padding:'7px 10px',color:'#fff',fontSize:12,outline:'none',resize:'vertical',fontFamily:'inherit' }}/>
                <button onClick={handlePublishAnn} disabled={publishing} style={{ padding:'8px',borderRadius:8,background:'rgba(124,92,255,.14)',border:'1px solid rgba(124,92,255,.28)',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:700,color:'#7C5CFF',display:'flex',alignItems:'center',justifyContent:'center',gap:5 }}>
                  {publishing?<><Loader2 size={11} className="animate-spin"/>Sending…</>:<><Send size={11}/>Publish</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ BENTO ROW 1: Balance  +  Stat cards ═══ */}
        <div className="g-bento g-col2" style={{ marginBottom:14 }}>

          {/* ── BALANCE CARD ── */}
          <div className="g-card" style={{ animationDelay:'0ms', '--glow':'rgba(170,255,0,.12)' } as any}>
            <div className="g-sweep"/>
            {/* Header */}
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
              <span className="g-lbl">Balance</span>
              <div style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'3px 10px',borderRadius:99,background:'rgba(170,255,0,.08)',border:'1px solid rgba(170,255,0,.18)' }}>
                <div className="g-live-dot" style={{ width:5,height:5,animation:'g-pulse 2s ease-in-out infinite' }}/>
                <span style={{ fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#AAFF00' }}>Active</span>
              </div>
            </div>
            {/* Arc gauge */}
            <div style={{ display:'flex',justifyContent:'center',marginBottom:18 }}>
              <div style={{ position:'relative',width:180,height:108 }}>
                <svg width="180" height="108" viewBox="0 0 180 108" style={{ overflow:'visible' }}>
                  {/* Track */}
                  <path d="M18 100 A72 72 0 0 1 162 100" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="12" strokeLinecap="round"/>
                  {/* Glow fill */}
                  <path d="M18 100 A72 72 0 0 1 162 100" fill="none" stroke="rgba(170,255,0,.2)" strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={ARC_LEN} strokeDashoffset={arcOffset + 4}/>
                  {/* Main fill */}
                  <path d="M18 100 A72 72 0 0 1 162 100" fill="none" stroke="#AAFF00" strokeWidth="11" strokeLinecap="round"
                    strokeDasharray={ARC_LEN} strokeDashoffset={arcOffset}
                    style={{ filter:'drop-shadow(0 0 8px rgba(170,255,0,.85))' }}/>
                  {/* Tip dot */}
                  {arcFill > 8 && (() => {
                    const angle = Math.PI - (arcFill / ARC_LEN) * Math.PI;
                    const cx = 90 + 72 * Math.cos(angle);
                    const cy = 100 - 72 * Math.sin(angle);
                    return <circle cx={cx} cy={cy} r="7" fill="#AAFF00" style={{ filter:'drop-shadow(0 0 10px #AAFF00)' }}/>;
                  })()}
                </svg>
                <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',paddingBottom:6 }}>
                  <div style={{ fontSize:32,fontWeight:700,color:'#fff',letterSpacing:'-.05em',lineHeight:1 }}>
                    ${balance.toFixed(2)}
                  </div>
                  <div style={{ fontSize:9,color:'rgba(255,255,255,.35)',fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',marginTop:4 }}>Wallet Balance</div>
                </div>
              </div>
            </div>
            {/* Sub-stats */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
              <div style={{ padding:'12px 14px',borderRadius:13,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}>
                <div className="g-lbl" style={{ marginBottom:4 }}>Active Keys</div>
                <div style={{ fontSize:26,fontWeight:700,color:'#AAFF00',letterSpacing:'-.03em',lineHeight:1 }}>
                  <CountUp to={active.length}/>
                </div>
              </div>
              <div style={{ padding:'12px 14px',borderRadius:13,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}>
                <div className="g-lbl" style={{ marginBottom:4 }}>Bonus Pts</div>
                <div style={{ fontSize:26,fontWeight:700,color:'#7C5CFF',letterSpacing:'-.03em',lineHeight:1 }}>
                  <CountUp to={bonusPoints}/>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: 3 stat cards ── */}
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            {/* Total Users */}
            <div className="g-card" style={{ flex:1, animationDelay:'80ms', '--glow':'rgba(124,92,255,.12)' } as any}>
              <div className="g-sweep"/>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(124,92,255,.3),transparent)'}}/>
              <div className="g-lbl" style={{ marginBottom:8 }}>Total Users</div>
              <div style={{ fontSize:40,fontWeight:700,color:'#7C5CFF',letterSpacing:'-.04em',lineHeight:1,marginBottom:3 }}>
                {statsLoading ? '—' : <><CountUp to={totalUsers}/><span style={{ fontSize:20 }}>+</span></>}
              </div>
              <div style={{ fontSize:11,color:'rgba(255,255,255,.3)',fontWeight:500 }}>Registered accounts</div>
            </div>
            {/* Live Playing */}
            <div className="g-card" style={{ flex:1, animationDelay:'160ms', '--glow':'rgba(170,255,0,.12)' } as any}>
              <div className="g-sweep"/>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(170,255,0,.25),transparent)'}}/>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                <span className="g-lbl">Live Playing</span>
                <div className="g-live-dot"/>
              </div>
              <div style={{ fontSize:40,fontWeight:700,color:'#AAFF00',letterSpacing:'-.04em',lineHeight:1,marginBottom:3 }}>
                {statsLoading ? '—' : <CountUp to={totalOnline}/>}
              </div>
              <div style={{ fontSize:11,color:'rgba(255,255,255,.3)',fontWeight:500 }}>Active sessions now</div>
            </div>
            {/* Antiban */}
            <div className="g-card" style={{ flex:1, animationDelay:'240ms', '--glow':'rgba(245,158,11,.12)' } as any}>
              <div className="g-sweep"/>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(245,158,11,.25),transparent)'}}/>
              <div className="g-lbl" style={{ marginBottom:8 }}>Antiban OB52</div>
              <div style={{ fontSize:32,fontWeight:700,color:'#F59E0B',letterSpacing:'-.03em',lineHeight:1,marginBottom:3 }}>Protected</div>
              <div style={{ fontSize:11,color:'rgba(255,255,255,.3)',fontWeight:500 }}>Fully undetected</div>
            </div>
          </div>
        </div>

        {/* ═══ BENTO ROW 2: Daily Bonus  +  Free Trial ═══ */}
        <div className="g-bento g-col2">

          {/* ── DAILY BONUS CARD ── */}
          <div className="g-card" style={{ animationDelay:'320ms', '--glow':'rgba(124,92,255,.14)' } as any}>
            <div className="g-sweep"/>
            {/* Header */}
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
              <div style={{ display:'flex',alignItems:'center',gap:11 }}>
                <div style={{ width:40,height:40,borderRadius:12,background:'rgba(124,92,255,.1)',border:'1px solid rgba(124,92,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 16px rgba(124,92,255,.15)' }}>
                  <Gift size={17} color="#7C5CFF"/>
                </div>
                <div>
                  <div style={{ fontSize:14,fontWeight:700,color:'#fff',letterSpacing:'-.01em' }}>Daily Bonus</div>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,.32)',letterSpacing:'.05em',textTransform:'uppercase',marginTop:1 }}>+10 pts · resets 24h</div>
                </div>
              </div>
              {bonusPoints>=100 && (
                <button onClick={()=>setShowRewardModal(true)}
                  style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:9,background:'rgba(170,255,0,.08)',border:'1px solid rgba(170,255,0,.22)',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:700,color:'#AAFF00',transition:'all .15s' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(170,255,0,.15)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(170,255,0,.08)';}}>
                  <Star size={10}/> Redeem
                </button>
              )}
            </div>
            {/* Points + progress */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:10 }}>
                <div style={{ display:'flex',alignItems:'baseline',gap:5 }}>
                  <span style={{ fontSize:48,fontWeight:700,color:'#fff',letterSpacing:'-.06em',lineHeight:1 }}>{bonusPoints}</span>
                  <span style={{ fontSize:14,color:'rgba(255,255,255,.3)',fontWeight:600 }}>pts</span>
                </div>
                <span style={{ fontSize:11,color:'rgba(255,255,255,.25)',fontWeight:600 }}>{progressPct}/100</span>
              </div>
              <div className="g-bar-track">
                <div className="g-bar-fill" style={{
                  background:'linear-gradient(90deg,#7C5CFF,#a78bfa)',
                  boxShadow:'0 0 12px rgba(124,92,255,.5)',
                  '--bw':`${Math.min(progressPct===0&&bonusPoints>=100?100:progressPct,100)}%`
                } as any}/>
              </div>
              {bonusPoints>=100 && (
                <div style={{ textAlign:'right',marginTop:5,fontSize:10,color:'#AAFF00',fontWeight:700,letterSpacing:'.04em' }}>
                  🎁 Ready to redeem
                </div>
              )}
            </div>
            {/* Claim button */}
            <button onClick={handleClaimBonus} disabled={!canClaimBonus||claimingBonus} className="g-btn">
              {claimingBonus
                ? <><Loader2 size={13} style={{ animation:'g-spin 1s linear infinite' }}/>Claiming…</>
                : canClaimBonus
                  ? <><Sparkles size={13}/>Claim +10 Points</>
                  : <><Clock size={12}/>{bonusCooldown}</>}
            </button>
          </div>

          {/* ── FREE TRIAL CARD ── */}
          <FreeKeyCard delay="400ms"/>

        </div>
      </div>
    </div>
  );
}
