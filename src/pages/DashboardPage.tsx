import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity, notifyAll, sendNotificationEmail } from '@/lib/activity';
import {
  Gift, Clock, Zap, Copy, CheckCircle, Eye, EyeOff,
  Loader2, Sparkles, Send, X, Plus, Trash2,
  Users, Activity, Shield, Star, ChevronDown
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { canManageAnnouncements } from '@/lib/roles';
import { isOwner } from '@/lib/roles';
import { safeFetch } from '@/lib/safeFetch';

const SUPA_URL = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';
const BONUS_COOLDOWN = 86400000;
const FREE_KEY_COOLDOWN = 86400000; // 24 hours
const FREE_KEY_TTL = 18000000; // 5 hours in ms

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
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || ANON;
    const res = await fetch(`${SUPA_URL}/functions/v1/generate-key`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}`, apikey:ANON }, body:JSON.stringify({ panel_type:panelType, days }) });
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
                { fn:claimBalance, icon:'💰', label:'$3 Balance', sub:'Instantly added to wallet', bg:'rgba(124,92,255,0.06)', bgHover:'rgba(124,92,255,0.12)', border:'rgba(124,92,255,0.22)', col:'#a78bfa' },
                { fn:claimKey,     icon:'🔑', label:'3-Day Key',  sub:'Free panel license key',  bg:'rgba(255,255,255,0.06)', bgHover:'rgba(255,255,255,0.12)', border:'rgba(255,255,255,0.1)', col:'#fff' },
              ].map((opt,i)=>(
                <button key={i} onClick={opt.fn} disabled={loading&&i===1}
                  style={{ padding:'18px 20px',borderRadius:16,background:opt.bg,border:`1px solid ${opt.border}`,cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .2s',fontFamily:'inherit',textAlign:'left' }}
                  onMouseEnter={e=>{e.currentTarget.style.background=opt.bgHover;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=opt.bg;}}>
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

/* ─── FREE KEY CARD ROW ─────────────────────────────────────── */
function FreeKeyCard({ animDelay }: { animDelay: number }) {
  const { user, addLicense } = useAppStore();
  const [row, setRow] = useState<FreeRow|null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [panelEnabled, setPanelEnabled] = useState<boolean>(true);
  const [togglingPanel, setTogglingPanel] = useState(false);
  const userIsOwner = isOwner(user?.role);

  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'free_trial_enabled').maybeSingle()
      .then(({ data }) => {
        if (data) setPanelEnabled(data.value !== 'false' && data.value !== false);
      });
  }, []);

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

  const togglePanel = async () => {
    if (!userIsOwner || togglingPanel) return;
    setTogglingPanel(true);
    const newVal = !panelEnabled;
    const { error } = await supabase.from('system_settings').upsert({ key:'free_trial_enabled', value: String(newVal), updated_at: new Date().toISOString() },{ onConflict:'key' });
    if (error) toast.error('Failed to update status');
    else { setPanelEnabled(newVal); toast.success(newVal?'Trial running!':'Trial stopped!'); }
    setTogglingPanel(false);
  };

  const handleClaim = async () => {
    if (!canClaim||generating||!user||!panelEnabled) return;
    setGenerating(true); toast.loading('Generating trial…', { id:'free-trial' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || ANON;
      
      const { ip } = await fetch('https://api.ipify.org?format=json').then(r=>r.json()).catch(()=>({ip:''}));
      
      const [lagRes, intRes] = await Promise.all([
        fetch(`${SUPA_URL}/functions/v1/generate-key`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,apikey:ANON},body:JSON.stringify({panel_type:'lag',days:0,hours:5.1,mask:'1999X-FREE-****',is_free:true,price:0,ip:ip||''})}).then(r=>r.json()),
        fetch(`${SUPA_URL}/functions/v1/generate-key`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,apikey:ANON},body:JSON.stringify({panel_type:'internal',days:0,hours:5.1,mask:'1999X-FREE-****',is_free:true,price:0,ip:ip||''})}).then(r=>r.json()),
      ]);
      const lagKey = lagRes?.success?lagRes.key:null;
      const intKey = intRes?.success?intRes.key:null;
      if (!lagKey&&!intKey) { toast.dismiss('free-trial'); toast.error('Generation Failed'); setGenerating(false); return; }
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now()+FREE_KEY_TTL).toISOString();
      const { error } = await supabase.from('free_trial_keys').upsert({ user_id:user.id,user_email:user.email,lag_key:lagKey,internal_key:intKey,claimed_at:now,expires_at:expiresAt },{ onConflict:'user_id' });
      if (error) { toast.dismiss('free-trial'); toast.error(error.message); setGenerating(false); return; }
      
      const licRows: any[] = [];
      if (lagKey) { addLicense({ id:`free_lag_${Date.now()}`,productId:'keyauth-lag',productName:'Fake Lag (Free Trial)',key:lagKey,hwid:'',lastLogin:now,expiresAt,status:'active',ip:ip||'',device:'',hwidResetsUsed:0,hwidResetMonth:new Date().getMonth() }); licRows.push({ user_id:user.id,user_email:user.email,product_id:'keyauth-lag',product_name:'Fake Lag (Free Trial)',license_key:lagKey,keyauth_username:lagKey,hwid:'',last_login:now,expires_at:expiresAt,status:'active',ip:ip||'',device:'',hwid_resets_used:0,hwid_reset_month:new Date().getMonth() }); }
      if (intKey) { addLicense({ id:`free_int_${Date.now()}`,productId:'keyauth-internal',productName:'Internal (Free Trial)',key:`${intKey}_INTERNAL`,hwid:'',lastLogin:now,expiresAt,status:'active',ip:ip||'',device:'',hwidResetsUsed:0,hwidResetMonth:new Date().getMonth() }); licRows.push({ user_id:user.id,user_email:user.email,product_id:'keyauth-internal',product_name:'Internal (Free Trial)',license_key:`${intKey}_INTERNAL`,keyauth_username:intKey,hwid:'',last_login:now,expires_at:expiresAt,status:'active',ip:ip||'',device:'',hwid_resets_used:0,hwid_reset_month:new Date().getMonth() }); }
      if (licRows.length > 0) await supabase.from('user_licenses').upsert(licRows, { onConflict:'user_id,license_key' });
      
      setRow({ lag_key:lagKey,internal_key:intKey,claimed_at:now,expires_at:expiresAt });
      toast.dismiss('free-trial'); toast.success('Trial activated!');
      setExpanded(true); // auto-expand to show keys
    } catch(e) { toast.dismiss('free-trial'); toast.error(String(e)); }
    setGenerating(false);
  };

  if (dbLoading) return null;
  const isActive = !!row && new Date(row.expires_at).getTime()>Date.now();

  return (
    <div style={{ background:'rgba(255,255,255,0.02)', borderRadius:16, border:'1px solid rgba(255,255,255,0.04)', overflow:'hidden', transition:'all .3s', animation:`px-fade-in .5s ease-out`, animationDelay:`${animDelay}ms`, animationFillMode:'both' }}>
      <div onClick={() => setExpanded(!expanded)} style={{ padding:20, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'rgba(167,139,250,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#c4b5fd' }}>
            <Zap size={24}/>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:4 }}>Premium Free Trial</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>5-Hour Access • Internal + Fake Lag</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          {!panelEnabled && !userIsOwner ? <span style={{ color:'#f87171', fontSize:13, fontWeight:700 }}>Paused</span>
          : isActive && row ? <span style={{ color:'#4ade80', fontSize:13, fontWeight:700 }}>Active - <LiveClock ms={new Date(row.expires_at).getTime()}/></span>
          : canClaim ? <span style={{ color:'#c4b5fd', fontSize:13, fontWeight:700 }}>Ready to claim</span>
          : <span style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}><Clock size={12} style={{display:'inline',marginRight:4,verticalAlign:'-2px'}}/>Next in <LiveClock ms={cooldownMs}/></span>}
          <ChevronDown size={20} color="rgba(255,255,255,0.3)" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition:'all .3s' }}/>
        </div>
      </div>

      {expanded && (
        <div style={{ padding:'0 20px 20px', borderTop:'1px solid rgba(255,255,255,0.05)', marginTop:4, paddingTop:24 }}>
          {isActive && row ? (
            <div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:12, fontWeight:500 }}>Your active premium keys:</div>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                {row.lag_key && (
                  <div style={{ flex:1, minWidth:200, padding:16, borderRadius:12, background:'rgba(236,72,153,0.05)', border:'1px solid rgba(236,72,153,0.2)' }}>
                    <div style={{ fontSize:12, color:'rgba(236,72,153,0.8)', fontWeight:700, marginBottom:8 }}>Fake Lag License</div>
                    <code style={{ fontSize:14, color:'#fff', fontFamily:'monospace' }}>{row.lag_key}</code>
                  </div>
                )}
                {row.internal_key && (
                  <div style={{ flex:1, minWidth:200, padding:16, borderRadius:12, background:'rgba(139,92,246,0.05)', border:'1px solid rgba(139,92,246,0.2)' }}>
                    <div style={{ fontSize:12, color:'rgba(139,92,246,0.8)', fontWeight:700, marginBottom:8 }}>Internal License</div>
                    <code style={{ fontSize:14, color:'#fff', fontFamily:'monospace' }}>{row.internal_key}</code>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button onClick={handleClaim} disabled={!canClaim||generating||!panelEnabled}
                className="px-btn" style={{ flex:'none', padding:'12px 24px', borderRadius:12, background:canClaim&&panelEnabled?'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(124,92,255,0.2))':'rgba(255,255,255,0.05)', color:canClaim&&panelEnabled?'#c4b5fd':'rgba(255,255,255,0.4)', border:`1px solid ${canClaim&&panelEnabled?'rgba(167,139,250,0.4)':'rgba(255,255,255,0.1)'}`, fontWeight:700, cursor:canClaim&&panelEnabled?'pointer':'not-allowed' }}>
                {generating ? <><Loader2 size={16} className="animate-spin" style={{marginRight:8,display:'inline',verticalAlign:'-3px'}}/>Generating...</>
                  : canClaim && panelEnabled ? <><Zap size={16} style={{marginRight:8,display:'inline',verticalAlign:'-3px'}}/> Claim Free Trial</>
                  : !panelEnabled ? 'Unavailable' : 'Wait for Cooldown'}
              </button>
              {userIsOwner && (
                <button onClick={togglePanel} disabled={togglingPanel}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 24px', borderRadius:12, background:'transparent', border:`1px solid ${panelEnabled?'rgba(239,68,68,.3)':'rgba(34,197,94,.3)'}`, color:panelEnabled?'#f87171':'#4ade80', fontWeight:700, cursor:'pointer' }}>
                  {togglingPanel ? <Loader2 size={16} className="animate-spin"/> : panelEnabled?'Pause Trial':'Resume Trial'}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}



export default function DashboardPage() {
  const { t, i18n } = useTranslation();
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
  const [bonusExpanded, setBonusExpanded] = useState(false);
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
    <div style={{ position:'relative', paddingBottom:100, fontFamily:"'Inter',system-ui,sans-serif", minHeight:'100%' }}>

      <style>{`
        @keyframes px-in   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:none} }
        @keyframes px-orb  { 0%,100%{transform:translate(0,0)}  40%{transform:translate(22px,-18px)}  70%{transform:translate(-16px,12px)} }
        @keyframes px-grd  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes px-bar  { from{width:0} to{width:var(--bw)} }
        @keyframes px-shi  { 0%{transform:translateX(-120%)} 100%{transform:translateX(240%)} }
        @keyframes px-spin { to{transform:rotate(360deg)} }
        @keyframes px-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes px-float-slow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes px-glow-pulse { 0%,100%{opacity:0.4; transform:scale(1)} 50%{opacity:0.8; transform:scale(1.05)} }

        /* ── GREEN live dot ── */
        @keyframes px-live-ring {
          0%   { box-shadow: 0 0 0 0   rgba(34,197,94,.55), 0 0 8px  rgba(34,197,94,.4); }
          60%  { box-shadow: 0 0 0 6px rgba(34,197,94,0),   0 0 16px rgba(34,197,94,.7); }
          100% { box-shadow: 0 0 0 6px rgba(34,197,94,0),   0 0 8px  rgba(34,197,94,.4); }
        }
        .px-live-dot {
          width:10px; height:10px; border-radius:50%;
          background: radial-gradient(circle at 35% 35%, #4ade80, #16a34a);
          animation: px-live-ring 1.8s ease-in-out infinite;
          flex-shrink:0; display:inline-block;
        }

        /* ── Panel base ── */
        .px-panel {
          position:relative; overflow:hidden;
          background: rgba(255,255,255,.032);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 28px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          padding: 28px;
          animation: px-in .65s cubic-bezier(.22,1,.36,1) both;
          transition: border-color .28s, box-shadow .28s, transform .32s cubic-bezier(.22,1,.36,1);
        }
        .px-panel::after {
          content:''; position:absolute; inset:0; border-radius:28px; pointer-events:none;
          background: linear-gradient(145deg, rgba(255,255,255,.06) 0%, transparent 50%);
        }
        .px-panel:hover {
          border-color: rgba(167,139,250,.3);
          transform: translateY(-5px);
          box-shadow: 0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(139,92,246,.15), 0 0 60px rgba(109,40,217,.14);
        }
        .px-glow { position:absolute; inset:0; pointer-events:none; transition:opacity .3s; }
        .px-panel:hover .px-glow { opacity:1 !important; }

        /* ── Stat card with coloured top border ── */
        .px-stat-card {
          border-radius:22px; padding:22px 20px; position:relative; overflow:hidden;
          transition: transform .28s cubic-bezier(.22,1,.36,1), box-shadow .28s;
        }
        .px-stat-card:hover { transform:translateY(-4px); }

        /* ── Labels ── */
        .px-lbl { font-size:10px; font-weight:600; letter-spacing:.15em; text-transform:uppercase; color:rgba(255,255,255,.38); }

        /* ── Buttons ── */
        .px-btn {
          display:inline-flex; align-items:center; justify-content:center; gap:8px;
          padding:14px 28px; border-radius:15px; border:none; cursor:pointer;
          font-family:inherit; font-size:13px; font-weight:700; color:#fff;
          background: linear-gradient(135deg,#7c3aed,#6d28d9,#4c1d95);
          background-size:200% 200%; animation:px-grd 4s ease infinite;
          box-shadow: 0 0 28px rgba(109,40,217,.45), 0 4px 16px rgba(0,0,0,.3);
          transition: all .25s cubic-bezier(.22,1,.36,1); position:relative; overflow:hidden;
        }
        .px-btn::before { content:''; position:absolute; top:0; bottom:0; left:-110%; width:50%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);
          transition:left .45s ease; }
        .px-btn:hover { transform:translateY(-2px); box-shadow:0 0 44px rgba(109,40,217,.65),0 8px 24px rgba(0,0,0,.4); }
        .px-btn:hover::before { left:180%; }
        .px-btn:disabled { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.09); color:rgba(255,255,255,.3); box-shadow:none; cursor:not-allowed; transform:none!important; animation:none; }
        .px-btn-full { width:100%; }

        /* ── Progress bar ── */
        .px-bar-bg { height:7px; border-radius:99px; background:rgba(255,255,255,.07); overflow:hidden; }
        .px-bar    { height:100%; border-radius:99px; animation:px-bar 1s cubic-bezier(.22,1,.36,1) both; position:relative; overflow:hidden; }
        .px-bar::after { content:''; position:absolute; top:0; bottom:0; width:40%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);
          animation:px-shi 2.6s ease-in-out infinite; }

        /* ── Grids ── */
        .px-grid  { display:grid; gap:16px; }
        .px-top   { grid-template-columns: 1.2fr 1fr 1fr; align-items:start; }
        .px-bot   { grid-template-columns: 1fr; }
        @media(max-width:900px) { .px-top { grid-template-columns:1fr 1fr; } }
        @media(max-width:540px) { .px-top { grid-template-columns:1fr; } }
      `}</style>

      {/* Mesh bg */}
      <canvas ref={bgRef} style={{ position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0 }}/>

      <div style={{ position:'relative', zIndex:1 }}>

        {showRewardModal && user && (
          <RewardModal bonusPoints={bonusPoints} userId={user.id} userEmail={user.email}
            onClose={()=>setShowRewardModal(false)}
            onRedeem={pts=>{ setBonusPoints(pts); setShowRewardModal(false); }}/>
        )}

        {/* ══ HEADER ══ */}
        <div style={{ marginBottom:40, animation:'px-in .5s both' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'5px 14px', borderRadius:99,
              background: isSystemOnline ? 'rgba(34,197,94,.08)' : 'rgba(245,158,11,.08)',
              border: `1px solid ${isSystemOnline ? 'rgba(34,197,94,.25)' : 'rgba(245,158,11,.2)'}` }}>
              {isSystemOnline
                ? <span className="px-live-dot" style={{ width:7, height:7 }}/>
                : <span style={{ width:7,height:7,borderRadius:'50%',background:'#F59E0B',display:'inline-block',flexShrink:0 }}/>}
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase',
                color: isSystemOnline ? '#4ade80' : '#F59E0B' }}>
                {isSystemOnline ? t('status.allOps',t('status.allOps','System Online')) : t('status.maintenance',t('status.maintenance','Maintenance'))}
              </span>
            </div>
            <span style={{ fontSize:10, fontWeight:600, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.18)' }}>
              1999X Free Fire Panel
            </span>
          </div>
          <h1 style={{ margin:0, fontSize:'clamp(34px,5.5vw,56px)', fontWeight:700, letterSpacing:'-.04em', lineHeight:1.05, color:'#fff' }}>
            Welcome back,{' '}
            <span style={{ background:'linear-gradient(120deg,#e0d7ff 0%,#c4b5fd 35%,#a78bfa 65%,#7c3aed 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              {firstName}
            </span>
          </h1>
        </div>

        {/* ══ ANNOUNCEMENTS ══ */}
        {!annLoading && anns.length > 0 && (
          <div style={{ marginBottom:22, animation:'px-in .4s .06s both' }}>
            {isMod && (
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
                <button onClick={()=>setShowForm(!showForm)}
                  style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:9,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',cursor:'pointer',color:'rgba(255,255,255,.45)',fontSize:11,fontFamily:'inherit',fontWeight:600 }}>
                  {showForm ? <><X size={10}/>Close</> : <><Plus size={10}/>Post</>}
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
                  {publishing ? <><Loader2 size={12} className="animate-spin"/>Sending…</> : <><Send size={12}/>Publish</>}
                </button>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {anns.map((ann,i)=>{
                const cfg=TYPE_CFG[ann.type]??TYPE_CFG.update; const exp=expandedAnn===ann.id;
                return (
                  <div key={ann.id} onClick={()=>setExpandedAnn(exp?null:ann.id)}
                    style={{ padding:'14px 16px',borderRadius:16,background:'rgba(255,255,255,.03)',border:`1px solid rgba(255,255,255,.07)`,borderLeft:`3px solid ${cfg.color}`,cursor:'pointer',transition:'all .16s' }}
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
          <div style={{ marginBottom:20, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-start' }}>
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
                  {publishing ? <><Loader2 size={11} className="animate-spin"/>Sending…</> : <><Send size={11}/>Publish</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ TOP ROW: Balance · Total Users · Live Playing ══ */}
        <div className="px-grid px-top" style={{ marginBottom:18 }}>

          {/* ── BALANCE CARD ── */}
          <div className="px-panel" style={{ animationDelay:'0ms' }}>
            <div className="px-glow" style={{ opacity:.7, background:'radial-gradient(ellipse at 0% 60%, rgba(124,92,255,.22) 0%, transparent 65%)' }}/>
            <div style={{ position:'absolute',top:-50,right:-40,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,.1) 0%,transparent 65%)',animation:'px-orb 11s ease-in-out infinite',pointerEvents:'none' }}/>
            <div style={{ position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <span className="px-lbl">Available Balance</span>
                <div style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:99,background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)' }}>
                  <span className="px-live-dot" style={{ width:5,height:5, background:'radial-gradient(circle,#a78bfa,#7c3aed)', animationName:'px-live-ring', '--glow1':'rgba(167,139,250,.5)', '--glow2':'rgba(139,92,246,.7)' } as any}/>
                  <span style={{ fontSize:9,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#c4b5fd' }}>Active</span>
                </div>
              </div>
              <div style={{ fontSize:'clamp(36px,4.5vw,48px)', fontWeight:700, color:'#fff', letterSpacing:'-.05em', lineHeight:1, marginBottom:6 }}>
                ${balance.toFixed(2)}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', marginBottom:24 }}>Wallet balance</div>
              <div style={{ height:1, background:'linear-gradient(90deg,rgba(167,139,250,.2),rgba(167,139,250,.05))', marginBottom:20 }}/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1px 1fr', alignItems:'center' }}>
                <div>
                  <div className="px-lbl" style={{ marginBottom:6 }}>Active Keys</div>
                  <div style={{ fontSize:28, fontWeight:700, color:'#c4b5fd', letterSpacing:'-.04em', lineHeight:1 }}>
                    <CountUp to={active.length}/>
                  </div>
                </div>
                <div style={{ width:1, height:38, background:'rgba(255,255,255,.07)' }}/>
                <div style={{ paddingLeft:16 }}>
                  <div className="px-lbl" style={{ marginBottom:6 }}>Bonus Points</div>
                  <div style={{ fontSize:28, fontWeight:700, color:'#a78bfa', letterSpacing:'-.04em', lineHeight:1 }}>
                    <CountUp to={bonusPoints}/>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── TOTAL USERS ── */}
          <div className="px-panel" style={{ animationDelay:'90ms' }}>
            <div className="px-glow" style={{ opacity:.6, background:'radial-gradient(ellipse at 100% 0%, rgba(124,92,255,.25) 0%, transparent 60%)' }}/>
            <div style={{ position:'absolute',bottom:-30,left:-20,width:160,height:160,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,92,255,.07) 0%,transparent 70%)',animation:'px-orb 13s ease-in-out infinite reverse',pointerEvents:'none' }}/>
            <div style={{ position:'relative' }}>
              {/* Top bar */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                <span className="px-lbl">Total Users</span>
                <div style={{ width:40,height:40,borderRadius:13,background:'linear-gradient(135deg,rgba(124,92,255,.2),rgba(109,40,217,.06))',border:'1px solid rgba(124,92,255,.22)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 16px rgba(109,40,217,.18)' }}>
                  <Users size={18} color="#a78bfa"/>
                </div>
              </div>
              {/* Big number */}
              <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:8, overflow:'visible', paddingBottom:4 }}>
                <span style={{ fontSize:'clamp(44px,5vw,58px)', fontWeight:700, letterSpacing:'-.05em', lineHeight:1.1,
                  background:'linear-gradient(135deg,#fff 0%,rgba(196,181,253,.9) 100%)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', display:'block' }}>
                  {statsLoading ? '—' : <CountUp to={totalUsers}/>}
                </span>
                {!statsLoading && <span style={{ fontSize:20, fontWeight:500, color:'rgba(196,181,253,.6)', letterSpacing:'-.02em', flexShrink:0 }}>+</span>}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', fontWeight:500 }}>Registered accounts</div>
              {/* Mini bar decoration */}
              <div style={{ marginTop:20, height:3, borderRadius:99, background:'rgba(255,255,255,.06)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:'72%', borderRadius:99, background:'linear-gradient(90deg,#7c3aed,#a78bfa)', boxShadow:'0 0 10px rgba(139,92,246,.5)', animation:'px-bar 1.2s .3s cubic-bezier(.22,1,.36,1) both', '--bw':'72%' } as any}/>
              </div>
            </div>
          </div>

          {/* ── LIVE PLAYING ── */}
          <div className="px-panel" style={{ animationDelay:'180ms', borderColor:'rgba(34,197,94,.15)' }}>
            <div className="px-glow" style={{ opacity:.7, background:'radial-gradient(ellipse at 100% 0%, rgba(34,197,94,.14) 0%, transparent 60%)' }}/>
            {/* Top glow line — green */}
            <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(34,197,94,.4),transparent)',pointerEvents:'none' }}/>
            <div style={{ position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                <span className="px-lbl">Live Playing</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {/* Live badge */}
                  <div style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:99,background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.25)' }}>
                    <span className="px-live-dot"/>
                    <span style={{ fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#4ade80' }}>Live</span>
                  </div>
                  <div style={{ width:40,height:40,borderRadius:13,background:'linear-gradient(135deg,rgba(34,197,94,.15),rgba(22,163,74,.04))',border:'1px solid rgba(34,197,94,.2)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 16px rgba(34,197,94,.14)' }}>
                    <Activity size={18} color="#4ade80"/>
                  </div>
                </div>
              </div>
              {/* Number */}
              <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:8, overflow:'visible', paddingBottom:4 }}>
                <span style={{ fontSize:'clamp(44px,5vw,58px)', fontWeight:700, letterSpacing:'-.05em', lineHeight:1.1,
                  background:'linear-gradient(135deg,#fff 0%,rgba(134,239,172,.85) 100%)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', display:'block' }}>
                  {statsLoading ? '—' : <CountUp to={totalOnline}/>}
                </span>
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', fontWeight:500 }}>Active sessions now</div>
              {/* Mini green bar */}
              <div style={{ marginTop:20, height:3, borderRadius:99, background:'rgba(255,255,255,.06)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:'58%', borderRadius:99, background:'linear-gradient(90deg,#16a34a,#4ade80)', boxShadow:'0 0 10px rgba(34,197,94,.5)', animation:'px-bar 1.2s .5s cubic-bezier(.22,1,.36,1) both', '--bw':'58%' } as any}/>
              </div>
            </div>
          </div>
        </div>



        {/* ══ BOTTOM: Daily Bonus · Free Trial — stacked full width ══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* ── DAILY BONUS SaaS PREMIUM ── */}
          <div style={{ animation: `px-in .65s cubic-bezier(.22,1,.36,1) both, px-float-slow 8s ease-in-out infinite`, animationDelay:`340ms, 0s`, position:'relative', borderRadius:32, background:'linear-gradient(145deg, rgba(20,5,50,0.8), rgba(10,5,20,0.9))', border:'1px solid rgba(167,139,250,0.3)', padding:40, overflow:'hidden', boxShadow:'0 30px 60px rgba(0,0,0,0.6), 0 0 100px rgba(139,92,246,0.1) inset' }}>
            <div style={{ position:'absolute', top:'-30%', left:'30%', width:'50%', height:'50%', background:'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)', animation:'px-glow-pulse 8s ease-in-out infinite', pointerEvents:'none' }}/>

            {/* Top row: label + redeem button */}
            <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:30 }}>
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:56, height:56, borderRadius:20, background:'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(109,40,217,0.2))', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 10px 30px rgba(167,139,250,0.2)' }}>
                  <Gift size={28} color="#c4b5fd"/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.9)', marginBottom:4 }}>💎 Daily Bonus</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.4)' }}>Claim +10 Points Every 24h</div>
                </div>
              </div>
              {bonusPoints>=100 && (
                <button onClick={()=>setShowRewardModal(true)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 24px', borderRadius:16, background:'linear-gradient(135deg,rgba(167,139,250,.2),rgba(124,92,255,.1))', border:`1px solid rgba(167,139,250,.4)`, cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:800, color:'#c4b5fd', boxShadow:'0 0 30px rgba(139,92,246,.25)', transition:'all .2s' }}
                  onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.boxShadow='0 0 40px rgba(139,92,246,.4)';}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 0 30px rgba(139,92,246,.25)';}}>
                  <Star size={16}/> Redeem Rewards
                </button>
              )}
            </div>

            {/* Main content: big number + progress + rewards */}
            <div style={{ position:'relative', display:'flex', alignItems:'center', gap:40, flexWrap:'wrap', justifyContent:'space-between' }}>
              
              {/* Big points number */}
              <div style={{ flex:'0 0 auto' }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, lineHeight:1 }}>
                  <span style={{ fontSize:'clamp(72px, 10vw, 110px)', fontWeight:900, letterSpacing:'-.04em', lineHeight:1, background:'linear-gradient(135deg, #fff 10%, #d8b4fe 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                    {bonusPoints}
                  </span>
                  <span style={{ fontSize:28, color:'rgba(255,255,255,.15)', fontWeight:800, letterSpacing:'-.02em' }}>/100</span>
                </div>
                <div style={{ fontSize:16, color:'rgba(167,139,250,.8)', fontWeight:800, marginTop:10, letterSpacing:'.1em', textTransform:'uppercase' }}>Available Points</div>
              </div>

              {/* Progress + rewards */}
              <div style={{ flex:1, minWidth:260, display:'flex', flexDirection:'column', gap:20 }}>
                {/* Reward milestone visuals */}
                <div style={{ display:'flex', gap:16 }}>
                  {[{icon:'💵',v:'$3 Wallet',l:'Balance Credit'},{icon:'🔑',v:'3-Day',l:'Premium Access'}].map(r=>(
                    <div key={r.v} style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', borderRadius:20, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', flex:1, transition:'all .2s' }}>
                      <span style={{ fontSize:24, filter:'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>{r.icon}</span>
                      <div>
                        <div style={{ fontSize:15, fontWeight:800, color:'#e9d5ff', lineHeight:1 }}>{r.v}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginTop:4 }}>{r.l}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Smooth Progress Bar */}
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                    <span style={{ fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em' }}>Goal Progress</span>
                    <span style={{ fontSize:14, color:bonusPoints>=100?'#4ade80':'#c4b5fd', fontWeight:800 }}>
                      {bonusPoints>=100?'🎁 Ready to Redeem':progressPct+'%'}
                    </span>
                  </div>
                  <div style={{ height:12, borderRadius:99, background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.05)', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg, #6d28d9, #c4b5fd, #e9d5ff)', width:`${Math.min(progressPct===0&&bonusPoints>=100?100:progressPct,100)}%`, boxShadow:'0 0 20px rgba(167,139,250,.5)', transition:'width 1s cubic-bezier(.22,1,.36,1)' }}/>
                  </div>
                </div>
              </div>

              {/* Claim button */}
              <div style={{ flex:'0 0 auto', alignSelf:'center' }}>
                <button onClick={handleClaimBonus} disabled={!canClaimBonus||claimingBonus}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'24px 44px', borderRadius:24, background: (canClaimBonus) ? 'linear-gradient(135deg, #7c3aed, #c026d3)' : 'rgba(255,255,255,0.05)', border:(canClaimBonus)?'none':'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:18, fontWeight:900, textTransform:'uppercase', letterSpacing:'.05em', cursor:(canClaimBonus)?'pointer':'not-allowed', boxShadow:(canClaimBonus)?'0 20px 50px rgba(167,139,250,0.3)':'none', transition:'all 0.3s', transform:(canClaimBonus)?'scale(1)':'scale(0.98)' }}
                  onMouseEnter={e=>{if(canClaimBonus)e.currentTarget.style.transform='scale(1.05) translateY(-4px)';}}
                  onMouseLeave={e=>{if(canClaimBonus)e.currentTarget.style.transform='scale(1)';}}>
                  {claimingBonus
                    ? <><Loader2 size={24} className="animate-spin"/>Claiming...</>
                    : canClaimBonus
                      ? <><Sparkles size={24}/>Claim +10</>
                      : <><Clock size={18}/> {bonusCooldown}</>}
                </button>
              </div>
            </div>
          </div>

          {/* ── FREE TRIAL ── */}
          <FreeKeyCard animDelay={420}/>

        </div>
      </div>
    </div>
  );
}
