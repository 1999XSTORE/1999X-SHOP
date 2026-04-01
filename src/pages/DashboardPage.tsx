import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity, notifyAll, sendNotificationEmail } from '@/lib/activity';
import {
  Gift, Clock, Zap, Copy, CheckCircle, Eye, EyeOff,
  Loader2, Sparkles, Send, X, Plus, Trash2,
  Users, Activity, Shield, Star, TrendingUp, Wallet
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

function CountUp({ to, duration = 1000 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (to === 0) return;
    const start = performance.now();
    const run = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(e * to));
      if (t < 1) requestAnimationFrame(run);
    };
    const timer = setTimeout(() => requestAnimationFrame(run), 200);
    return () => clearTimeout(timer);
  }, [to]);
  return <>{val.toLocaleString()}</>;
}

function LiveClock({ ms }: { ms: number }) {
  const [txt, setTxt] = useState('--:--:--');
  useEffect(() => {
    const tick = () => {
      const left = ms - Date.now();
      if (left <= 0) { setTxt('00:00:00'); return; }
      const h = String(Math.floor((left%86400000)/3600000)).padStart(2,'0');
      const m = String(Math.floor((left%3600000)/60000)).padStart(2,'0');
      const s = String(Math.floor((left%60000)/1000)).padStart(2,'0');
      setTxt(`${h}:${m}:${s}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [ms]);
  return <span>{txt}</span>;
}

/* ─── REWARD MODAL ──────────────────────────────────────── */
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
    <div style={{ position:'fixed',inset:0,zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(2,2,8,.92)',backdropFilter:'blur(28px)',padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:'100%',maxWidth:420,borderRadius:28,background:'linear-gradient(145deg,rgba(15,10,35,.98),rgba(8,6,20,.98))',border:'1px solid rgba(139,92,246,.3)',boxShadow:'0 0 0 1px rgba(255,255,255,.04) inset, 0 40px 100px rgba(0,0,0,.8), 0 0 80px rgba(109,40,217,.18)',padding:'36px 32px',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:-60,left:-40,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,92,255,.15) 0%,transparent 70%)',pointerEvents:'none' }}/>
        <button onClick={onClose} style={{ position:'absolute',top:16,right:16,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,width:32,height:32,cursor:'pointer',color:'rgba(255,255,255,.4)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s' }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.05)';}}>
          <X size={14}/>
        </button>
        {!success ? (
          <>
            <div style={{ textAlign:'center',marginBottom:28 }}>
              <div style={{ width:56,height:56,borderRadius:18,background:'linear-gradient(135deg,rgba(124,92,255,.2),rgba(109,40,217,.08))',border:'1px solid rgba(124,92,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:24 }}>🎁</div>
              <div style={{ fontSize:20,fontWeight:700,color:'#fff',marginBottom:5 }}>Choose Your Reward</div>
              <p style={{ fontSize:13,color:'rgba(255,255,255,.38)',margin:0 }}>100 points → pick your reward</p>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {[
                { fn:claimBalance, icon:'💰', label:'$3 Balance', sub:'Instantly added to wallet', ac:'rgba(124,92,255,', acv:.22, col:'#a78bfa' },
                { fn:claimKey,     icon:'🔑', label:'3-Day Key',  sub:'Free panel license key',  ac:'rgba(255,255,255,', acv:.1, col:'#fff' },
              ].map((opt,i)=>(
                <button key={i} onClick={opt.fn} disabled={loading&&i===1}
                  style={{ padding:'18px 20px',borderRadius:16,background:`${opt.ac}0.06)`,border:`1px solid ${opt.ac}${opt.acv})`,cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .2s',fontFamily:'inherit',textAlign:'left' }}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${opt.ac}0.12)`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=`${opt.ac}0.06)`;}}>
                  {loading&&i===1?<Loader2 size={22} className="animate-spin" style={{ color:opt.col }}/>:<span style={{ fontSize:26 }}>{opt.icon}</span>}
                  <div>
                    <div style={{ fontSize:15,fontWeight:700,color:opt.col,marginBottom:2 }}>{opt.label}</div>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.35)' }}>{opt.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : success==='balance' ? (
          <div style={{ textAlign:'center',padding:'16px 0' }}>
            <div style={{ fontSize:52,marginBottom:14 }}>✅</div>
            <div style={{ fontSize:18,fontWeight:700,color:'#a78bfa',marginBottom:20 }}>$3 Added to Wallet!</div>
            <button onClick={onClose} className="px-btn">Done</button>
          </div>
        ) : (
          <div style={{ textAlign:'center',padding:'12px 0' }}>
            <div style={{ fontSize:52,marginBottom:12 }}>🔑</div>
            <div style={{ fontSize:18,fontWeight:700,color:'#a78bfa',marginBottom:16 }}>Key Generated!</div>
            <div style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:'12px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:10 }}>
              <code style={{ flex:1,fontSize:11,fontFamily:'monospace',color:'rgba(255,255,255,.8)',wordBreak:'break-all' }}>{genKey}</code>
              <button onClick={()=>{navigator.clipboard.writeText(genKey);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{ background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'6px 9px',cursor:'pointer',color:'rgba(255,255,255,.55)',flexShrink:0 }}>{copied?<CheckCircle size={13}/>:<Copy size={13}/>}</button>
            </div>
            <button onClick={onClose} className="px-btn">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── FREE KEY CARD ─────────────────────────────────────── */
function FreeKeyCard({ animDelay }: { animDelay: number }) {
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
      toast.dismiss('free-trial'); toast.success('Trial activated!');
    } catch(e) { toast.dismiss('free-trial'); toast.error(String(e)); }
    setGenerating(false);
  };

  if (dbLoading) return null;
  const isActive = !!row && new Date(row.expires_at).getTime()>Date.now();

  return (
    <div className="px-panel" style={{ animationDelay:`${animDelay}ms`, gridColumn:'span 1' }}>
      <div className="px-panel-glow" style={{ background:'radial-gradient(circle at 80% 20%, rgba(124,92,255,.22) 0%, transparent 60%)' }}/>
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22 }}>
        <div>
          <div style={{ fontSize:11,fontWeight:600,color:'rgba(255,255,255,.38)',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:6 }}>Free Trial</div>
          <div style={{ fontSize:20,fontWeight:700,color:'#fff',letterSpacing:'-.02em' }}>Daily Access</div>
          <div style={{ fontSize:12,color:'rgba(255,255,255,.3)',marginTop:3 }}>48hr cooldown · Internal + Lag</div>
        </div>
        <div style={{ width:44,height:44,borderRadius:14,background:'linear-gradient(135deg,rgba(124,92,255,.25),rgba(109,40,217,.1))',border:'1px solid rgba(124,92,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 20px rgba(124,92,255,.2)' }}>
          <Zap size={20} color="#a78bfa"/>
        </div>
      </div>

      {isActive && row ? (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div style={{ padding:'18px 20px',borderRadius:18,background:'rgba(124,92,255,.08)',border:'1px solid rgba(124,92,255,.18)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(124,92,255,.06) 0%,transparent 60%)',pointerEvents:'none' }}/>
            <div style={{ fontSize:9,color:'rgba(167,139,250,.7)',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',marginBottom:8 }}>Trial Active — Expires In</div>
            <div style={{ fontSize:36,fontWeight:700,color:'#a78bfa',fontFamily:'monospace',letterSpacing:'.04em',lineHeight:1 }}>
              <LiveClock ms={new Date(row.expires_at).getTime()}/>
            </div>
          </div>
          <button onClick={()=>setRevealed(!revealed)} style={{ padding:'11px 16px',borderRadius:13,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',cursor:'pointer',color:'rgba(255,255,255,.5)',fontSize:13,fontFamily:'inherit',fontWeight:600,display:'flex',alignItems:'center',gap:7,justifyContent:'center',transition:'all .18s' }}
            onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='rgba(255,255,255,.16)';}}
            onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.04)';e.currentTarget.style.color='rgba(255,255,255,.5)';e.currentTarget.style.borderColor='rgba(255,255,255,.08)';}}>
            {revealed?<EyeOff size={14}/>:<Eye size={14}/>} {revealed?'Hide Keys':'View Keys'}
          </button>
          {revealed && (
            <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
              {row.lag_key&&<div style={{ padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize:8,color:'rgba(255,255,255,.28)',fontWeight:700,marginBottom:4,letterSpacing:'.12em',textTransform:'uppercase' }}>Fake Lag</div><code style={{ fontSize:11,color:'rgba(255,255,255,.65)',fontFamily:'monospace',wordBreak:'break-all' }}>{row.lag_key}</code></div>}
              {row.internal_key&&<div style={{ padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize:8,color:'rgba(255,255,255,.28)',fontWeight:700,marginBottom:4,letterSpacing:'.12em',textTransform:'uppercase' }}>Internal</div><code style={{ fontSize:11,color:'rgba(255,255,255,.65)',fontFamily:'monospace',wordBreak:'break-all' }}>{row.internal_key}</code></div>}
            </div>
          )}
        </div>
      ) : canClaim ? (
        <button onClick={handleClaim} disabled={generating} className="px-btn px-btn-full" style={{ marginTop:4 }}>
          {generating?<><Loader2 size={15} className="animate-spin"/>Generating…</>:<><Zap size={15}/>Claim Free Trial</>}
        </button>
      ) : (
        <div style={{ padding:'18px 20px',borderRadius:18,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',textAlign:'center',marginTop:4 }}>
          <div style={{ fontSize:9,color:'rgba(255,255,255,.28)',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',marginBottom:8 }}>Next Trial In</div>
          <div style={{ fontSize:32,fontWeight:700,color:'rgba(255,255,255,.4)',fontFamily:'monospace',letterSpacing:'.04em' }}>
            <LiveClock ms={cooldownMs}/>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, user, systemStatus } = useAppStore();
  const isSystemOnline = systemStatus==='online';
  const isMod = canManageAnnouncements(user?.role);
  const bgRef = useRef<HTMLCanvasElement>(null);

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
  const [arcDash, setArcDash] = useState(0);

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

  // Arc gauge animation
  const ARC = 282;
  useEffect(() => {
    const target = Math.min(ARC, (balance / Math.max(balance+20,100)) * ARC);
    const start = performance.now();
    const run = (now: number) => {
      const t = Math.min(1, (now-start)/900);
      const e = 1-Math.pow(1-t,3);
      setArcDash(e*target);
      if (t<1) requestAnimationFrame(run);
    };
    const timer = setTimeout(()=>requestAnimationFrame(run),400);
    return ()=>clearTimeout(timer);
  }, [balance]);

  // Soft mesh background
  useEffect(() => {
    const canvas = bgRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let raf: number, t = 0;
    const resize = () => { canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const draw = () => {
      t += 0.00025;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const S=44;
      const ox=(t*6)%S, oy=(t*4)%S;
      for(let c=-1;c<Math.ceil(canvas.width/S)+2;c++)
        for(let r=-1;r<Math.ceil(canvas.height/S)+2;r++){
          const wx=c*S-ox, wy=r*S-oy;
          const w=0.5+0.5*Math.sin(c*.5+t*1.8)*Math.cos(r*.5+t*1.2);
          ctx.beginPath(); ctx.arc(wx,wy,1.2,0,Math.PI*2);
          ctx.fillStyle=`rgba(139,92,246,${.025+.02*w})`; ctx.fill();
        }
      raf=requestAnimationFrame(draw);
    };
    draw();
    return ()=>{ cancelAnimationFrame(raf); window.removeEventListener('resize',resize); };
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
    if (error) { toast.error('Error'); setClaimingBonus(false); return; }
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

  const active      = licenses.filter(l=>new Date(l.expiresAt).getTime()>Date.now());
  const totalOnline = safeNum(lag.onlineUsers)+safeNum(int.onlineUsers);
  const totalUsers  = safeNum(lag.numUsers)+safeNum(int.numUsers);
  const progressPct = bonusPoints%100;
  const firstName   = user?.name?.split(' ')[0] || 'User';

  const TYPE_CFG = {
    update:      { emoji:'✨', color:'#a78bfa', bg:'rgba(167,139,250,.07)', border:'rgba(167,139,250,.18)' },
    maintenance: { emoji:'🔧', color:'rgba(255,255,255,.55)', bg:'rgba(255,255,255,.04)', border:'rgba(255,255,255,.12)' },
    feature:     { emoji:'⚡', color:'#c4b5fd', bg:'rgba(196,181,253,.07)', border:'rgba(196,181,253,.2)'  },
  } as const;

  return (
    <div style={{ position:'relative',paddingBottom:80,fontFamily:"'Inter',system-ui,sans-serif",minHeight:'100%' }}>

      {/* ── STYLES ── */}
      <style>{`
        @keyframes px-in  {from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes px-pop {0%{transform:scale(0.85);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        @keyframes px-dot {0%,100%{transform:scale(.9);opacity:.6}50%{transform:scale(1.4);opacity:1;box-shadow:0 0 0 4px rgba(167,139,250,.2),0 0 16px rgba(139,92,246,.6)}}
        @keyframes px-grd {0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes px-bar {from{width:0}to{width:var(--bw)}}
        @keyframes px-shi {0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
        @keyframes px-orb {0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.08)}66%{transform:translate(-20px,15px) scale(.95)}}
        @keyframes px-rng {0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.06);opacity:.7}}

        /* ── Panel (main card type) ── */
        .px-panel {
          position:relative; overflow:hidden;
          background:rgba(255,255,255,.028);
          border:1px solid rgba(255,255,255,.07);
          border-radius:24px;
          padding:28px 26px;
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          animation:px-in .6s cubic-bezier(.22,1,.36,1) both;
          transition:border-color .25s, box-shadow .3s, transform .3s cubic-bezier(.22,1,.36,1);
          will-change:transform;
        }
        .px-panel::after {
          content:''; position:absolute; top:0; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent 0%,rgba(167,139,250,.3) 30%,rgba(255,255,255,.15) 50%,rgba(167,139,250,.3) 70%,transparent 100%);
          pointer-events:none;
        }
        .px-panel:hover {
          border-color:rgba(167,139,250,.25);
          transform:translateY(-4px);
          box-shadow:0 0 0 1px rgba(139,92,246,.12),0 24px 64px rgba(0,0,0,.55),0 0 60px rgba(109,40,217,.12);
        }
        .px-panel-glow {
          position:absolute; inset:0; pointer-events:none;
          opacity:.6; transition:opacity .3s;
        }
        .px-panel:hover .px-panel-glow { opacity:1; }

        /* ── Live dot ── */
        .px-dot {
          display:inline-block; width:8px; height:8px; border-radius:50%;
          background:linear-gradient(135deg,#a78bfa,#7c3aed);
          animation:px-dot 2.4s ease-in-out infinite;
          flex-shrink:0;
        }

        /* ── Stat value ── */
        .px-num {
          font-size:52px; font-weight:700; line-height:1; letter-spacing:-.05em;
          background:linear-gradient(135deg,#fff 0%,rgba(255,255,255,.7) 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          background-clip:text;
        }
        .px-num-violet {
          background:linear-gradient(135deg,#c4b5fd 0%,#7c3aed 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          background-clip:text;
        }

        /* ── Label ── */
        .px-label {
          font-size:10px; font-weight:600; letter-spacing:.14em;
          text-transform:uppercase; color:rgba(255,255,255,.38);
        }

        /* ── Primary button ── */
        .px-btn {
          display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:13px 28px; border-radius:14px; border:none; cursor:pointer;
          font-family:inherit; font-size:13px; font-weight:700; color:#fff;
          background:linear-gradient(135deg,#7c3aed,#6d28d9,#4c1d95);
          background-size:200% 200%; animation:px-grd 4s ease infinite;
          box-shadow:0 0 28px rgba(109,40,217,.45),0 4px 16px rgba(0,0,0,.35);
          transition:all .25s cubic-bezier(.22,1,.36,1); position:relative; overflow:hidden;
        }
        .px-btn::before { content:''; position:absolute; top:0; bottom:0; left:-100%; width:50%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);
          transition:left .45s ease; }
        .px-btn:hover { transform:translateY(-2px); box-shadow:0 0 44px rgba(109,40,217,.65),0 8px 24px rgba(0,0,0,.4); }
        .px-btn:hover::before { left:180%; }
        .px-btn:active { transform:scale(.97); }
        .px-btn:disabled { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.08); color:rgba(255,255,255,.3); box-shadow:none; cursor:not-allowed; transform:none !important; animation:none; }
        .px-btn-full { width:100%; }

        /* ── Progress bar ── */
        .px-bar-track { height:6px; border-radius:99px; background:rgba(255,255,255,.06); overflow:hidden; position:relative; }
        .px-bar-fill {
          height:100%; border-radius:99px; position:relative; overflow:hidden;
          animation:px-bar .9s cubic-bezier(.22,1,.36,1) both;
        }
        .px-bar-fill::after { content:''; position:absolute; top:0; bottom:0; width:40%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
          animation:px-shi 2.8s ease-in-out infinite; }

        /* ── Grid layouts ── */
        .px-grid { display:grid; gap:16px; }
        .px-g-hero   { grid-template-columns: 1.1fr 1fr; grid-template-rows: auto; }
        .px-g-stats  { grid-template-columns: repeat(3,1fr); }
        .px-g-bottom { grid-template-columns: 1fr 1fr; }
        @media(max-width:900px) {
          .px-g-hero   { grid-template-columns:1fr; }
          .px-g-stats  { grid-template-columns:1fr 1fr; }
          .px-g-bottom { grid-template-columns:1fr; }
        }
        @media(max-width:540px) {
          .px-g-stats { grid-template-columns:1fr; }
        }
      `}</style>

      {/* ── Mesh background ── */}
      <canvas ref={bgRef} style={{ position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0 }}/>

      <div style={{ position:'relative',zIndex:1 }}>

        {showRewardModal && user && (
          <RewardModal bonusPoints={bonusPoints} userId={user.id} userEmail={user.email}
            onClose={()=>setShowRewardModal(false)}
            onRedeem={pts=>{ setBonusPoints(pts); setShowRewardModal(false); }}/>
        )}

        {/* ══ HEADER ══════════════════════════════════════════ */}
        <div style={{ marginBottom:36, animation:'px-in .5s both' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
            <div style={{ display:'inline-flex',alignItems:'center',gap:7,padding:'5px 14px',borderRadius:99,background:isSystemOnline?'rgba(167,139,250,.1)':'rgba(245,158,11,.08)',border:`1px solid ${isSystemOnline?'rgba(167,139,250,.25)':'rgba(245,158,11,.2)'}` }}>
              <span className={isSystemOnline?'px-dot':undefined} style={isSystemOnline?{}:{ width:7,height:7,borderRadius:'50%',background:'#F59E0B',display:'inline-block' }}/>
              <span style={{ fontSize:10,fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:isSystemOnline?'#c4b5fd':'#F59E0B' }}>
                {isSystemOnline?'System Online':'Maintenance'}
              </span>
            </div>
            <div style={{ fontSize:10,fontWeight:600,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(255,255,255,.18)' }}>1999X Free Fire Panel</div>
          </div>
          <h1 style={{ margin:0,lineHeight:1,marginBottom:0,fontSize:'clamp(36px,6vw,58px)',fontWeight:700,letterSpacing:'-.04em',color:'#fff' }}>
            Welcome back,{' '}
            <span style={{ background:'linear-gradient(125deg,#e0d7ff 0%,#c4b5fd 30%,#a78bfa 60%,#7c3aed 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>
              {firstName}
            </span>
          </h1>
        </div>

        {/* ══ ANNOUNCEMENTS ═══════════════════════════════════ */}
        {!annLoading && anns.length > 0 && (
          <div style={{ marginBottom:20,animation:'px-in .4s .06s both' }}>
            {isMod && (
              <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:8 }}>
                <button onClick={()=>setShowForm(!showForm)} style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:9,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',cursor:'pointer',color:'rgba(255,255,255,.45)',fontSize:11,fontFamily:'inherit',fontWeight:600 }}>
                  {showForm?<><X size={10}/>Close</>:<><Plus size={10}/>Post</>}
                </button>
              </div>
            )}
            {showForm && isMod && (
              <div style={{ padding:'16px',borderRadius:16,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',marginBottom:10 }}>
                <div style={{ display:'flex',gap:6,marginBottom:10,flexWrap:'wrap' }}>
                  {(['update','feature','maintenance'] as const).map(tp=>(
                    <button key={tp} onClick={()=>setFType(tp)} style={{ padding:'4px 12px',borderRadius:20,fontSize:10,fontWeight:700,cursor:'pointer',border:`1px solid ${fType===tp?TYPE_CFG[tp].color:TYPE_CFG[tp].border}`,background:fType===tp?TYPE_CFG[tp].bg:'transparent',color:fType===tp?TYPE_CFG[tp].color:'rgba(255,255,255,.35)',fontFamily:'inherit' }}>{tp}</button>
                  ))}
                </div>
                <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="Title…" style={{ width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:9,padding:'9px 12px',color:'#fff',fontSize:12,outline:'none',marginBottom:8,fontFamily:'inherit',boxSizing:'border-box' }}/>
                <textarea value={fContent} onChange={e=>setFContent(e.target.value)} placeholder="Content…" rows={2} style={{ width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:9,padding:'9px 12px',color:'#fff',fontSize:12,outline:'none',resize:'vertical',fontFamily:'inherit',marginBottom:10,boxSizing:'border-box' }}/>
                <button onClick={handlePublishAnn} disabled={publishing} style={{ width:'100%',padding:'10px',borderRadius:10,background:'linear-gradient(135deg,#7c3aed,#6d28d9)',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                  {publishing?<><Loader2 size={12} className="animate-spin"/>Sending…</>:<><Send size={12}/>Publish</>}
                </button>
              </div>
            )}
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {anns.map((ann,i)=>{
                const cfg=TYPE_CFG[ann.type]??TYPE_CFG.update; const exp=expandedAnn===ann.id;
                return (
                  <div key={ann.id} onClick={()=>setExpandedAnn(exp?null:ann.id)}
                    style={{ padding:'14px 16px',borderRadius:16,background:'rgba(255,255,255,.03)',border:`1px solid rgba(255,255,255,.07)`,borderLeft:`3px solid ${cfg.color}`,cursor:'pointer',transition:'all .16s',animationDelay:`${i*.04}s` }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.055)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';}}>
                    <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                      <span style={{ fontSize:14 }}>{cfg.emoji}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:13,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:exp?'normal':'nowrap' }}>{ann.title}</div>
                        {!exp&&<div style={{ fontSize:11,color:'rgba(255,255,255,.32)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:2 }}>{ann.content}</div>}
                      </div>
                      {isMod&&<button onClick={e=>{e.stopPropagation();handleDeleteAnn(ann.id);}} style={{ padding:'3px',borderRadius:5,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.18)' }} onMouseEnter={e=>e.currentTarget.style.color='#f87171'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,.18)'}><Trash2 size={10}/></button>}
                    </div>
                    {exp&&<p style={{ fontSize:12,color:'rgba(255,255,255,.45)',lineHeight:1.6,margin:'10px 0 0 24px' }}>{ann.content}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {isMod && anns.length===0 && (
          <div style={{ marginBottom:20,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-start' }}>
            <button onClick={()=>setShowForm(!showForm)} style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',cursor:'pointer',color:'rgba(255,255,255,.4)',fontSize:11,fontFamily:'inherit',fontWeight:600 }}>
              <Plus size={11}/> Post Announcement
            </button>
            {showForm&&(
              <div style={{ flex:1,display:'flex',flexDirection:'column',gap:8,padding:'14px',borderRadius:14,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',minWidth:260 }}>
                <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                  {(['update','feature','maintenance'] as const).map(tp=>(
                    <button key={tp} onClick={()=>setFType(tp)} style={{ padding:'3px 11px',borderRadius:20,fontSize:10,fontWeight:700,cursor:'pointer',border:`1px solid ${fType===tp?TYPE_CFG[tp].color:TYPE_CFG[tp].border}`,background:fType===tp?TYPE_CFG[tp].bg:'transparent',color:fType===tp?TYPE_CFG[tp].color:'rgba(255,255,255,.32)',fontFamily:'inherit' }}>{tp}</button>
                  ))}
                </div>
                <input value={fTitle} onChange={e=>setFTitle(e.target.value)} placeholder="Title…" style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:8,padding:'8px 11px',color:'#fff',fontSize:12,outline:'none',fontFamily:'inherit' }}/>
                <textarea value={fContent} onChange={e=>setFContent(e.target.value)} placeholder="Content…" rows={2} style={{ background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:8,padding:'8px 11px',color:'#fff',fontSize:12,outline:'none',resize:'vertical',fontFamily:'inherit' }}/>
                <button onClick={handlePublishAnn} disabled={publishing} style={{ padding:'9px',borderRadius:9,background:'linear-gradient(135deg,#7c3aed,#6d28d9)',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                  {publishing?<><Loader2 size={11} className="animate-spin"/>Sending…</>:<><Send size={11}/>Publish</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ ROW 1: HERO LEFT + STATS RIGHT ═══════════════════ */}
        <div className="px-grid px-g-hero" style={{ marginBottom:16 }}>

          {/* ─── BALANCE HERO PANEL ─── */}
          <div className="px-panel" style={{ animationDelay:'0ms' }}>
            {/* Purple radial glow */}
            <div className="px-panel-glow" style={{ background:'radial-gradient(ellipse at 20% 0%, rgba(124,92,255,.28) 0%, transparent 55%)' }}/>
            {/* Floating orbs */}
            <div style={{ position:'absolute',top:-20,right:-20,width:160,height:160,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 70%)',animation:'px-orb 9s ease-in-out infinite',pointerEvents:'none' }}/>
            <div style={{ position:'absolute',bottom:-30,left:30,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(196,181,253,.08) 0%,transparent 70%)',animation:'px-orb 12s ease-in-out infinite reverse',pointerEvents:'none' }}/>

            <div className="px-label" style={{ marginBottom:14,position:'relative' }}>Available Balance</div>

            {/* Arc gauge + number */}
            <div style={{ display:'flex',alignItems:'center',gap:28,marginBottom:24,position:'relative' }}>
              {/* SVG Arc */}
              <div style={{ position:'relative',flexShrink:0 }}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  {/* Outer ring */}
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="8"/>
                  {/* Glow track */}
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(124,92,255,.15)" strokeWidth="10"
                    strokeDasharray={`${ARC} ${ARC}`} strokeDashoffset={ARC-arcDash+6}
                    strokeLinecap="round" transform="rotate(-90 60 60)"/>
                  {/* Main arc */}
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke="url(#arcGrad)" strokeWidth="7"
                    strokeDasharray={`${ARC} ${ARC}`} strokeDashoffset={ARC-arcDash}
                    strokeLinecap="round" transform="rotate(-90 60 60)"
                    style={{ filter:'drop-shadow(0 0 8px rgba(167,139,250,.9))' }}/>
                  {/* Tip glow */}
                  {arcDash > 5 && (() => {
                    const angle = (-Math.PI/2) + (arcDash/ARC)*Math.PI*2;
                    return <circle cx={60+50*Math.cos(angle)} cy={60+50*Math.sin(angle)} r="5" fill="#c4b5fd" style={{ filter:'drop-shadow(0 0 8px #a78bfa)' }}/>;
                  })()}
                  <defs>
                    <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#c4b5fd"/>
                      <stop offset="100%" stopColor="#7c3aed"/>
                    </linearGradient>
                  </defs>
                </svg>
                {/* Inner wallet icon */}
                <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Wallet size={22} color="rgba(167,139,250,.6)"/>
                </div>
              </div>
              {/* Amount */}
              <div>
                <div style={{ fontSize:'clamp(40px,5vw,56px)',fontWeight:700,color:'#fff',letterSpacing:'-.05em',lineHeight:1,marginBottom:4 }}>
                  ${balance.toFixed(2)}
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                  <span className="px-dot" style={{ width:6,height:6 }}/>
                  <span style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600 }}>Active Account</span>
                </div>
              </div>
            </div>

            {/* Sub-metrics */}
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,position:'relative' }}>
              {[
                { label:'Active Keys', val:active.length, col:'#c4b5fd', bg:'rgba(196,181,253,.07)', bc:'rgba(196,181,253,.15)' },
                { label:'Bonus Pts',   val:bonusPoints,   col:'#a78bfa', bg:'rgba(167,139,250,.07)', bc:'rgba(167,139,250,.15)' },
              ].map(s=>(
                <div key={s.label} style={{ padding:'14px 16px',borderRadius:16,background:s.bg,border:`1px solid ${s.bc}`,position:'relative',overflow:'hidden' }}>
                  <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${s.col}40,transparent)` }}/>
                  <div className="px-label" style={{ marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:30,fontWeight:700,color:s.col,letterSpacing:'-.04em',lineHeight:1 }}>
                    <CountUp to={s.val}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── STAT PANELS (right col) ─── */}
          <div style={{ display:'flex',flexDirection:'column',gap:16 }}>

            {/* Total Users */}
            <div className="px-panel" style={{ flex:1,animationDelay:'80ms' }}>
              <div className="px-panel-glow" style={{ background:'radial-gradient(circle at 90% 10%,rgba(124,92,255,.18) 0%,transparent 60%)' }}/>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10 }}>
                <div className="px-label">Total Users</div>
                <div style={{ width:36,height:36,borderRadius:11,background:'rgba(124,92,255,.1)',border:'1px solid rgba(124,92,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Users size={16} color="#a78bfa"/>
                </div>
              </div>
              <div className="px-num px-num-violet" style={{ fontSize:'clamp(36px,4vw,48px)' }}>
                {statsLoading?'—':<><CountUp to={totalUsers}/><span style={{ fontSize:22,fontWeight:400 }}>+</span></>}
              </div>
              <div style={{ fontSize:11,color:'rgba(255,255,255,.28)',marginTop:5,fontWeight:500 }}>Registered accounts</div>
            </div>

            {/* Live Playing */}
            <div className="px-panel" style={{ flex:1,animationDelay:'160ms' }}>
              <div className="px-panel-glow" style={{ background:'radial-gradient(circle at 90% 10%,rgba(167,139,250,.16) 0%,transparent 60%)' }}/>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10 }}>
                <div className="px-label">Live Playing</div>
                <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                  <span className="px-dot"/>
                  <div style={{ width:36,height:36,borderRadius:11,background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <Activity size={16} color="#c4b5fd"/>
                  </div>
                </div>
              </div>
              <div className="px-num" style={{ fontSize:'clamp(36px,4vw,48px)' }}>
                {statsLoading?'—':<CountUp to={totalOnline}/>}
              </div>
              <div style={{ fontSize:11,color:'rgba(255,255,255,.28)',marginTop:5,fontWeight:500 }}>Active sessions now</div>
            </div>

            {/* Antiban */}
            <div className="px-panel" style={{ flex:1,animationDelay:'240ms' }}>
              <div className="px-panel-glow" style={{ background:'radial-gradient(circle at 90% 10%,rgba(167,139,250,.12) 0%,transparent 60%)' }}/>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10 }}>
                <div className="px-label">Antiban OB52</div>
                <div style={{ width:36,height:36,borderRadius:11,background:'rgba(167,139,250,.08)',border:'1px solid rgba(167,139,250,.18)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <Shield size={16} color="#a78bfa"/>
                </div>
              </div>
              <div style={{ fontSize:28,fontWeight:700,letterSpacing:'-.03em',lineHeight:1,background:'linear-gradient(125deg,#e0d7ff,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>
                Protected
              </div>
              <div style={{ fontSize:11,color:'rgba(255,255,255,.28)',marginTop:5,fontWeight:500 }}>Fully undetected</div>
            </div>
          </div>
        </div>

        {/* ══ ROW 2: DAILY BONUS + FREE TRIAL ═════════════════ */}
        <div className="px-grid px-g-bottom">

          {/* ─── DAILY BONUS ─── */}
          <div className="px-panel" style={{ animationDelay:'320ms' }}>
            <div className="px-panel-glow" style={{ background:'radial-gradient(ellipse at 10% 0%,rgba(124,92,255,.24) 0%,transparent 55%)' }}/>
            <div style={{ position:'absolute',top:-30,right:-20,width:140,height:140,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,.1) 0%,transparent 70%)',animation:'px-orb 8s ease-in-out infinite',pointerEvents:'none' }}/>

            {/* Header */}
            <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22,position:'relative' }}>
              <div>
                <div className="px-label" style={{ marginBottom:6 }}>Daily Bonus</div>
                <div style={{ fontSize:22,fontWeight:700,color:'#fff',letterSpacing:'-.02em',lineHeight:1 }}>Earn &amp; Reward</div>
                <div style={{ fontSize:11,color:'rgba(255,255,255,.3)',marginTop:4 }}>+10 pts every 24 hours</div>
              </div>
              <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8 }}>
                <div style={{ width:44,height:44,borderRadius:14,background:'linear-gradient(135deg,rgba(124,92,255,.2),rgba(109,40,217,.08))',border:'1px solid rgba(124,92,255,.28)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 18px rgba(109,40,217,.2)' }}>
                  <Gift size={20} color="#a78bfa"/>
                </div>
                {bonusPoints>=100 && (
                  <button onClick={()=>setShowRewardModal(true)}
                    style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:10,background:'rgba(167,139,250,.12)',border:'1px solid rgba(167,139,250,.28)',cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:700,color:'#c4b5fd',transition:'all .15s',whiteSpace:'nowrap' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(167,139,250,.2)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(167,139,250,.12)';}}>
                    <Star size={10}/> Redeem
                  </button>
                )}
              </div>
            </div>

            {/* Points display */}
            <div style={{ marginBottom:18,position:'relative' }}>
              <div style={{ display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:10 }}>
                <div style={{ display:'flex',alignItems:'baseline',gap:6 }}>
                  <span style={{ fontSize:56,fontWeight:700,color:'#fff',letterSpacing:'-.06em',lineHeight:1 }}>{bonusPoints}</span>
                  <span style={{ fontSize:16,color:'rgba(255,255,255,.28)',fontWeight:600 }}>pts</span>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11,color:'rgba(255,255,255,.22)',fontWeight:600 }}>{progressPct}/100</div>
                  {bonusPoints>=100 && <div style={{ fontSize:10,color:'#c4b5fd',fontWeight:700,marginTop:2 }}>🎁 Ready!</div>}
                </div>
              </div>
              {/* Bar */}
              <div className="px-bar-track">
                <div className="px-bar-fill" style={{
                  background:'linear-gradient(90deg,#7c3aed,#a78bfa,#c4b5fd)',
                  boxShadow:'0 0 14px rgba(139,92,246,.55)',
                  '--bw':`${Math.min(progressPct===0&&bonusPoints>=100?100:progressPct,100)}%`
                } as any}/>
              </div>
            </div>

            {/* Claim button */}
            <button onClick={handleClaimBonus} disabled={!canClaimBonus||claimingBonus} className="px-btn px-btn-full">
              {claimingBonus
                ? <><Loader2 size={14} className="animate-spin"/>Claiming…</>
                : canClaimBonus
                  ? <><Sparkles size={14}/>Claim +10 Points</>
                  : <><Clock size={13}/>{bonusCooldown}</>}
            </button>
          </div>

          {/* ─── FREE TRIAL ─── */}
          <FreeKeyCard animDelay={400}/>

        </div>
      </div>
    </div>
  );
}
