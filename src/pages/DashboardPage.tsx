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
import { isOwner } from '@/lib/roles';
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
  // Global panel enabled/disabled state
  const [panelEnabled, setPanelEnabled] = useState<boolean>(true);
  const [togglingPanel, setTogglingPanel] = useState(false);
  const userIsOwner = isOwner(user?.role);

  // Load panel enabled state from system_settings
  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'free_trial_enabled').maybeSingle()
      .then(({ data }) => {
        if (data) setPanelEnabled(data.value !== 'false' && data.value !== false);
        else setPanelEnabled(true); // default on if no row
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
    const { error } = await supabase.from('system_settings').upsert(
      { key:'free_trial_enabled', value: String(newVal), updated_at: new Date().toISOString() },
      { onConflict:'key' }
    );
    if (error) { toast.error('Failed to update panel status'); }
    else {
      setPanelEnabled(newVal);
      toast.success(newVal ? 'Free panel resumed for everyone!' : 'Free panel stopped for everyone!');
    }
    setTogglingPanel(false);
  };

  const handleClaim = async () => {
    if (!canClaim||generating||!user) return;
    if (!panelEnabled) { toast.error('Free trial is currently disabled by the owner.'); return; }
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
    <div className="px-panel" style={{ animationDelay:`${animDelay}ms` }}>
      <div className="px-glow" style={{ opacity:.8, background:`radial-gradient(ellipse at 85% 0%, ${panelEnabled?'rgba(124,92,255,.28)':'rgba(239,68,68,.18)'} 0%, transparent 55%)` }}/>
      <div style={{ position:'absolute',top:-50,left:-30,width:200,height:200,borderRadius:'50%',background:`radial-gradient(circle,${panelEnabled?'rgba(124,92,255,.1)':'rgba(239,68,68,.06)'} 0%,transparent 65%)`,animation:'px-orb 11s ease-in-out infinite reverse',pointerEvents:'none' }}/>

      <div style={{ position:'relative' }}>
        {/* ── Header row ── */}
        <div style={{ display:'flex',alignItems:'center',gap:13,marginBottom:18 }}>
          <div style={{ width:48,height:48,borderRadius:15,flexShrink:0,
            background:`linear-gradient(135deg,${panelEnabled?'rgba(124,92,255,.25),rgba(109,40,217,.08)':'rgba(239,68,68,.2),rgba(185,28,28,.06)'})`,
            border:`1px solid ${panelEnabled?'rgba(124,92,255,.3)':'rgba(239,68,68,.25)'}`,
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:`0 0 22px ${panelEnabled?'rgba(124,92,255,.22)':'rgba(239,68,68,.16)'}` }}>
            <Zap size={22} color={panelEnabled?'#a78bfa':'#f87171'}/>
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:16,fontWeight:700,color:'#fff',letterSpacing:'-.01em',lineHeight:1 }}>Free Panel Trial</div>
            <div style={{ fontSize:11,color:'rgba(255,255,255,.3)',marginTop:3 }}>Every 2 days · Internal + Fake Lag keys</div>
          </div>
          {/* Status pill */}
          <div style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:99,
            background:panelEnabled?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)',
            border:`1px solid ${panelEnabled?'rgba(34,197,94,.22)':'rgba(239,68,68,.22)'}`,flexShrink:0 }}>
            <span style={{ width:6,height:6,borderRadius:'50%',background:panelEnabled?'#22c55e':'#ef4444',display:'inline-block',
              boxShadow:`0 0 7px ${panelEnabled?'#22c55e':'#ef4444'}` }}/>
            <span style={{ fontSize:9,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',
              color:panelEnabled?'#4ade80':'#f87171' }}>
              {panelEnabled?'Online':'Off'}
            </span>
          </div>
        </div>

        {/* ── What you get strip ── */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16 }}>
          {[
            { icon:'⚡', label:'Fake Lag Key', sub:'Anti-lag panel', col:'rgba(167,139,250,.12)', bc:'rgba(167,139,250,.18)', tc:'#c4b5fd' },
            { icon:'🔒', label:'Internal Key', sub:'Internal panel',  col:'rgba(124,92,255,.1)',  bc:'rgba(124,92,255,.2)',  tc:'#a78bfa' },
          ].map(f=>(
            <div key={f.label} style={{ padding:'10px 12px',borderRadius:12,background:f.col,border:`1px solid ${f.bc}`,display:'flex',alignItems:'center',gap:9 }}>
              <span style={{ fontSize:16 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:f.tc,lineHeight:1 }}>{f.label}</div>
                <div style={{ fontSize:10,color:'rgba(255,255,255,.28)',marginTop:2 }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Owner control ── */}
        {userIsOwner && (
          <div style={{ marginBottom:14,padding:'11px 14px',borderRadius:13,
            background:panelEnabled?'rgba(34,197,94,.05)':'rgba(239,68,68,.05)',
            border:`1px solid ${panelEnabled?'rgba(34,197,94,.16)':'rgba(239,68,68,.18)'}`,
            display:'flex',alignItems:'center',justifyContent:'space-between',gap:10 }}>
            <div>
              <div style={{ fontSize:11,fontWeight:700,color:'#fff' }}>{panelEnabled?'Panel Active':'Panel Stopped'}</div>
              <div style={{ fontSize:10,color:'rgba(255,255,255,.28)',marginTop:1 }}>
                {panelEnabled?'All users can claim':'Disabled for everyone'}
              </div>
            </div>
            <button onClick={togglePanel} disabled={togglingPanel}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:10,
                background:panelEnabled?'rgba(239,68,68,.1)':'rgba(34,197,94,.1)',
                border:`1px solid ${panelEnabled?'rgba(239,68,68,.25)':'rgba(34,197,94,.25)'}`,
                cursor:togglingPanel?'not-allowed':'pointer',fontFamily:'inherit',fontSize:11,fontWeight:700,
                color:panelEnabled?'#f87171':'#4ade80',transition:'all .18s',opacity:togglingPanel?.6:1,
                flexShrink:0 }}
              onMouseEnter={e=>{if(!togglingPanel)e.currentTarget.style.filter='brightness(1.2)';}}
              onMouseLeave={e=>{e.currentTarget.style.filter='none';}}>
              {togglingPanel?<Loader2 size={12} className="animate-spin"/>
                :panelEnabled?<><span>⏸</span>Stop</>:<><span>▶</span>Resume</>}
            </button>
          </div>
        )}

        {/* ── Disabled notice (non-owner) ── */}
        {!panelEnabled && !userIsOwner && (
          <div style={{ marginBottom:14,padding:'11px 14px',borderRadius:13,background:'rgba(239,68,68,.05)',border:'1px solid rgba(239,68,68,.16)',display:'flex',alignItems:'center',gap:9 }}>
            <span style={{ fontSize:18 }}>🚫</span>
            <div>
              <div style={{ fontSize:12,fontWeight:700,color:'#f87171' }}>Temporarily Unavailable</div>
              <div style={{ fontSize:10,color:'rgba(255,255,255,.28)',marginTop:1 }}>The owner has paused the free panel</div>
            </div>
          </div>
        )}

        {/* ── Active trial ── */}
        {isActive && row ? (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            <div style={{ padding:'16px 18px',borderRadius:16,background:'rgba(124,92,255,.08)',border:'1px solid rgba(124,92,255,.2)',position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(124,92,255,.07) 0%,transparent 55%)',pointerEvents:'none' }}/>
              <div style={{ fontSize:9,color:'rgba(167,139,250,.65)',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',marginBottom:6 }}>Trial Active — Expires In</div>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                <div style={{ fontSize:38,fontWeight:700,color:'#a78bfa',fontFamily:'monospace',letterSpacing:'.03em',lineHeight:1 }}>
                  <LiveClock ms={new Date(row.expires_at).getTime()}/>
                </div>
                <div style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:99,background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.22)' }}>
                  <span className="px-live-dot" style={{ width:6,height:6 }}/>
                  <span style={{ fontSize:9,fontWeight:700,letterSpacing:'.1em',color:'#4ade80',textTransform:'uppercase' }}>Active</span>
                </div>
              </div>
            </div>
            <button onClick={()=>setRevealed(!revealed)}
              style={{ padding:'12px 16px',borderRadius:13,
                background:revealed?'rgba(124,92,255,.1)':'rgba(255,255,255,.04)',
                border:`1px solid ${revealed?'rgba(124,92,255,.25)':'rgba(255,255,255,.08)'}`,
                cursor:'pointer',color:revealed?'#c4b5fd':'rgba(255,255,255,.55)',
                fontSize:13,fontFamily:'inherit',fontWeight:600,display:'flex',alignItems:'center',
                gap:7,justifyContent:'center',transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(124,92,255,.12)';e.currentTarget.style.borderColor='rgba(124,92,255,.28)';e.currentTarget.style.color='#c4b5fd';}}
              onMouseLeave={e=>{e.currentTarget.style.background=revealed?'rgba(124,92,255,.1)':'rgba(255,255,255,.04)';e.currentTarget.style.borderColor=revealed?'rgba(124,92,255,.25)':'rgba(255,255,255,.08)';e.currentTarget.style.color=revealed?'#c4b5fd':'rgba(255,255,255,.55)';}}>
              {revealed?<EyeOff size={14}/>:<Eye size={14}/>}
              {revealed?'Hide My Keys':'View My Keys'}
            </button>
            {revealed && (
              <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
                {row.lag_key&&<div style={{ padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)' }}>
                  <div style={{ fontSize:8,color:'rgba(255,255,255,.28)',fontWeight:700,marginBottom:4,letterSpacing:'.12em',textTransform:'uppercase' }}>⚡ Fake Lag Key</div>
                  <code style={{ fontSize:11,color:'rgba(196,181,253,.8)',fontFamily:'monospace',wordBreak:'break-all' }}>{row.lag_key}</code>
                </div>}
                {row.internal_key&&<div style={{ padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)' }}>
                  <div style={{ fontSize:8,color:'rgba(255,255,255,.28)',fontWeight:700,marginBottom:4,letterSpacing:'.12em',textTransform:'uppercase' }}>🔒 Internal Key</div>
                  <code style={{ fontSize:11,color:'rgba(167,139,250,.8)',fontFamily:'monospace',wordBreak:'break-all' }}>{row.internal_key}</code>
                </div>}
              </div>
            )}
          </div>
        ) : panelEnabled && canClaim ? (
          <button onClick={handleClaim} disabled={generating} className="px-btn px-btn-full">
            {generating?<><Loader2 size={15} className="animate-spin"/>Generating keys…</>:<><Zap size={15}/>Claim Free Trial</>}
          </button>
        ) : panelEnabled && !canClaim ? (
          <div style={{ padding:'16px 18px',borderRadius:16,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',textAlign:'center' }}>
            <div style={{ fontSize:9,color:'rgba(255,255,255,.25)',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',marginBottom:8 }}>Next Free Trial In</div>
            <div style={{ fontSize:34,fontWeight:700,color:'rgba(167,139,250,.5)',fontFamily:'monospace',letterSpacing:'.04em',lineHeight:1 }}>
              <LiveClock ms={cooldownMs}/>
            </div>
            <div style={{ fontSize:10,color:'rgba(255,255,255,.18)',marginTop:6 }}>Come back when the timer hits 00:00:00</div>
          </div>
        ) : (
          <button disabled className="px-btn px-btn-full" style={{ opacity:.35,cursor:'not-allowed',animation:'none' }}>
            <Zap size={15}/> Free Trial Disabled
          </button>
        )}
      </div>
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
    <div style={{ position:'relative', paddingBottom:100, fontFamily:"'Inter',system-ui,sans-serif", minHeight:'100%' }}>

      <style>{`
        @keyframes px-in   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:none} }
        @keyframes px-orb  { 0%,100%{transform:translate(0,0)}  40%{transform:translate(22px,-18px)}  70%{transform:translate(-16px,12px)} }
        @keyframes px-grd  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes px-bar  { from{width:0} to{width:var(--bw)} }
        @keyframes px-shi  { 0%{transform:translateX(-120%)} 100%{transform:translateX(240%)} }
        @keyframes px-spin { to{transform:rotate(360deg)} }

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
        .px-grid  { display:grid; gap:18px; }
        .px-top   { grid-template-columns: 1fr 1fr 1fr; align-items:start; }
        .px-bot   { grid-template-columns: 1fr 1fr; align-items:start; }
        @media(max-width:900px) {
          .px-top { grid-template-columns:1fr 1fr; }
          .px-bot { grid-template-columns:1fr; }
        }
        @media(max-width:540px)  { .px-top { grid-template-columns:1fr; } }
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
                {isSystemOnline ? 'System Online' : 'Maintenance'}
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
              <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:8 }}>
                <span style={{ fontSize:'clamp(48px,6vw,64px)', fontWeight:700, letterSpacing:'-.06em', lineHeight:1,
                  background:'linear-gradient(135deg,#fff 0%,rgba(196,181,253,.9) 100%)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  {statsLoading ? '—' : <CountUp to={totalUsers}/>}
                </span>
                {!statsLoading && <span style={{ fontSize:22, fontWeight:500, color:'rgba(196,181,253,.6)', letterSpacing:'-.02em' }}>+</span>}
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
              <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:'clamp(48px,6vw,64px)', fontWeight:700, letterSpacing:'-.06em', lineHeight:1,
                  background:'linear-gradient(135deg,#fff 0%,rgba(134,239,172,.85) 100%)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
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

        {/* ── ANTIBAN chip — slim banner ── */}
        <div className="px-panel" style={{ padding:'16px 24px', marginBottom:18, animationDelay:'260ms' as any }}>
          <div className="px-glow" style={{ opacity:.5, background:'radial-gradient(ellipse at 50% 50%,rgba(245,158,11,.08) 0%,transparent 65%)' }}/>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:40,height:40,borderRadius:13,background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <Shield size={18} color="#fbbf24"/>
              </div>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:'#fff',letterSpacing:'-.01em' }}>Antiban OB52 — Protected</div>
                <div style={{ fontSize:11,color:'rgba(255,255,255,.3)',marginTop:2 }}>Fully undetected · Updated for latest patch</div>
              </div>
            </div>
            <div style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:99,background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.2)',flexShrink:0 }}>
              <span style={{ width:6,height:6,borderRadius:'50%',background:'#fbbf24',display:'inline-block',boxShadow:'0 0 8px #f59e0b' }}/>
              <span style={{ fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'#fbbf24' }}>Active</span>
            </div>
          </div>
        </div>

        {/* ══ BOTTOM ROW: Daily Bonus · Free Trial ══ */}
        <div className="px-grid px-bot">

          {/* ── DAILY BONUS ── */}
          <div className="px-panel" style={{ animationDelay:'340ms' as any }}>
            <div className="px-glow" style={{ opacity:.8, background:'radial-gradient(ellipse at 15% 0%,rgba(124,92,255,.3) 0%,transparent 55%)' }}/>
            <div style={{ position:'absolute',top:-50,right:-30,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,.12) 0%,transparent 65%)',animation:'px-orb 9s ease-in-out infinite',pointerEvents:'none' }}/>
            <div style={{ position:'relative' }}>

              {/* ── Top: icon + label + redeem ── */}
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <div style={{ width:46,height:46,borderRadius:15,background:'linear-gradient(135deg,rgba(167,139,250,.22),rgba(109,40,217,.08))',border:'1px solid rgba(167,139,250,.28)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 22px rgba(139,92,246,.22)',flexShrink:0 }}>
                    <Gift size={20} color="#c4b5fd"/>
                  </div>
                  <div>
                    <div style={{ fontSize:16,fontWeight:700,color:'#fff',letterSpacing:'-.01em',lineHeight:1 }}>Daily Bonus</div>
                    <div style={{ fontSize:11,color:'rgba(255,255,255,.32)',marginTop:3 }}>+10 pts every 24h · resets daily</div>
                  </div>
                </div>
                {bonusPoints>=100 ? (
                  <button onClick={()=>setShowRewardModal(true)}
                    style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:11,
                      background:'linear-gradient(135deg,rgba(167,139,250,.2),rgba(124,92,255,.1))',
                      border:'1px solid rgba(167,139,250,.35)',cursor:'pointer',fontFamily:'inherit',
                      fontSize:12,fontWeight:700,color:'#c4b5fd',whiteSpace:'nowrap',transition:'all .18s',
                      boxShadow:'0 0 18px rgba(139,92,246,.2)' }}
                    onMouseEnter={e=>{e.currentTarget.style.background='linear-gradient(135deg,rgba(167,139,250,.32),rgba(124,92,255,.18))';e.currentTarget.style.boxShadow='0 0 28px rgba(139,92,246,.4)';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='linear-gradient(135deg,rgba(167,139,250,.2),rgba(124,92,255,.1))';e.currentTarget.style.boxShadow='0 0 18px rgba(139,92,246,.2)';}}>
                    <Star size={12}/> Redeem Now
                  </button>
                ) : (
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:10,color:'rgba(255,255,255,.25)',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase' }}>Next reward</div>
                    <div style={{ fontSize:13,fontWeight:700,color:'rgba(167,139,250,.6)',marginTop:2 }}>{100-bonusPoints} pts away</div>
                  </div>
                )}
              </div>

              {/* ── Reward info strip ── */}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1px 1fr',alignItems:'center',padding:'12px 16px',borderRadius:14,background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.12)',marginBottom:20 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9,color:'rgba(255,255,255,.3)',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:4 }}>100 Points</div>
                  <div style={{ fontSize:18,fontWeight:700,color:'#c4b5fd' }}>= $3 Free</div>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,.25)',marginTop:2 }}>wallet credit</div>
                </div>
                <div style={{ width:1,height:36,background:'rgba(167,139,250,.15)' }}/>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9,color:'rgba(255,255,255,.3)',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:4 }}>100 Points</div>
                  <div style={{ fontSize:18,fontWeight:700,color:'#a78bfa' }}>= 3-Day Key</div>
                  <div style={{ fontSize:10,color:'rgba(255,255,255,.25)',marginTop:2 }}>free license</div>
                </div>
              </div>

              {/* ── Points + progress ── */}
              <div style={{ marginBottom:20 }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                  <div style={{ display:'flex',alignItems:'baseline',gap:6 }}>
                    <span style={{ fontSize:52,fontWeight:700,letterSpacing:'-.06em',lineHeight:1,
                      background:'linear-gradient(135deg,#fff 0%,rgba(196,181,253,.85) 100%)',
                      WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text' }}>
                      {bonusPoints}
                    </span>
                    <span style={{ fontSize:15,color:'rgba(255,255,255,.28)',fontWeight:600 }}>/ 100 pts</span>
                  </div>
                  {bonusPoints>=100
                    ? <div style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:99,background:'rgba(167,139,250,.12)',border:'1px solid rgba(167,139,250,.28)' }}>
                        <span style={{ fontSize:12 }}>🎁</span>
                        <span style={{ fontSize:10,fontWeight:700,color:'#c4b5fd',letterSpacing:'.06em',textTransform:'uppercase' }}>Redeemable!</span>
                      </div>
                    : <span style={{ fontSize:11,color:'rgba(255,255,255,.22)',fontWeight:600 }}>{progressPct}%</span>
                  }
                </div>
                {/* Segmented progress bar */}
                <div style={{ position:'relative',height:8,borderRadius:99,background:'rgba(255,255,255,.06)',overflow:'hidden' }}>
                  <div style={{
                    height:'100%',borderRadius:99,
                    background:'linear-gradient(90deg,#7c3aed,#9d6eff,#c4b5fd)',
                    boxShadow:'0 0 14px rgba(167,139,250,.55)',
                    width:`${Math.min(progressPct===0&&bonusPoints>=100?100:progressPct,100)}%`,
                    animation:'px-bar 1s cubic-bezier(.22,1,.36,1) both',
                    '--bw':`${Math.min(progressPct===0&&bonusPoints>=100?100:progressPct,100)}%`,
                    position:'relative',overflow:'hidden',
                    transition:'width .4s cubic-bezier(.22,1,.36,1)'
                  } as any}>
                    <div style={{ position:'absolute',top:0,bottom:0,width:'50%',background:'linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)',animation:'px-shi 2.4s ease-in-out infinite' }}/>
                  </div>
                  {/* 10 segment markers */}
                  {[10,20,30,40,50,60,70,80,90].map(p=>(
                    <div key={p} style={{ position:'absolute',top:0,bottom:0,left:`${p}%`,width:1,background:'rgba(0,0,0,.3)',pointerEvents:'none' }}/>
                  ))}
                </div>
                <div style={{ display:'flex',justifyContent:'space-between',marginTop:5 }}>
                  <span style={{ fontSize:9,color:'rgba(255,255,255,.2)',fontWeight:600 }}>0</span>
                  <span style={{ fontSize:9,color:'rgba(167,139,250,.5)',fontWeight:700 }}>50</span>
                  <span style={{ fontSize:9,color:'rgba(255,255,255,.35)',fontWeight:700 }}>100 🎁</span>
                </div>
              </div>

              {/* ── Claim button ── */}
              <button onClick={handleClaimBonus} disabled={!canClaimBonus||claimingBonus} className="px-btn px-btn-full">
                {claimingBonus
                  ? <><Loader2 size={14} style={{ animation:'px-spin 1s linear infinite' }}/>Claiming…</>
                  : canClaimBonus
                    ? <><Sparkles size={14}/>Claim +10 Points</>
                    : <><Clock size={13}/> Next claim in {bonusCooldown}</>}
              </button>
            </div>
          </div>

          {/* ── FREE TRIAL ── */}
          <FreeKeyCard animDelay={420}/>

        </div>
      </div>
    </div>
  );
}
