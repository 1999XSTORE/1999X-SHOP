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
    <div className="d-card" style={{ padding:'26px 24px' }}>
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
    <div style={{ display:'flex', flexDirection:'column', gap:0, paddingBottom:80, fontFamily:"'Inter', sans-serif" }}>
      <style>{`
        @keyframes _in  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes _glow { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes _shi  { 0%{left:-120%} 100%{left:120%} }
        @keyframes _arc  { from{stroke-dashoffset:var(--ao)} to{stroke-dashoffset:var(--ae)} }
        @keyframes _pop  { 0%{transform:scale(0) rotate(-20deg);opacity:0} 60%{transform:scale(1.08) rotate(2deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes _bar  { from{width:0} to{width:var(--bw)} }

        .d-card {
          background: rgba(18,17,28,.82);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 20px;
          position: relative; overflow: hidden;
          transition: border-color .22s, box-shadow .22s, transform .28s cubic-bezier(.22,1,.36,1);
        }
        .d-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);
        }
        .d-card:hover { border-color:rgba(255,255,255,.13); transform:translateY(-3px); box-shadow:0 18px 48px rgba(0,0,0,.5); }

        .d-label {
          font-size:10px; font-weight:700; letter-spacing:.15em;
          text-transform:uppercase; color:rgba(255,255,255,.3);
        }
        .d-val {
          font-size:32px; font-weight:900; color:#fff;
          letter-spacing:-.04em; line-height:1;
        }

        .d-live {
          display:inline-flex; align-items:center; gap:6px;
          font-size:10px; font-weight:700; letter-spacing:.15em; text-transform:uppercase;
          color:rgba(94,247,166,.8);
        }
        .d-live-dot {
          width:7px; height:7px; border-radius:50%; background:#5EF7A6;
          box-shadow:0 0 8px #5EF7A6,0 0 16px rgba(94,247,166,.4);
          animation:_glow 2s ease-in-out infinite;
        }

        .d-chip {
          display:inline-flex; align-items:center; gap:5px;
          padding:4px 11px; border-radius:99px; font-size:10px; font-weight:700;
          letter-spacing:.06em;
        }

        .d-btn {
          display:flex; align-items:center; justify-content:center; gap:7px;
          padding:12px 0; width:100%; border-radius:12px; border:none; cursor:pointer;
          font-family:inherit; font-size:13px; font-weight:700;
          background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff;
          box-shadow:0 0 22px rgba(109,40,217,.38),0 4px 14px rgba(0,0,0,.3);
          transition:all .22s cubic-bezier(.22,1,.36,1); position:relative; overflow:hidden;
        }
        .d-btn::before { content:''; position:absolute; top:0; bottom:0; left:-120%; width:50%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);
          transition:left .4s ease; pointer-events:none; }
        .d-btn:hover { transform:translateY(-2px); box-shadow:0 0 36px rgba(109,40,217,.6),0 8px 20px rgba(0,0,0,.4); }
        .d-btn:hover::before { left:120%; }
        .d-btn:disabled { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07);
          color:rgba(255,255,255,.3); box-shadow:none; cursor:not-allowed; transform:none !important; }

        .d-bar-bg { height:5px; border-radius:99px; background:rgba(255,255,255,.06); overflow:hidden; }
        .d-bar-fill { height:100%; border-radius:99px; position:relative; overflow:hidden;
          animation:_bar .9s cubic-bezier(.22,1,.36,1) both;
        }
        .d-bar-fill::after { content:''; position:absolute; top:0; bottom:0; left:-120%; width:50%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);
          animation:_shi 2.4s ease-in-out infinite; }

        .d-ann {
          border-radius:14px; padding:14px 16px; cursor:pointer;
          background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.055);
          transition:all .18s;
        }
        .d-ann:hover { background:rgba(255,255,255,.045); border-color:rgba(255,255,255,.1); }

        .d-shimmer {
          position:absolute; top:0; bottom:0; width:40%; pointer-events:none;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent);
          animation:_shi 4s ease-in-out infinite;
        }

        .d-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .d-grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        .d-grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }

        @media(max-width:860px) {
          .d-grid4 { grid-template-columns:1fr 1fr; }
          .d-grid3 { grid-template-columns:1fr 1fr; }
        }
        @media(max-width:500px) {
          .d-grid4 { grid-template-columns:1fr 1fr; }
          .d-grid3 { grid-template-columns:1fr; }
          .d-grid2 { grid-template-columns:1fr; }
        }
      `}</style>

      {showRewardModal && user && (
        <RewardModal bonusPoints={bonusPoints} userId={user.id} userEmail={user.email}
          onClose={()=>setShowRewardModal(false)}
          onRedeem={(pts)=>{ setBonusPoints(pts); setShowRewardModal(false); }}/>
      )}

      {/* ── WELCOME HEADER ─────────────────────────────────────── */}
      <div style={{ marginBottom:28, animation:'_in .5s both' }}>
        <div className="d-live" style={{ marginBottom:10 }}>
          <div className="d-live-dot"/>
          {isSystemOnline ? 'System Online' : 'Maintenance'}
        </div>
        <h1 style={{ fontSize:'clamp(26px,5vw,40px)', fontWeight:900, color:'#fff',
          letterSpacing:'-.04em', margin:0, lineHeight:1.1, marginBottom:6 }}>
          Welcome back,{' '}
          <span style={{ background:'linear-gradient(120deg,#ddd6fe,#a78bfa,#7c3aed)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            {firstName}
          </span>
        </h1>
        <p style={{ fontSize:12, color:'rgba(255,255,255,.28)', margin:0,
          fontWeight:700, letterSpacing:'.18em', textTransform:'uppercase' }}>
          1999X FREE FIRE PANEL
        </p>
      </div>

      {/* ── ANNOUNCEMENTS — hidden unless something posted ──────── */}
      {!annLoading && anns.length > 0 && (
        <div style={{ marginBottom:20, animation:'_in .4s both' }}>
          {isMod && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
              <button onClick={()=>setShowForm(!showForm)}
                style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 13px',borderRadius:10,
                  background:showForm?'rgba(248,113,113,.08)':'rgba(255,255,255,.05)',
                  border:`1px solid ${showForm?'rgba(248,113,113,.18)':'rgba(255,255,255,.09)'}`,
                  cursor:'pointer',color:showForm?'#f87171':'rgba(255,255,255,.5)',
                  fontSize:11,fontFamily:'inherit',fontWeight:700 }}>
                {showForm?<><X size={11}/>Close</>:<><Plus size={11}/>Post</>}
              </button>
            </div>
          )}
          {showForm && isMod && (
            <div style={{ padding:'16px',borderRadius:14,background:'rgba(255,255,255,.025)',
              border:'1px solid rgba(255,255,255,.07)',marginBottom:12 }}>
              <div style={{ display:'flex',gap:7,marginBottom:10,flexWrap:'wrap' }}>
                {(['update','feature','maintenance'] as const).map(tp=>(
                  <button key={tp} onClick={()=>setFType(tp)}
                    style={{ padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',
                      border:`1px solid ${fType===tp?TYPE_CFG[tp].color:TYPE_CFG[tp].border}`,
                      background:fType===tp?TYPE_CFG[tp].bg:'transparent',
                      color:fType===tp?TYPE_CFG[tp].color:'rgba(255,255,255,.38)',
                      fontFamily:'inherit',textTransform:'capitalize' }}>{tp}</button>
                ))}
              </div>
              <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="Title…"
                style={{ width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',
                  borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:12,outline:'none',
                  marginBottom:8,fontFamily:'inherit',boxSizing:'border-box' }}/>
              <textarea value={fContent} onChange={e=>setFContent(e.target.value)} placeholder="Content…" rows={2}
                style={{ width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',
                  borderRadius:8,padding:'9px 12px',color:'#fff',fontSize:12,outline:'none',
                  resize:'vertical',fontFamily:'inherit',marginBottom:10,boxSizing:'border-box' }}/>
              <button onClick={handlePublishAnn} disabled={publishing}
                style={{ width:'100%',padding:'9px',borderRadius:9,background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                  border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:800,color:'#fff',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                {publishing?<><Loader2 size={12} className="animate-spin"/>Sending…</>:<><Send size={12}/>Publish</>}
              </button>
            </div>
          )}
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {anns.map((ann,i)=>{
              const cfg = TYPE_CFG[ann.type]??TYPE_CFG.update;
              const expanded = expandedAnn===ann.id;
              return (
                <div key={ann.id} className="d-ann"
                  style={{ borderLeft:`3px solid ${cfg.color}60`, animationDelay:`${i*.05}s` }}
                  onClick={()=>setExpandedAnn(expanded?null:ann.id)}>
                  <div style={{ display:'flex',alignItems:'center',gap:9 }}>
                    <span style={{ fontSize:14 }}>{cfg.emoji}</span>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:700,color:'#fff',
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:expanded?'normal':'nowrap' }}>
                        {ann.title}
                      </div>
                      {!expanded&&<div style={{ fontSize:11,color:'rgba(255,255,255,.35)',
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:2 }}>
                        {ann.content}
                      </div>}
                    </div>
                    <div style={{ display:'flex',alignItems:'center',gap:5,flexShrink:0 }}>
                      <span style={{ fontSize:8,fontWeight:800,padding:'2px 7px',borderRadius:99,
                        background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,
                        letterSpacing:'.06em',textTransform:'uppercase' }}>{ann.type}</span>
                      {isMod&&<button onClick={e=>{e.stopPropagation();handleDeleteAnn(ann.id);}}
                        style={{ padding:'3px 5px',borderRadius:6,background:'transparent',border:'none',
                          cursor:'pointer',color:'rgba(255,255,255,.2)' }}
                        onMouseEnter={e=>e.currentTarget.style.color='#f87171'}
                        onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.2)'}><Trash2 size={11}/></button>}
                    </div>
                  </div>
                  {expanded&&<p style={{ fontSize:12,color:'rgba(255,255,255,.5)',
                    lineHeight:1.6,margin:'10px 0 0 23px' }}>{ann.content}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* admin post button when no anns exist */}
      {isMod && anns.length===0 && (
        <div style={{ marginBottom:20,display:'flex',alignItems:'center',gap:10 }}>
          <button onClick={()=>setShowForm(!showForm)}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:10,
              background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',
              cursor:'pointer',color:'rgba(255,255,255,.45)',fontSize:12,fontFamily:'inherit',fontWeight:700 }}>
            <Plus size={12}/> Post Announcement
          </button>
          {showForm && (
            <div style={{ flex:1,display:'flex',flexDirection:'column',gap:8,padding:'14px',
              borderRadius:12,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.07)' }}>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                {(['update','feature','maintenance'] as const).map(tp=>(
                  <button key={tp} onClick={()=>setFType(tp)}
                    style={{ padding:'4px 11px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',
                      border:`1px solid ${fType===tp?TYPE_CFG[tp].color:TYPE_CFG[tp].border}`,
                      background:fType===tp?TYPE_CFG[tp].bg:'transparent',
                      color:fType===tp?TYPE_CFG[tp].color:'rgba(255,255,255,.35)',fontFamily:'inherit' }}>{tp}</button>
                ))}
              </div>
              <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="Title…"
                style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',
                  borderRadius:8,padding:'8px 11px',color:'#fff',fontSize:12,outline:'none',fontFamily:'inherit' }}/>
              <textarea value={fContent} onChange={e=>setFContent(e.target.value)} placeholder="Content…" rows={2}
                style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',
                  borderRadius:8,padding:'8px 11px',color:'#fff',fontSize:12,outline:'none',
                  resize:'vertical',fontFamily:'inherit' }}/>
              <button onClick={handlePublishAnn} disabled={publishing}
                style={{ padding:'9px',borderRadius:9,background:'linear-gradient(135deg,#7c3aed,#6d28d9)',
                  border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:800,color:'#fff',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                {publishing?<><Loader2 size={12} className="animate-spin"/>Sending…</>:<><Send size={12}/>Publish</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TOP ROW: Balance arc + 3 stat cards ─────────────────── */}
      <div className="d-grid2" style={{ marginBottom:14 }}>

        {/* Balance — arc gauge card (Squire-style) */}
        <div className="d-card" style={{ padding:'28px 24px 24px', animation:'_in .5s both' }}>
          <div className="d-shimmer"/>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20 }}>
            <span className="d-label">BALANCE</span>
            <span className="d-chip" style={{ background:'rgba(94,247,166,.1)',
              border:'1px solid rgba(94,247,166,.2)',color:'#5EF7A6' }}>
              <div className="d-live-dot" style={{ width:5,height:5 }}/> Active
            </span>
          </div>
          {/* Arc SVG */}
          <div style={{ display:'flex',justifyContent:'center',marginBottom:16 }}>
            <div style={{ position:'relative',width:160,height:100 }}>
              <svg width="160" height="100" viewBox="0 0 160 100">
                <path d="M16 90 A64 64 0 0 1 144 90" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="10" strokeLinecap="round"/>
                <path d="M16 90 A64 64 0 0 1 144 90" fill="none" stroke="rgba(94,247,166,.25)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray="201" strokeDashoffset={201 - Math.min(201, (balance / Math.max(balance+20, 100)) * 201)}
                  style={{ transition:'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }}/>
                <path d="M16 90 A64 64 0 0 1 144 90" fill="none" stroke="#5EF7A6" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray="201"
                  strokeDashoffset={201 - Math.min(201, (balance / Math.max(balance+20, 100)) * 201 * 0.85)}
                  style={{ transition:'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)',
                    filter:'drop-shadow(0 0 6px rgba(94,247,166,.7))' }}/>
              </svg>
              <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'flex-end',paddingBottom:8 }}>
                <div style={{ fontSize:28,fontWeight:900,color:'#fff',letterSpacing:'-.05em',lineHeight:1 }}>
                  ${balance.toFixed(2)}
                </div>
                <div style={{ fontSize:10,color:'rgba(255,255,255,.3)',fontWeight:600,marginTop:3 }}>WALLET BALANCE</div>
              </div>
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div style={{ padding:'10px 12px',borderRadius:11,
              background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}>
              <div className="d-label" style={{ marginBottom:3 }}>ACTIVE KEYS</div>
              <div style={{ fontSize:22,fontWeight:900,color:'#818cf8',letterSpacing:'-.03em' }}>{active.length}</div>
            </div>
            <div style={{ padding:'10px 12px',borderRadius:11,
              background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}>
              <div className="d-label" style={{ marginBottom:3 }}>BONUS PTS</div>
              <div style={{ fontSize:22,fontWeight:900,color:'#fbbf24',letterSpacing:'-.03em' }}>{bonusPoints}</div>
            </div>
          </div>
        </div>

        {/* Right column — 3 live stat cards stacked */}
        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          {[
            { label:'TOTAL USERS',  val:statsLoading?'—':totalUsers.toLocaleString()+'+', sub:'Registered accounts', color:'#818cf8', bg:'rgba(129,140,248,.09)', bc:'rgba(129,140,248,.18)', d:.06 },
            { label:'LIVE PLAYING', val:statsLoading?'—':totalOnline.toLocaleString(),    sub:'Active sessions now', color:'#5EF7A6', bg:'rgba(94,247,166,.09)',  bc:'rgba(94,247,166,.18)',  d:.12, live:true },
            { label:'ANTIBAN OB52', val:'Protected',                                        sub:'Fully undetected',   color:'#f59e0b', bg:'rgba(245,158,11,.09)', bc:'rgba(245,158,11,.18)', d:.18 },
          ].map(s=>(
            <div key={s.label} className="d-card" style={{
              padding:'16px 18px', flex:1, animation:`_in .5s ${s.d}s both`,
              background:`linear-gradient(135deg,${s.bg},rgba(255,255,255,.015))`,
              borderColor:s.bc }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:1,
                background:`linear-gradient(90deg,transparent,${s.color}30,transparent)` }}/>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4 }}>
                <span className="d-label">{s.label}</span>
                {(s as any).live && <div className="d-live-dot" style={{ width:6,height:6 }}/>}
              </div>
              <div style={{ fontSize:24,fontWeight:900,color:s.color,letterSpacing:'-.03em',lineHeight:1,marginBottom:2 }}>{s.val}</div>
              <div style={{ fontSize:10,color:'rgba(255,255,255,.28)',fontWeight:600 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM ROW: Bonus + Free Key ─────────────────────────── */}
      <div className="d-grid2" style={{ marginBottom:14 }}>

        {/* Bonus card */}
        <div className="d-card" style={{ padding:'24px 22px', animation:'_in .5s .1s both' }}>
          <div className="d-shimmer"/>
          {/* top */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:38,height:38,borderRadius:12,
                background:'linear-gradient(135deg,rgba(139,92,246,.22),rgba(109,40,217,.08))',
                border:'1px solid rgba(139,92,246,.28)',display:'flex',alignItems:'center',
                justifyContent:'center',boxShadow:'0 0 14px rgba(109,40,217,.2)' }}>
                <Gift size={17} color="#a78bfa"/>
              </div>
              <div>
                <div style={{ fontSize:14,fontWeight:800,color:'#fff',letterSpacing:'-.01em' }}>Daily Bonus</div>
                <div style={{ fontSize:11,color:'rgba(255,255,255,.32)' }}>+10 pts · resets 24h</div>
              </div>
            </div>
            {bonusPoints>=100 && (
              <button onClick={()=>setShowRewardModal(true)}
                style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 13px',borderRadius:9,
                  background:'linear-gradient(135deg,rgba(251,191,36,.16),rgba(245,158,11,.07))',
                  border:'1px solid rgba(251,191,36,.28)',cursor:'pointer',fontFamily:'inherit',
                  fontSize:11,fontWeight:800,color:'#fbbf24' }}>
                <Star size={10}/> Redeem
              </button>
            )}
          </div>

          {/* Points + bar */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:8 }}>
              <div style={{ display:'flex',alignItems:'baseline',gap:5 }}>
                <span style={{ fontSize:38,fontWeight:900,color:'#fff',letterSpacing:'-.05em',lineHeight:1 }}>{bonusPoints}</span>
                <span style={{ fontSize:13,color:'rgba(255,255,255,.28)',fontWeight:600 }}>pts</span>
              </div>
              <span style={{ fontSize:11,color:'rgba(255,255,255,.22)',fontWeight:600 }}>{progressPct}/100</span>
            </div>
            <div className="d-bar-bg">
              <div className="d-bar-fill" style={{
                background:'linear-gradient(90deg,#7c3aed,#a78bfa,#c4b5fd)',
                boxShadow:'0 0 10px rgba(139,92,246,.5)',
                '--bw':`${Math.min(progressPct===0&&bonusPoints>=100?100:progressPct,100)}%`
              } as any}/>
            </div>
            {bonusPoints>=100 && (
              <div style={{ textAlign:'right',marginTop:5,fontSize:10,color:'#fbbf24',fontWeight:800 }}>
                🎁 Ready to redeem!
              </div>
            )}
          </div>

          <button onClick={handleClaimBonus} disabled={!canClaimBonus||claimingBonus} className="d-btn">
            {claimingBonus
              ? <><Loader2 size={13} className="animate-spin"/>Claiming…</>
              : canClaimBonus
                ? <><Sparkles size={13}/>Claim +10 Points</>
                : <><Clock size={12}/>{bonusCooldown}</>}
          </button>
        </div>

        {/* Free Key card */}
        <FreeKeyCard/>

      </div>

    </div>
  );
}
