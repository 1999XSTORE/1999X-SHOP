import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity, notifyAll, sendNotificationEmail } from '@/lib/activity';
import {
  Gift, Clock, Zap, Copy, CheckCircle, Eye, EyeOff,
  Loader2, Sparkles, Send, X, Plus, Trash2,
  Users, Activity, ChevronRight, Shield, Star
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
      // Also save to user_licenses so LicensesPage picks it up
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
    <div style={{ position:'fixed',inset:0,zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.88)',backdropFilter:'blur(20px)',padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:'100%',maxWidth:400,borderRadius:28,background:'linear-gradient(160deg,rgba(25,15,70,.97),rgba(12,8,40,.97))',border:'1px solid rgba(139,92,246,.3)',boxShadow:'0 0 80px rgba(109,40,217,.25),0 32px 80px rgba(0,0,0,.8)',padding:'32px 28px',position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute',top:16,right:16,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,width:32,height:32,cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={14}/></button>
        {!success ? (
          <>
            <div style={{ textAlign:'center',marginBottom:28 }}>
              <div style={{ fontSize:40,marginBottom:12 }}>🎁</div>
              <div style={{ fontSize:20,fontWeight:900,color:'#fff',letterSpacing:'-.02em',marginBottom:6 }}>Choose Your Reward</div>
              <p style={{ fontSize:13,color:'rgba(255,255,255,.45)' }}>100 points → pick your reward</p>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              <button onClick={claimBalance} style={{ padding:'18px 20px',borderRadius:16,background:'rgba(16,232,152,.07)',border:'1px solid rgba(16,232,152,.2)',cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .2s',fontFamily:'inherit',textAlign:'left' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(16,232,152,.14)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(16,232,152,.07)';}}>
                <span style={{ fontSize:28 }}>💰</span>
                <div><div style={{ fontSize:15,fontWeight:800,color:'#fff' }}>$3 Balance</div><div style={{ fontSize:12,color:'rgba(255,255,255,.4)' }}>Add $3 to your wallet</div></div>
              </button>
              <button onClick={claimKey} disabled={loading} style={{ padding:'18px 20px',borderRadius:16,background:'rgba(139,92,246,.07)',border:'1px solid rgba(139,92,246,.22)',cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .2s',fontFamily:'inherit',textAlign:'left' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(139,92,246,.14)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(139,92,246,.07)';}}>
                {loading?<Loader2 size={22} className="animate-spin" color="#a78bfa"/>:<span style={{ fontSize:28 }}>🔑</span>}
                <div><div style={{ fontSize:15,fontWeight:800,color:'#fff' }}>3-Day License Key</div><div style={{ fontSize:12,color:'rgba(255,255,255,.4)' }}>Get a free 3-day panel key</div></div>
              </button>
            </div>
          </>
        ) : success==='balance' ? (
          <div style={{ textAlign:'center',padding:'12px 0' }}>
            <div style={{ fontSize:48,marginBottom:12 }}>✅</div>
            <div style={{ fontSize:18,fontWeight:800,color:'#fff',marginBottom:20 }}>$3 Added to Wallet!</div>
            <button onClick={onClose} style={{ padding:'12px 28px',borderRadius:12,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',cursor:'pointer',color:'#fff',fontFamily:'inherit',fontWeight:700 }}>Done</button>
          </div>
        ) : (
          <div style={{ textAlign:'center',padding:'12px 0' }}>
            <div style={{ fontSize:48,marginBottom:12 }}>🔑</div>
            <div style={{ fontSize:18,fontWeight:800,color:'#fff',marginBottom:16 }}>Key Generated!</div>
            <div style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.09)',borderRadius:12,padding:'12px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:10 }}>
              <code style={{ flex:1,fontSize:11,fontFamily:'monospace',color:'#fff',wordBreak:'break-all' }}>{genKey}</code>
              <button onClick={()=>{navigator.clipboard.writeText(genKey);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:7,padding:'5px 8px',cursor:'pointer',color:'rgba(255,255,255,.6)',flexShrink:0 }}>{copied?<CheckCircle size={13}/>:<Copy size={13}/>}</button>
            </div>
            <button onClick={onClose} style={{ padding:'12px 28px',borderRadius:12,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',cursor:'pointer',color:'#fff',fontFamily:'inherit',fontWeight:700 }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FreeKeyCard() {
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
      // Write to user_licenses so LicensesPage auto-picks them up
      const licRows: any[] = [];
      if (lagKey) {
        addLicense({ id:`free_lag_${Date.now()}`,productId:'keyauth-lag',productName:'Fake Lag (Free Trial)',key:lagKey,hwid:'',lastLogin:now,expiresAt,status:'active',ip:'',device:'',hwidResetsUsed:0,hwidResetMonth:new Date().getMonth() });
        licRows.push({ user_id:user.id,user_email:user.email,product_id:'keyauth-lag',product_name:'Fake Lag (Free Trial)',license_key:lagKey,keyauth_username:lagKey,hwid:'',last_login:now,expires_at:expiresAt,status:'active',ip:'',device:'',hwid_resets_used:0,hwid_reset_month:new Date().getMonth() });
      }
      if (intKey) {
        addLicense({ id:`free_int_${Date.now()}`,productId:'keyauth-internal',productName:'Internal (Free Trial)',key:`${intKey}_INTERNAL`,hwid:'',lastLogin:now,expiresAt,status:'active',ip:'',device:'',hwidResetsUsed:0,hwidResetMonth:new Date().getMonth() });
        licRows.push({ user_id:user.id,user_email:user.email,product_id:'keyauth-internal',product_name:'Internal (Free Trial)',license_key:`${intKey}_INTERNAL`,keyauth_username:intKey,hwid:'',last_login:now,expires_at:expiresAt,status:'active',ip:'',device:'',hwid_resets_used:0,hwid_reset_month:new Date().getMonth() });
      }
      if (licRows.length > 0) {
        await supabase.from('user_licenses').upsert(licRows, { onConflict:'user_id,license_key' });
      }
      setRow({ lag_key:lagKey,internal_key:intKey,claimed_at:now,expires_at:expiresAt });
      toast.dismiss('free-trial'); toast.success('Trial Activated! Keys are now active in Licenses tab.');
    } catch(e) { toast.dismiss('free-trial'); toast.error(String(e)); }
    setGenerating(false);
  };

  if (dbLoading) return null;
  const isActive = !!row && new Date(row.expires_at).getTime()>Date.now();

  return (
    <div className="db-float-card" style={{ padding:'26px 24px',position:'relative',overflow:'hidden' }}>
      <div style={{ position:'absolute',top:-30,right:-20,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(94,247,166,.1) 0%,transparent 70%)',pointerEvents:'none' }}/>
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:18 }}>
        <div style={{ width:42,height:42,borderRadius:14,background:'linear-gradient(135deg,rgba(94,247,166,.18),rgba(94,247,166,.04))',border:'1px solid rgba(94,247,166,.22)',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Zap size={18} color="#5EF7A6"/>
        </div>
        <div>
          <div style={{ fontSize:15,fontWeight:800,color:'#fff',letterSpacing:'-.01em' }}>Free Daily Trial</div>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.35)' }}>24hr • Internal + Fake Lag</div>
        </div>
      </div>
      {isActive && row ? (
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          <div style={{ padding:'12px 14px',borderRadius:12,background:'rgba(94,247,166,.05)',border:'1px solid rgba(94,247,166,.15)' }}>
            <div style={{ fontSize:9,color:'#5EF7A6',fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4 }}>TRIAL ACTIVE — EXPIRES IN</div>
            <div style={{ fontSize:22,fontWeight:900,color:'#fff',fontFamily:'monospace' }}><MiniCountdown ms={new Date(row.expires_at).getTime()}/></div>
          </div>
          <button onClick={()=>setRevealed(!revealed)} style={{ padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',cursor:'pointer',color:'rgba(255,255,255,.5)',fontSize:12,fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,justifyContent:'center' }}>
            {revealed?<EyeOff size={12}/>:<Eye size={12}/>} {revealed?'Hide Keys':'View Keys'}
          </button>
          {revealed && (
            <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
              {row.lag_key&&<div style={{ padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)' }}><div style={{ fontSize:9,color:'rgba(255,255,255,.3)',fontWeight:700,marginBottom:3,letterSpacing:'.08em' }}>FAKE LAG</div><code style={{ fontSize:11,color:'rgba(255,255,255,.65)',fontFamily:'monospace',wordBreak:'break-all' }}>{row.lag_key}</code></div>}
              {row.internal_key&&<div style={{ padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)' }}><div style={{ fontSize:9,color:'rgba(255,255,255,.3)',fontWeight:700,marginBottom:3,letterSpacing:'.08em' }}>INTERNAL</div><code style={{ fontSize:11,color:'rgba(255,255,255,.65)',fontFamily:'monospace',wordBreak:'break-all' }}>{row.internal_key}</code></div>}
            </div>
          )}
        </div>
      ) : canClaim ? (
        <button onClick={handleClaim} disabled={generating}
          style={{ width:'100%',padding:'12px',borderRadius:13,background:'linear-gradient(135deg,rgba(94,247,166,.13),rgba(94,247,166,.04))',border:'1px solid rgba(94,247,166,.22)',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,color:'#5EF7A6',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all .2s' }}
          onMouseEnter={e=>{e.currentTarget.style.background='linear-gradient(135deg,rgba(94,247,166,.2),rgba(94,247,166,.08))';}}
          onMouseLeave={e=>{e.currentTarget.style.background='linear-gradient(135deg,rgba(94,247,166,.13),rgba(94,247,166,.04))';}}>
          {generating?<Loader2 size={14} className="animate-spin"/>:<Zap size={14}/>}
          {generating?'Generating…':'Claim Free Trial'}
        </button>
      ) : (
        <div style={{ padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',textAlign:'center' }}>
          <div style={{ fontSize:9,color:'rgba(255,255,255,.28)',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4 }}>NEXT TRIAL IN</div>
          <div style={{ fontSize:18,fontWeight:900,color:'rgba(255,255,255,.45)',fontFamily:'monospace' }}><MiniCountdown ms={cooldownMs}/></div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, user, systemStatus } = useAppStore();
  const isSystemOnline = systemStatus==='online';
  const isMod = canManageAnnouncements(user?.role);

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

  // ── Jeton line animation — runs once on mount ──────────────
  useEffect(() => {
    const LINE_START = 40;
    const LINE_END   = 860;
    const DURATION   = 1200;
    const CARD_IDS   = ['jc-0','jc-1','jc-2','jc-3','jc-4'];
    const NUM_CARDS  = CARD_IDS.length;

    const mainLine = document.getElementById('jl-main');
    const glowLine = document.getElementById('jl-glow');
    if (!mainLine || !glowLine) return;

    const setX = (x: number) => {
      mainLine.setAttribute('x2', String(x));
      glowLine.setAttribute('x2', String(x));
    };

    setX(LINE_START);
    CARD_IDS.forEach(id => document.getElementById(id)?.classList.remove('jc-visible'));

    const startTime = performance.now();

    const animate = (now: number) => {
      const t      = Math.min(1, (now - startTime) / DURATION);
      const eased  = 1 - Math.pow(1 - t, 3);
      const x      = LINE_START + eased * (LINE_END - LINE_START);
      setX(x);

      CARD_IDS.forEach((id, idx) => {
        const threshold = (idx + 1) / (NUM_CARDS + 1);
        if (eased >= threshold) document.getElementById(id)?.classList.add('jc-visible');
      });

      if (t < 1) requestAnimationFrame(animate);
      else {
        setX(LINE_END);
        CARD_IDS.forEach(id => document.getElementById(id)?.classList.add('jc-visible'));
      }
    };

    const timer = setTimeout(() => requestAnimationFrame(animate), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at',{ ascending:false }).limit(10)
      .then(({ data }) => { if (data) setAnns(data as DBAnn[]); setAnnLoading(false); });
    const ch = supabase.channel('dash-anns')
      .on('postgres_changes',{ event:'INSERT',schema:'public',table:'announcements' },({ new:r })=>setAnns(prev=>[r as DBAnn,...prev]))
      .on('postgres_changes',{ event:'DELETE',schema:'public',table:'announcements' },({ old:r })=>setAnns(prev=>prev.filter(a=>a.id!==(r as any).id)))
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  }, []);

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
    toast.success('+10 bonus points claimed!');
    logActivity({ userId:user.id,userEmail:user.email,userName:user.name,action:'bonus_claim',status:'success',meta:{ points:10,total:nextPoints } });
  };

  const handlePublishAnn = async () => {
    if (!fTitle.trim()||!fContent.trim()) { toast.error('Fill title and content'); return; }
    setPublishing(true);
    const { error } = await supabase.from('announcements').insert({ title:fTitle.trim(),content:fContent.trim(),type:fType,created_by:user?.email??'' });
    if (error) toast.error('Failed: '+error.message);
    else {
      toast.success('Broadcast published');
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

  const active = licenses.filter(l=>new Date(l.expiresAt).getTime()>Date.now());
  const approved = (transactions as any[]).filter((tx: any)=>tx.status==='approved').length;
  const totalOnline = safeNum(lag.onlineUsers)+safeNum(int.onlineUsers);
  const totalUsers = safeNum(lag.numUsers)+safeNum(int.numUsers);
  const progressPct = bonusPoints%100;
  const firstName = user?.name?.split(' ')[0] || 'User';

  const TYPE_CFG = {
    update:      { emoji:'✨', color:'#5EF7A6', bg:'rgba(94,247,166,.08)',  border:'rgba(94,247,166,.18)'  },
    maintenance: { emoji:'🔧', color:'#a78bfa', bg:'rgba(167,139,250,.08)', border:'rgba(167,139,250,.18)' },
    feature:     { emoji:'⚡', color:'#f59e0b', bg:'rgba(245,158,11,.08)',  border:'rgba(245,158,11,.18)'  },
  } as const;

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:0,paddingBottom:60,fontFamily:'Inter,sans-serif',position:'relative' }}>
      <style>{`
        @keyframes db-in { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes db-glow { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes db-shimmer { 0%{left:-100%} 100%{left:200%} }
        @keyframes db-badge { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }

        .db-float-card {
          background: linear-gradient(160deg,rgba(255,255,255,.035) 0%,rgba(255,255,255,.012) 100%);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 22px;
          position: relative; overflow: hidden;
          transition: border-color .25s, transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s;
        }
        .db-float-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);
        }
        .db-float-card:hover { border-color:rgba(255,255,255,.12); transform:translateY(-3px); box-shadow:0 18px 50px rgba(0,0,0,.4); }

        .db-stat {
          animation: db-in .55s cubic-bezier(.22,1,.36,1) both;
          flex:1; padding:22px 20px;
          background: linear-gradient(160deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.015) 100%);
          border: 1px solid rgba(255,255,255,.08); border-radius:20px;
          position:relative; overflow:hidden;
          transition: transform .28s cubic-bezier(.22,1,.36,1), border-color .2s;
          min-width:0;
        }
        .db-stat::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent); }
        .db-stat:hover { transform:translateY(-4px); border-color:rgba(255,255,255,.13); }

        .db-hero {
          border-radius:28px; overflow:hidden; position:relative;
          background: linear-gradient(145deg,#0e0820 0%,#120a2e 40%,#0a0f1a 100%);
          border: 1px solid rgba(139,92,246,.18);
          box-shadow: 0 0 80px rgba(109,40,217,.1), 0 32px 64px rgba(0,0,0,.5);
          animation: db-in .5s cubic-bezier(.22,1,.36,1) both;
        }

        .db-live-dot {
          width:7px; height:7px; border-radius:50%;
          background:#5EF7A6;
          box-shadow: 0 0 8px #5EF7A6, 0 0 18px rgba(94,247,166,.35);
          animation: db-glow 2s ease-in-out infinite;
        }

        .db-bar { height:5px; border-radius:999px; background:rgba(255,255,255,.06); overflow:hidden; position:relative; }
        .db-bar-fill {
          height:100%; border-radius:999px;
          background:linear-gradient(90deg,#7c3aed,#a78bfa,#c4b5fd);
          box-shadow:0 0 12px rgba(139,92,246,.55);
          transition: width .8s cubic-bezier(.22,1,.36,1);
          position:relative; overflow:hidden;
        }
        .db-bar-fill::after {
          content:''; position:absolute; top:0; bottom:0; left:-100%;
          width:50%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);
          animation: db-shimmer 2.2s ease-in-out infinite;
        }

        .db-btn-claim {
          width:100%; padding:13px; border-radius:14px; border:none; cursor:pointer;
          font-family:inherit; font-size:13px; font-weight:800;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition: all .25s cubic-bezier(.22,1,.36,1);
          position:relative; overflow:hidden;
          background: linear-gradient(135deg,#7c3aed,#6d28d9);
          color:#fff;
          box-shadow: 0 0 24px rgba(109,40,217,.4), 0 4px 16px rgba(0,0,0,.3);
        }
        .db-btn-claim:hover { transform:translateY(-2px); box-shadow:0 0 38px rgba(109,40,217,.6),0 8px 22px rgba(0,0,0,.4); }
        .db-btn-claim::before { content:''; position:absolute; top:0; bottom:0; left:-80%; width:40%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent); transition:left .4s ease; pointer-events:none; }
        .db-btn-claim:hover::before { left:160%; }
        .db-btn-claim:disabled { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); color:rgba(255,255,255,.32); cursor:not-allowed; box-shadow:none; transform:none !important; }

        .db-ann {
          padding:16px 18px; border-radius:16px;
          background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.05);
          cursor:pointer; transition:all .18s;
          animation: db-in .45s cubic-bezier(.22,1,.36,1) both;
        }
        .db-ann:hover { background:rgba(255,255,255,.04); border-color:rgba(255,255,255,.09); }

        .db-redeem {
          padding:7px 16px; border-radius:10px; border:1px solid rgba(251,191,36,.28); cursor:pointer;
          font-family:inherit; font-size:11px; font-weight:800;
          background:linear-gradient(135deg,rgba(251,191,36,.14),rgba(245,158,11,.07));
          color:#fbbf24; transition:all .2s; white-space:nowrap;
          display:flex; align-items:center; gap:5px;
        }
        .db-redeem:hover { background:linear-gradient(135deg,rgba(251,191,36,.24),rgba(245,158,11,.14)); box-shadow:0 0 16px rgba(245,158,11,.28); }
        .db-redeem:disabled { opacity:.35; cursor:not-allowed; }

        .db-g4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .db-g3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .db-g2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .db-g21 { display:grid; grid-template-columns:1fr 1.7fr; gap:20px; }

        @media(max-width:900px) { .db-g4{grid-template-columns:repeat(2,1fr)} .db-g3{grid-template-columns:repeat(2,1fr)} .db-g21{grid-template-columns:1fr} }
        @media(max-width:600px) { .db-g4{grid-template-columns:1fr 1fr} .db-g3{grid-template-columns:1fr 1fr} .db-g2{grid-template-columns:1fr} }

        /* ══ JETON CARDS ══ */
        .jeton-card {
          position: relative; z-index: 2;
          width: 148px; flex-shrink: 0;
          background: linear-gradient(160deg,rgba(255,255,255,.06) 0%,rgba(255,255,255,.02) 100%);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 20px;
          padding: 20px 16px 16px;
          opacity: 0;
          transform: translateY(28px) scale(0.94);
          transition: opacity .55s cubic-bezier(.22,1,.36,1), transform .55s cubic-bezier(.22,1,.36,1), border-color .25s, box-shadow .25s;
        }
        .jeton-card.jc-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .jeton-card:hover {
          border-color: rgba(255,255,255,.2);
          box-shadow: 0 16px 48px rgba(0,0,0,.45);
          transform: translateY(-4px) scale(1.02) !important;
        }
        .jeton-card-featured {
          background: linear-gradient(160deg,rgba(139,92,246,.15) 0%,rgba(109,40,217,.06) 100%);
          border-color: rgba(139,92,246,.35);
          box-shadow: 0 0 40px rgba(109,40,217,.2);
        }
        .jeton-card-featured:hover {
          box-shadow: 0 0 60px rgba(109,40,217,.35), 0 16px 48px rgba(0,0,0,.5) !important;
        }
        .jeton-card-dot {
          position: absolute; top: -5px; left: 50%; transform: translateX(-50%);
          width: 10px; height: 10px; border-radius: 50%;
          border: 2px solid rgba(14,8,32,1);
          opacity: 0; transition: opacity .3s .3s;
          box-shadow: 0 0 10px currentColor;
        }
        .jeton-card.jc-visible .jeton-card-dot { opacity: 1; }
        .jeton-card-icon {
          width: 44px; height: 44px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }
        .jeton-card-name {
          font-size: 12px; font-weight: 700;
          color: rgba(255,255,255,.55);
          letter-spacing: .01em; margin-bottom: 4px;
        }
        .jeton-card-val {
          font-size: 22px; font-weight: 900;
          color: #fff; letter-spacing: -.04em;
          line-height: 1; margin-bottom: 5px;
        }
        .jeton-card-sub {
          font-size: 10px; font-weight: 600;
          color: rgba(255,255,255,.28);
          text-transform: uppercase; letter-spacing: .1em;
        }
        .jeton-spacer { width: 48px; flex-shrink: 0; position: relative; z-index: 1; }

        @media(max-width:860px) {
          .jeton-card { width: 120px; padding: 16px 12px 14px; }
          .jeton-spacer { width: 24px; }
          .jeton-card-val { font-size: 18px; }
        }
        @media(max-width:620px) {
          #jeton-row { flex-wrap: wrap; gap: 10px; justify-content: center; }
          .jeton-card { width: 140px; }
          .jeton-spacer { display: none; }
          #jeton-line-svg { display: none; }
        }
      `}</style>

      {showRewardModal && user && (
        <RewardModal bonusPoints={bonusPoints} userId={user.id} userEmail={user.email}
          onClose={()=>setShowRewardModal(false)}
          onRedeem={(pts)=>{ setBonusPoints(pts); setShowRewardModal(false); }}/>
      )}

      {/* ══ JETON-STYLE HERO — animated line + floating cards ══ */}
      <div className="db-hero" style={{ padding:'0',marginBottom:26,overflow:'hidden' }}>
        {/* Static BG layers */}
        <div style={{ position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none' }}>
          <div style={{ position:'absolute',top:'-15%',left:'-5%',width:'50%',height:'130%',background:'radial-gradient(ellipse,rgba(109,40,217,.18) 0%,transparent 65%)',filter:'blur(2px)' }}/>
          <div style={{ position:'absolute',top:'10%',right:'-8%',width:'38%',height:'80%',background:'radial-gradient(ellipse,rgba(67,37,110,.2) 0%,transparent 65%)' }}/>
          <div style={{ position:'absolute',bottom:'-20%',left:'35%',width:'35%',height:'70%',background:'radial-gradient(ellipse,rgba(84,67,136,.12) 0%,transparent 65%)' }}/>
          <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px)',backgroundSize:'44px 44px',opacity:.7 }}/>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,rgba(139,92,246,.7),rgba(167,139,250,.4),transparent)' }}/>
        </div>

        {/* ── TOP: welcome text ── */}
        <div style={{ position:'relative',zIndex:1,padding:'34px 34px 28px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16 }}>
          <div style={{ animation:'db-in .5s both' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
              <div className="db-live-dot"/>
              <span style={{ fontSize:10,fontWeight:800,letterSpacing:'.22em',textTransform:'uppercase',color:'rgba(94,247,166,.75)' }}>
                {isSystemOnline?'System Online':'Maintenance Mode'}
              </span>
            </div>
            <h1 style={{ fontSize:'clamp(22px,4vw,34px)',fontWeight:900,color:'#fff',letterSpacing:'-.03em',margin:0,lineHeight:1.1,marginBottom:8 }}>
              Welcome Back,{' '}
              <span style={{ background:'linear-gradient(125deg,#ddd6fe,#a78bfa,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>{firstName}</span>
            </h1>
            <div style={{ fontSize:10,fontWeight:700,color:'rgba(255,255,255,.25)',letterSpacing:'.2em',textTransform:'uppercase' }}>
              1999X FREE FIRE PANEL
            </div>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 16px',borderRadius:999,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',backdropFilter:'blur(12px)',animation:'db-in .5s .1s both',alignSelf:'flex-start' }}>
            <Shield size={12} color="#a78bfa"/>
            <span style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,.6)' }}>OB52 Undetected</span>
            <div style={{ width:5,height:5,borderRadius:'50%',background:'#5EF7A6',boxShadow:'0 0 7px #5EF7A6' }}/>
          </div>
        </div>

        {/* ── JETON LINE + CARDS SECTION ── */}
        <div style={{ position:'relative',zIndex:1,padding:'0 20px 36px' }}>

          {/* Section label */}
          <div style={{ textAlign:'center',marginBottom:32 }}>
            <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.28em',textTransform:'uppercase',color:'rgba(255,255,255,.18)',marginBottom:10 }}>— EVERYTHING IN ONE PLACE —</div>
            <div style={{ fontSize:'clamp(24px,5vw,40px)',fontWeight:900,color:'#fff',letterSpacing:'-.04em',lineHeight:1.1 }}>
              1999X <span style={{ background:'linear-gradient(135deg,#a78bfa,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>SHOP</span>
            </div>
          </div>

          {/* Cards + line wrapper */}
          <div id="jeton-row" style={{ position:'relative',display:'flex',alignItems:'center',justifyContent:'center',gap:0,maxWidth:900,margin:'0 auto' }}>

            {/* SVG animated line — sits behind cards */}
            <svg
              id="jeton-line-svg"
              style={{ position:'absolute',top:'50%',left:0,width:'100%',height:'8px',transform:'translateY(-50%)',pointerEvents:'none',overflow:'visible',zIndex:0 }}
              viewBox="0 0 900 8"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="jlg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0"/>
                  <stop offset="15%"  stopColor="#7c3aed" stopOpacity="1"/>
                  <stop offset="85%"  stopColor="#c4b5fd" stopOpacity="1"/>
                  <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="jgg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0"/>
                  <stop offset="50%"  stopColor="#8b5cf6" stopOpacity="0.5"/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {/* Track */}
              <line x1="40" y1="4" x2="860" y2="4" stroke="rgba(255,255,255,.07)" strokeWidth="1"/>
              {/* Glow layer */}
              <line id="jl-glow"  x1="40" y1="4" x2="40" y2="4" stroke="url(#jgg)" strokeWidth="10" strokeLinecap="round"/>
              {/* Main line */}
              <line id="jl-main"  x1="40" y1="4" x2="40" y2="4" stroke="url(#jlg)" strokeWidth="2"  strokeLinecap="round"/>
            </svg>

            {/* CARD 1 */}
            <div id="jc-0" className="jeton-card" style={{ transitionDelay:'0ms' }}>
              <div className="jeton-card-dot" style={{ background:'#7c3aed' }}/>
              <div className="jeton-card-icon" style={{ background:'rgba(124,58,237,.15)',border:'1px solid rgba(124,58,237,.28)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
              <div className="jeton-card-name">Balance</div>
              <div className="jeton-card-val">${balance.toFixed(2)}</div>
              <div className="jeton-card-sub">Wallet funds</div>
            </div>

            <div className="jeton-spacer"/>

            {/* CARD 2 */}
            <div id="jc-1" className="jeton-card" style={{ transitionDelay:'120ms' }}>
              <div className="jeton-card-dot" style={{ background:'#8b5cf6' }}/>
              <div className="jeton-card-icon" style={{ background:'rgba(139,92,246,.15)',border:'1px solid rgba(139,92,246,.28)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <div className="jeton-card-name">Active Keys</div>
              <div className="jeton-card-val">{active.length}</div>
              <div className="jeton-card-sub">Live licenses</div>
            </div>

            <div className="jeton-spacer"/>

            {/* CARD 3 — centre with brand text */}
            <div id="jc-2" className="jeton-card jeton-card-featured" style={{ transitionDelay:'240ms' }}>
              <div className="jeton-card-dot" style={{ background:'#a78bfa' }}/>
              <div className="jeton-card-icon" style={{ background:'rgba(167,139,250,.18)',border:'1px solid rgba(167,139,250,.35)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div className="jeton-card-name" style={{ color:'#ddd6fe' }}>Bonus Points</div>
              <div className="jeton-card-val" style={{ color:'#c4b5fd' }}>{bonusPoints}</div>
              <div className="jeton-card-sub">Earn &amp; redeem</div>
            </div>

            <div className="jeton-spacer"/>

            {/* CARD 4 */}
            <div id="jc-3" className="jeton-card" style={{ transitionDelay:'360ms' }}>
              <div className="jeton-card-dot" style={{ background:'#5EF7A6' }}/>
              <div className="jeton-card-icon" style={{ background:'rgba(94,247,166,.12)',border:'1px solid rgba(94,247,166,.25)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5EF7A6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="jeton-card-name">Free Trial</div>
              <div className="jeton-card-val" style={{ color:'#5EF7A6' }}>24h</div>
              <div className="jeton-card-sub">Daily reset</div>
            </div>

            <div className="jeton-spacer"/>

            {/* CARD 5 */}
            <div id="jc-4" className="jeton-card" style={{ transitionDelay:'480ms' }}>
              <div className="jeton-card-dot" style={{ background:'#38bdf8' }}/>
              <div className="jeton-card-icon" style={{ background:'rgba(56,189,248,.12)',border:'1px solid rgba(56,189,248,.25)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="jeton-card-name">Reseller</div>
              <div className="jeton-card-val" style={{ color:'#38bdf8' }}>{approved}</div>
              <div className="jeton-card-sub">Approved deals</div>
            </div>

          </div>

          {/* Live stats strip */}
          <div style={{ marginTop:32 }}>
            <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.22em',textTransform:'uppercase',color:'rgba(255,255,255,.15)',marginBottom:12,textAlign:'center' }}>— LIVE STATISTICS —</div>
            <div className="db-g3" style={{ gap:10,maxWidth:900,margin:'0 auto' }}>
              {[
                { label:'Total Users',  val:statsLoading?'—':totalUsers.toLocaleString()+'+', icon:<Users size={14}/>,    color:'#818cf8', bg:'rgba(129,140,248,.09)', bc:'rgba(129,140,248,.18)' },
                { label:'Live Playing', val:statsLoading?'—':totalOnline.toLocaleString(),     icon:<Activity size={14}/>, color:'#5EF7A6', bg:'rgba(94,247,166,.09)',  bc:'rgba(94,247,166,.18)',  live:true },
                { label:'OB52 Status',  val:'Undetected',                                       icon:<Shield size={14}/>,   color:'#f59e0b', bg:'rgba(245,158,11,.09)', bc:'rgba(245,158,11,.18)' },
              ].map((s,i)=>(
                <div key={s.label} style={{ padding:'14px 16px',borderRadius:14,background:s.bg,border:`1px solid ${s.bc}`,animation:`db-in .5s ${.15+i*.08}s both`,position:'relative',overflow:'hidden' }}>
                  <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${s.color}35,transparent)` }}/>
                  <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:7 }}>
                    <div style={{ color:s.color }}>{s.icon}</div>
                    {(s as any).live && <div className="db-live-dot" style={{ width:5,height:5 }}/>}
                  </div>
                  <div style={{ fontSize:20,fontWeight:900,color:s.color,letterSpacing:'-.02em',marginBottom:2 }}>{s.val}</div>
                  <div style={{ fontSize:9,fontWeight:700,color:'rgba(255,255,255,.28)',textTransform:'uppercase',letterSpacing:'.12em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ PERSONAL STATS ══ */}
      <div className="db-g4" style={{ marginBottom:22 }}>
        {[
          { label:'Balance',      val:`$${balance.toFixed(2)}`, emoji:'💰', color:'#5EF7A6', d:0   },
          { label:'Active Keys',  val:active.length,             emoji:'🔑', color:'#818cf8', d:.07 },
          { label:'Approved',     val:approved,                  emoji:'✅', color:'#38bdf8', d:.14 },
          { label:'Bonus Points', val:bonusPoints,               emoji:'⭐', color:'#fbbf24', d:.21 },
        ].map(s=>(
          <div key={s.label} className="db-stat" style={{ animationDelay:`${s.d}s` }}>
            <div style={{ fontSize:20,marginBottom:10 }}>{s.emoji}</div>
            <div style={{ fontSize:26,fontWeight:900,color:s.color,letterSpacing:'-.04em',lineHeight:1,marginBottom:4 }}>{s.val}</div>
            <div style={{ fontSize:10,fontWeight:600,color:'rgba(255,255,255,.32)',textTransform:'uppercase',letterSpacing:'.1em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ══ BONUS + FREE KEY + ANNOUNCEMENTS ══ */}
      <div className="db-g21" style={{ marginBottom:20 }}>

        {/* LEFT COLUMN */}
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>

          {/* BONUS CARD */}
          <div className="db-float-card" style={{ padding:'26px 24px',animation:'db-in .6s .1s both' }}>
            <div style={{ position:'absolute',top:-35,right:-15,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,.16) 0%,transparent 70%)',pointerEvents:'none' }}/>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
              <div style={{ display:'flex',alignItems:'center',gap:11 }}>
                <div style={{ width:42,height:42,borderRadius:14,background:'linear-gradient(135deg,rgba(139,92,246,.22),rgba(109,40,217,.08))',border:'1px solid rgba(139,92,246,.25)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 16px rgba(109,40,217,.18)' }}>
                  <Gift size={18} color="#a78bfa"/>
                </div>
                <div>
                  <div style={{ fontSize:15,fontWeight:800,color:'#fff',letterSpacing:'-.01em' }}>Daily Bonus</div>
                  <div style={{ fontSize:11,color:'rgba(255,255,255,.35)' }}>+10 pts every 24h</div>
                </div>
              </div>
              {bonusPoints>=100 && (
                <button onClick={()=>setShowRewardModal(true)} className="db-redeem">
                  <Star size={10}/> Redeem
                </button>
              )}
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex',alignItems:'baseline',gap:5,marginBottom:10 }}>
                <span style={{ fontSize:40,fontWeight:900,color:'#fff',letterSpacing:'-.05em',lineHeight:1 }}>{bonusPoints}</span>
                <span style={{ fontSize:14,color:'rgba(255,255,255,.28)',fontWeight:600 }}>pts</span>
                <span style={{ fontSize:10,color:'rgba(255,255,255,.22)',marginLeft:3 }}>/ 100</span>
              </div>
              <div className="db-bar">
                <div className="db-bar-fill" style={{ width:`${Math.min(progressPct===0&&bonusPoints>=100?100:progressPct,100)}%` }}/>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',marginTop:5 }}>
                <span style={{ fontSize:10,color:'rgba(255,255,255,.22)',fontWeight:600 }}>{progressPct}/100 this cycle</span>
                {bonusPoints>=100 && <span style={{ fontSize:10,color:'#fbbf24',fontWeight:800,animation:'db-badge .4s both' }}>🎁 Ready!</span>}
              </div>
            </div>

            <button onClick={handleClaimBonus} disabled={!canClaimBonus||claimingBonus} className="db-btn-claim">
              {claimingBonus
                ? <><Loader2 size={13} className="animate-spin"/> Claiming…</>
                : canClaimBonus
                  ? <><Sparkles size={13}/> Claim +10 Points</>
                  : <><Clock size={12}/> {bonusCooldown}</>
              }
            </button>
          </div>

          {/* FREE KEY */}
          <div style={{ animation:'db-in .6s .18s both' }}>
            <FreeKeyCard/>
          </div>
        </div>

        {/* RIGHT — ANNOUNCEMENTS */}
        <div className="db-float-card" style={{ padding:'26px',animation:'db-in .6s .08s both',display:'flex',flexDirection:'column',minHeight:360 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
            <div>
              <div style={{ fontSize:15,fontWeight:800,color:'#fff',letterSpacing:'-.01em' }}>System Broadcasts</div>
              <div style={{ fontSize:11,color:'rgba(255,255,255,.3)',marginTop:2 }}>
                {annLoading?'Loading…':anns.length===0?'No active broadcasts':`${anns.length} active`}
              </div>
            </div>
            {isMod && (
              <button onClick={()=>setShowForm(!showForm)}
                style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 13px',borderRadius:10,background:showForm?'rgba(248,113,113,.08)':'rgba(255,255,255,.05)',border:`1px solid ${showForm?'rgba(248,113,113,.18)':'rgba(255,255,255,.09)'}`,cursor:'pointer',color:showForm?'#f87171':'rgba(255,255,255,.5)',fontSize:12,fontFamily:'inherit',fontWeight:700,transition:'all .15s' }}>
                {showForm?<><X size={11}/> Close</>:<><Plus size={11}/> Post</>}
              </button>
            )}
          </div>

          {showForm && isMod && (
            <div style={{ padding:'18px',borderRadius:14,background:'rgba(255,255,255,.022)',border:'1px solid rgba(255,255,255,.07)',marginBottom:16 }}>
              <div style={{ display:'flex',gap:7,marginBottom:12,flexWrap:'wrap' }}>
                {(['update','feature','maintenance'] as const).map(tp=>(
                  <button key={tp} onClick={()=>setFType(tp)} style={{ padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',border:`1px solid ${fType===tp?TYPE_CFG[tp].color:TYPE_CFG[tp].border}`,background:fType===tp?TYPE_CFG[tp].bg:'transparent',color:fType===tp?TYPE_CFG[tp].color:'rgba(255,255,255,.38)',fontFamily:'inherit',textTransform:'capitalize' }}>{tp}</button>
                ))}
              </div>
              <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="Broadcast title…"
                style={{ width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:9,padding:'10px 13px',color:'#fff',fontSize:13,outline:'none',marginBottom:9,fontFamily:'inherit',boxSizing:'border-box' }}/>
              <textarea value={fContent} onChange={e=>setFContent(e.target.value)} placeholder="Broadcast details…" rows={2}
                style={{ width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:9,padding:'10px 13px',color:'#fff',fontSize:13,outline:'none',resize:'vertical',fontFamily:'inherit',marginBottom:11,boxSizing:'border-box' }}/>
              <button onClick={handlePublishAnn} disabled={publishing}
                style={{ width:'100%',padding:'10px',borderRadius:10,background:'linear-gradient(135deg,#7c3aed,#6d28d9)',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:800,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:7 }}>
                {publishing?<><Loader2 size={12} className="animate-spin"/>Transmitting…</>:<><Send size={12}/> Transmit</>}
              </button>
            </div>
          )}

          {/* List */}
          <div style={{ flex:1,display:'flex',flexDirection:'column',gap:9,overflowY:'auto',maxHeight:400 }} className="custom-scroll">
            {annLoading ? (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'40px 0',color:'rgba(255,255,255,.22)',fontSize:13 }}>
                <Loader2 size={13} className="animate-spin"/> Loading…
              </div>
            ) : anns.length === 0 ? (
              <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 0',gap:12 }}>
                <div style={{ width:52,height:52,borderRadius:16,background:'rgba(255,255,255,.022)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>📡</div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:14,fontWeight:700,color:'rgba(255,255,255,.28)' }}>All Clear</div>
                  <div style={{ fontSize:12,color:'rgba(255,255,255,.16)',marginTop:3 }}>No active broadcasts at this time</div>
                </div>
              </div>
            ) : anns.map((ann,i)=>{
              const cfg = TYPE_CFG[ann.type]??TYPE_CFG.update;
              const isExpanded = expandedAnn===ann.id;
              return (
                <div key={ann.id} className="db-ann" style={{ animationDelay:`${i*.06}s`,borderLeft:`3px solid ${cfg.color}50` }}
                  onClick={()=>setExpandedAnn(isExpanded?null:ann.id)}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <span style={{ fontSize:15,flexShrink:0 }}>{cfg.emoji}</span>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <span style={{ fontSize:13,fontWeight:700,color:'#fff',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:isExpanded?'normal':'nowrap' }}>{ann.title}</span>
                        <span style={{ fontSize:8,fontWeight:800,padding:'2px 7px',borderRadius:99,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,letterSpacing:'.06em',textTransform:'uppercase',flexShrink:0 }}>{ann.type}</span>
                      </div>
                      {!isExpanded && <p style={{ fontSize:11,color:'rgba(255,255,255,.35)',margin:'3px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ann.content}</p>}
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:5,flexShrink:0 }}>
                      {isMod && (
                        <button onClick={e=>{e.stopPropagation();handleDeleteAnn(ann.id);}}
                          style={{ padding:'3px 5px',borderRadius:6,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.18)',transition:'color .15s' }}
                          onMouseEnter={e=>e.currentTarget.style.color='#f87171'}
                          onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.18)'}><Trash2 size={11}/></button>
                      )}
                      <ChevronRight size={12} color="rgba(255,255,255,.2)" style={{ transform:isExpanded?'rotate(90deg)':'none',transition:'transform .2s' }}/>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ paddingLeft:25,paddingTop:10 }}>
                      <p style={{ fontSize:12,color:'rgba(255,255,255,.5)',lineHeight:1.65,margin:'0 0 8px' }}>{ann.content}</p>
                      <div style={{ fontSize:10,color:'rgba(255,255,255,.22)',fontWeight:600 }}>
                        {new Date(ann.created_at).toLocaleDateString('en-US',{ month:'long',day:'numeric',year:'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

// helper to avoid literal template literal issues
function clamp(min: number, val: number, unit: string, max: number): string {
  return `clamp(${min}px,${val}${unit},${max}px)`;
}
