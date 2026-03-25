import { logActivity } from '@/lib/activity';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { Key, Copy, RefreshCw, Globe, Clock, Shield, Download, CheckCircle, Loader2, AlertCircle, Play, ChevronRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import type { License } from '@/lib/store';

const SUPABASE_URL  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';
const FF_IMAGE      = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80';
const DOWNLOAD_URL  = 'https://www.asuswebstorage.com/navigate/a/#/s/4E1D05A81552402C8D05FCE0E61402A64';
const TUTORIAL_URL  = 'https://youtu.be/vwUYk589SzU';

async function validatePanel(key: string, panelType: 'lag' | 'internal') {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}`, 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ key, panel_type: panelType }),
    });
    const data = await res.json();
    if (typeof data.success === 'boolean') return { success: data.success, message: data.message ?? '', info: data.info ?? null };
    const nested = data[panelType === 'lag' ? 'lag' : 'internal'];
    if (nested && typeof nested.success === 'boolean') return { success: nested.success, message: nested.message ?? '', info: nested.info ?? null };
    return { success: false, message: 'Unexpected response', info: null };
  } catch (e) { return { success: false, message: `Network error: ${String(e)}`, info: null }; }
}

function toISO(unixSec: any): string {
  const ms = parseInt(String(unixSec ?? '0')) * 1000;
  return ms > 100000 ? new Date(ms).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString();
}
function getExpiry(info: any): string {
  return toISO(info?.subscriptions?.[0]?.expiry ?? info?.expiry ?? '0');
}

interface UserLicenseRow {
  id: string;
  user_id: string;
  user_email: string;
  product_id: string;
  product_name: string;
  license_key: string;
  keyauth_username?: string | null;
  hwid?: string | null;
  last_login?: string | null;
  expires_at: string;
  status?: 'active' | 'expired' | null;
  ip?: string | null;
  device?: string | null;
  hwid_resets_used?: number | null;
  hwid_reset_month?: number | null;
  created_at?: string;
  updated_at?: string;
}

function isLicenseExpired(expiresAt?: string | null) {
  return new Date(expiresAt ?? 0).getTime() <= Date.now();
}

function mapDbLicense(row: UserLicenseRow): License {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    key: row.license_key,
    keyauthUsername: row.keyauth_username ?? '',
    hwid: row.hwid ?? '',
    lastLogin: row.last_login ?? '',
    expiresAt: row.expires_at,
    status: isLicenseExpired(row.expires_at) ? 'expired' : 'active',
    ip: row.ip ?? '',
    device: row.device ?? '',
    hwidResetsUsed: Number(row.hwid_resets_used ?? 0),
    hwidResetMonth: Number(row.hwid_reset_month ?? new Date().getMonth()),
  };
}

function toDbLicenseRow(license: License, user: { id: string; email: string }): Omit<UserLicenseRow, 'id'> {
  return {
    user_id: user.id,
    user_email: user.email,
    product_id: license.productId,
    product_name: license.productName,
    license_key: license.key,
    keyauth_username: license.keyauthUsername ?? '',
    hwid: license.hwid ?? '',
    last_login: license.lastLogin || null,
    expires_at: license.expiresAt,
    status: isLicenseExpired(license.expiresAt) ? 'expired' : 'active',
    ip: license.ip ?? '',
    device: license.device ?? '',
    hwid_resets_used: Number(license.hwidResetsUsed ?? 0),
    hwid_reset_month: Number(license.hwidResetMonth ?? new Date().getMonth()),
  };
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const { t: tr } = useTranslation();
  const [t, setT] = useState('');
  useEffect(() => {
    const up = () => {
      try {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) { setT(tr('common.expired')); return; }
        const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000),
              m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
        setT(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
      } catch { setT(tr('common.noData')); }
    };
    up(); const i = setInterval(up, 1000); return () => clearInterval(i);
  }, [expiresAt, tr]);
  return <span style={{ color: t === tr('common.expired') ? 'var(--red)' : 'var(--green)' }}>{t || '...'}</span>;
}

function HwidModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.75)',backdropFilter:'blur(8px)',padding:16 }}>
      <div className="g" style={{ padding:24,maxWidth:360,width:'100%',boxShadow:'0 32px 80px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
          <div style={{ width:40,height:40,borderRadius:11,background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <AlertCircle size={20} color="var(--amber)" />
          </div>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{t('license.resetConfirm')}</div>
            <div style={{ fontSize:11,color:'var(--muted)' }}>{t('license.cannotUndo')}</div>
          </div>
        </div>
        <p style={{ fontSize:12,color:'var(--muted)',marginBottom:20,lineHeight:1.6 }}>{t('license.resetNote')}</p>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ flex:1 }}>{t('common.cancel')}</button>
          <button onClick={onConfirm} className="btn btn-danger" style={{ flex:1 }}>{t('license.yesReset')}</button>
        </div>
      </div>
    </div>
  );
}

// ── Purchase Success Card ────────────────────────────────────
function SuccessCard({ productName, licKey, onDismiss }: { productName: string; licKey: string; onDismiss: () => void }) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied]     = useState(false);
  const displayKey = (licKey || '').replace('_INTERNAL', '');

  const copy = () => {
    navigator.clipboard.writeText(displayKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.82)',backdropFilter:'blur(12px)',padding:16 }}
      onClick={e => e.target === e.currentTarget && onDismiss()}>
      <div className="g si" style={{ padding:'36px 32px',maxWidth:440,width:'100%',textAlign:'center',boxShadow:'0 0 80px rgba(16,232,152,.12),0 32px 80px rgba(0,0,0,.7)',borderColor:'rgba(16,232,152,.2)' }}>
        <div style={{ width:64,height:64,borderRadius:20,background:'rgba(16,232,152,.1)',border:'1px solid rgba(16,232,152,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 0 40px rgba(16,232,152,.2)' }}>
          <CheckCircle size={32} color="var(--green)" />
        </div>
        <div style={{ fontSize:22,fontWeight:800,color:'#fff',marginBottom:6 }}>{t('shop.purchaseSuccess')}</div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:28 }}>{t('shop.keyReady')}</div>
        <div style={{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.09)',borderRadius:14,padding:'18px 16px',marginBottom:16,position:'relative',overflow:'hidden' }}>
          <div style={{ fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10 }}>{t('license.title').replace('Activate ', '')}</div>
          <div style={{ position:'relative',display:'flex',alignItems:'center',justifyContent:'center',gap:10 }}>
            <code style={{ fontSize:13,fontFamily:'monospace',color:'#fff',letterSpacing:revealed?'2px':'0',filter:revealed?'none':'blur(8px)',transition:'filter .4s ease',flex:1,textAlign:'center',wordBreak:'break-all' }}>
              {displayKey || 'KEY-NOT-AVAILABLE'}
            </code>
            <button onClick={() => setRevealed(!revealed)}
              style={{ background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'6px 8px',cursor:'pointer',color:'var(--muted)',flexShrink:0 }}>
              {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {!revealed && (
            <div style={{ textAlign:'center',marginTop:8 }}>
              <span style={{ fontSize:12,color:'var(--dim)' }}>{t('common.reveal')}</span>
            </div>
          )}
        </div>
        <div style={{ display:'flex',gap:10,marginBottom:20 }}>
          <button onClick={copy} className="btn btn-g" style={{ flex:1 }}>
            {copied ? <><CheckCircle size={15} /> {t('common.copied')}</> : <><Copy size={15} /> {t('common.copy')}</>}
          </button>
          <button onClick={onDismiss} className="btn btn-ghost" style={{ flex:1 }}>{t('common.done')}</button>
        </div>
        <p style={{ fontSize:11,color:'var(--dim)' }}>{t('shop.keysSaved')}</p>
      </div>
    </div>
  );
}

const handleActivateRef = { current: null as (() => void) | null };

function LicenseInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ position:'relative' }}>
      <Key size={15} style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',pointerEvents:'none' }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={t('license.placeholder')}
        onKeyDown={e => { if (e.key === 'Enter') handleActivateRef.current?.(); }}
        className="inp inp-lg"
        style={{ paddingLeft:42,fontFamily:'monospace',letterSpacing:'1px' }}
      />
    </div>
  );
}

function DownloadSection() {
  return (
    <div className="g" style={{ overflow:'hidden',borderRadius:20 }}>
      <div style={{ position:'relative',height:180,overflow:'hidden' }}>
        <img src={FF_IMAGE} alt="Free Fire" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',filter:'brightness(.8)' }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(to right,rgba(0,0,0,.85) 0%,rgba(0,0,0,.3) 60%,transparent 100%)' }} />
        <div style={{ position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,.8) 0%,transparent 60%)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'20px 24px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:6 }}>
            <div className="dot dot-green" />
            <span style={{ fontSize:10,color:'var(--green)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em' }}>OB52 Undetected</span>
          </div>
          <div style={{ fontSize:20,fontWeight:800,color:'#fff' }}>1999X Panel Active</div>
          <p style={{ fontSize:12,color:'rgba(255,255,255,.45)',marginTop:3 }}>Your license is ready. Download and watch the setup guide.</p>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr' }}>
        {[
          { href:DOWNLOAD_URL, icon:Download, label:'Download Panel', sub:'Latest 1999X build', c:'var(--green)', bg:'rgba(16,232,152,.08)', bc:'rgba(16,232,152,.15)' },
          { href:TUTORIAL_URL, icon:Play,     label:'Watch Tutorial', sub:'Step-by-step guide',  c:'#818cf8',    bg:'rgba(99,102,241,.08)', bc:'rgba(99,102,241,.15)' },
        ].map(({ href, icon: Icon, label, sub, c, bg, bc }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer"
            style={{ display:'flex',alignItems:'center',gap:14,padding:'18px 20px',textDecoration:'none',transition:'background .2s',borderTop:'1px solid var(--border)' }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.03)')}
            onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
            <div style={{ width:44,height:44,borderRadius:12,background:bg,border:`1px solid ${bc}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <Icon size={22} color={c} />
            </div>
            <div>
              <div style={{ fontSize:14,fontWeight:700,color:'#fff',marginBottom:2 }}>{label}</div>
              <div style={{ fontSize:11,color:'var(--muted)' }}>{sub}</div>
            </div>
            <ChevronRight size={16} style={{ color:'var(--dim)',marginLeft:'auto',flexShrink:0 }} />
          </a>
        ))}
      </div>
    </div>
  );
}

function LicenseCard({ lic, onCopy, onReset, accentColor }: {
  lic: any; onCopy: (k: string) => void; onReset: (lic: any) => void; accentColor: 'purple' | 'blue';
}) {
  const { t } = useTranslation();
  // Safe defaults — never crash on undefined
  const isPurple   = accentColor === 'purple';
  const rawKey     = lic?.key ?? '';
  const displayKey = rawKey.endsWith('_INTERNAL') ? rawKey.replace('_INTERNAL', '') : rawKey;
  const expiresAt  = lic?.expiresAt ?? new Date(Date.now() + 30 * 86400000).toISOString();
  const daysLeft   = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86400000));
  const isExpired  = new Date(expiresAt).getTime() < Date.now();
  const c   = isPurple ? 'var(--purple)' : 'var(--blue)';
  const bg  = isPurple ? 'rgba(109,40,217,.07)' : 'rgba(56,189,248,.06)';
  const bc  = isPurple ? 'rgba(139,92,246,.18)' : 'rgba(56,189,248,.16)';

  return (
    <div className="g g-hover" style={{ background:bg, borderColor:bc, overflow:'hidden' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:bg,border:`1px solid ${bc}`,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <CheckCircle size={16} color={c} />
          </div>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{lic?.productName ?? 'License'}</div>
            <div style={{ fontSize:11,color:'var(--muted)' }}>KeyAuth License · Bound to account</div>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          {!isExpired && <span className="badge badge-green">{daysLeft}d left</span>}
          <span className={`badge badge-${isExpired ? 'red' : isPurple ? 'purple' : 'blue'}`}>
            <span style={{ width:5,height:5,borderRadius:'50%',background:isExpired?'var(--red)':c,display:'inline-block',marginRight:4,animation:isExpired?'none':'blink 2s infinite' }} />
            {isExpired ? 'Expired' : 'Active'}
          </span>
        </div>
      </div>

      <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px' }}>
          <code style={{ flex:1,fontSize:13,fontFamily:'monospace',color:'#fff',letterSpacing:'2px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
            {displayKey || '(no key)'}
          </code>
          <button onClick={() => onCopy(displayKey)}
            style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',cursor:'pointer',color:'var(--muted)',fontSize:11,fontWeight:600,flexShrink:0 }}>
            <Copy size={13} /> Copy
          </button>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,padding:'14px 18px',borderBottom:'1px solid var(--border)' }}>
        {[
          { icon: Shield, label: 'HWID',      value: lic?.hwid      || 'Not bound' },
          { icon: Globe,  label: 'IP',         value: lic?.ip        || 'Unknown'   },
          { icon: Clock,  label: 'Last Login', value: lic?.lastLogin ? new Date(lic.lastLogin).toLocaleDateString() : '—' },
          { icon: Clock,  label: 'Expiry',     value: null, countdown: true },
        ].map(({ icon: Icon, label, value, countdown }) => (
          <div key={label} style={{ background:'rgba(255,255,255,.025)',border:'1px solid var(--border)',borderRadius:10,padding:'11px 14px' }}>
            <div style={{ fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600,marginBottom:5,display:'flex',alignItems:'center',gap:4 }}>
              <Icon size={10} />{label}
            </div>
            <div style={{ fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
              {countdown ? <ExpiryCountdown expiresAt={expiresAt} /> : value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'12px 18px' }}>
        <button onClick={() => onReset(lic)} className="btn btn-ghost btn-sm" style={{ gap:6 }}>
          <RefreshCw size={13} /> Reset HWID ({2 - (lic?.hwidResetsUsed ?? 0)} left this month)
        </button>
      </div>
    </div>
  );
}


// ── Expired License History ──────────────────────────────────
function ExpiredHistory({ intExpired, lagExpired }: { intExpired: any[]; lagExpired: any[] }) {
  const [show, setShow] = useState(false);
  const all = [...intExpired, ...lagExpired].sort((a, b) =>
    new Date(b?.expiresAt ?? 0).getTime() - new Date(a?.expiresAt ?? 0).getTime()
  );

  return (
    <div className="fu" style={{ animationDelay:'120ms' }}>
      <button onClick={() => setShow(!show)}
        style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'14px 18px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',cursor:'pointer',fontFamily:'inherit',transition:'all .15s' }}
        onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.04)')}
        onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,.02)')}>
        <div style={{ width:28,height:28,borderRadius:8,background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <Clock size={14} color="var(--red)" />
        </div>
        <div style={{ flex:1,textAlign:'left' }}>
          <div style={{ fontSize:13,fontWeight:700,color:'rgba(255,255,255,.6)' }}>Expired Licenses</div>
          <div style={{ fontSize:11,color:'var(--dim)',marginTop:1 }}>{all.length} expired key{all.length!==1?'s':''} in history</div>
        </div>
        <div style={{ fontSize:11,color:'var(--dim)',padding:'4px 10px',borderRadius:20,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)' }}>
          {show?'Hide':'Show'}
        </div>
      </button>
      {show && (
        <div style={{ marginTop:10,display:'flex',flexDirection:'column',gap:8 }}>
          {all.map((l: any) => {
            const rawKey     = l?.key ?? '';
            const displayKey = rawKey.endsWith('_INTERNAL') ? rawKey.replace('_INTERNAL','') : rawKey;
            const isInternal = rawKey.endsWith('_INTERNAL') || l?.productId === 'keyauth-internal';
            const expiredOn  = l?.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : 'Unknown';
            const copy = () => { navigator.clipboard.writeText(displayKey); toast.success('Copied!'); };
            return (
              <div key={l?.id || Math.random()}
                style={{ display:'flex',alignItems:'center',gap:14,padding:'13px 16px',borderRadius:12,background:'rgba(248,113,113,.04)',border:'1px solid rgba(248,113,113,.1)',opacity:.75 }}>
                <div style={{ width:32,height:32,borderRadius:9,background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <Key size={14} color="var(--red)" />
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3 }}>
                    <span style={{ fontSize:12,fontWeight:700,color:'rgba(255,255,255,.5)' }}>{isInternal?'Internal':'Fake Lag'}</span>
                    <span className="badge badge-red" style={{ fontSize:9 }}>Expired</span>
                  </div>
                  <code style={{ fontSize:11,fontFamily:'monospace',color:'rgba(255,255,255,.3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block' }}>
                    {displayKey || '(no key)'}
                  </code>
                  <div style={{ fontSize:10,color:'var(--dim)',marginTop:2 }}>Expired: {expiredOn}</div>
                </div>
                <button onClick={copy}
                  style={{ padding:'5px 10px',borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',cursor:'pointer',color:'var(--dim)',flexShrink:0 }}>
                  <Copy size={12}/>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function LicensesPage() {
  const { t } = useTranslation();

  // Hooks must NEVER be inside try/catch — call them directly at top level
  const rawStore      = useAppStore();
  const licenses      = rawStore?.licenses   ?? [];
  const setLicenses   = rawStore?.setLicenses ?? (() => {});
  const updateLicense = rawStore?.updateLicense ?? (() => {});
  const user          = rawStore?.user       ?? null;

  const [keyValue,    setKeyValue]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [hwidTarget,  setHwidTarget]  = useState<any | null>(null);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [successKey,  setSuccessKey]  = useState<{ productName: string; key: string } | null>(null);

  const trimmedKey = (keyValue || '').trim();
  const isReady    = trimmedKey.length >= 1;

  const copyKey = (k: string) => {
    try { navigator.clipboard.writeText(k); toast.success('Copied!'); } catch {}
  };

  const getFunctionErrorMessage = async (error: any) => {
    if (!error) return '';
    const fallback = error.message ?? '';
    try {
      const response = error.context;
      if (!response || typeof response.json !== 'function') return fallback;
      const body = await response.json();
      return body?.message ?? fallback;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    if (!user?.id) {
      setLicenses([]);
      return;
    }

    let alive = true;

    const syncLicenses = async () => {
      const nowIso = new Date().toISOString();

      await supabase
        .from('user_licenses')
        .update({ status: 'expired' })
        .eq('user_id', user.id)
        .lt('expires_at', nowIso)
        .neq('status', 'expired');

      let rows: UserLicenseRow[] = [];
      const { data, error } = await supabase
        .from('user_licenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        rows = data as UserLicenseRow[];
      }

      if (!rows.length && licenses.length > 0) {
        const seedRows = licenses.map((license) => toDbLicenseRow(license, { id: user.id, email: user.email }));
        const { data: seededRows, error: seedError } = await supabase
          .from('user_licenses')
          .upsert(seedRows, { onConflict: 'user_id,license_key' })
          .select('*');

        if (!seedError && seededRows) {
          rows = seededRows as UserLicenseRow[];
        }
      }

      if (!alive) return;
      const mapped = rows
        .map(mapDbLicense)
        .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime());

      setLicenses(mapped);
    };

    syncLicenses();

    const channel = supabase
      .channel(`user_licenses_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_licenses', filter: `user_id=eq.${user.id}` },
        () => { syncLicenses(); }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const confirmResetHwid = async () => {
    if (!hwidTarget) return;
    try {
      const currentMonth = new Date().getMonth();
      const resetsUsed = hwidTarget.hwidResetMonth === currentMonth ? Number(hwidTarget.hwidResetsUsed ?? 0) : 0;
      if (resetsUsed >= 2) {
        toast.error('Reset limit reached (2/month)');
        setHwidTarget(null);
        return;
      }

      const panelType = hwidTarget.productId === 'keyauth-lag' ? 'lag' : 'internal';
      const username = String(hwidTarget.keyauthUsername ?? '').trim() || String(hwidTarget.key ?? '').replace('_INTERNAL', '');

      if (!username) {
        toast.error('Missing KeyAuth username for this license');
        setHwidTarget(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('reset-hwid', {
        body: { username, panel_type: panelType },
      });

      if (error || !data?.success) {
        toast.error(data?.message ?? await getFunctionErrorMessage(error) ?? 'HWID reset failed');
        setHwidTarget(null);
        return;
      }

      const { error: syncError } = await supabase
        .from('user_licenses')
        .update({
          hwid: '',
          hwid_resets_used: resetsUsed + 1,
          hwid_reset_month: currentMonth,
        })
        .eq('id', hwidTarget.id)
        .eq('user_id', user?.id ?? '');

      if (syncError) {
        toast.error('HWID reset succeeded but license sync failed');
      } else {
        updateLicense(hwidTarget.id, {
          hwid: '',
          hwidResetsUsed: resetsUsed + 1,
          hwidResetMonth: currentMonth,
        });
        toast.success(data.message ?? 'HWID reset successfully');
        if(user) logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'hwid_reset', product:hwidTarget.productName, status:'success' });
      }
    } catch (error) {
      toast.error(await getFunctionErrorMessage(error) || 'Reset failed');
    }
    setHwidTarget(null);
  };

  const handleActivate = async () => {
    if (!isReady) { toast.error('Enter a license key'); return; }
    if (!user)    { toast.error('Please login first'); return; }
    setErrorMsg('');

    const alreadyLag = licenses.some((l: any) => l?.productId === 'keyauth-lag' && l?.key === trimmedKey);
    const alreadyInt = licenses.some((l: any) => l?.productId === 'keyauth-internal' && l?.key === trimmedKey + '_INTERNAL');
    if (alreadyLag && alreadyInt) { toast.error('Key already activated on this account'); return; }

    setLoading(true);
    try {
      // ── Step 1: Check if key is already bound to a different Gmail ──
      // Use edge function to bypass RLS (anon key can't read other users' bindings)
      let existingBinding: { user_email: string } | null = null;
      try {
        const bindRes = await fetch(`${SUPABASE_URL}/functions/v1/check-key-binding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}`, 'apikey': SUPABASE_ANON },
          body: JSON.stringify({ key: trimmedKey, user_email: user.email }),
        });
        const bindData = await bindRes.json();
        if (bindData.blocked) {
          setErrorMsg(`❌ This key is already bound to another Google account. Each key can only be used by one Gmail account.`);
          toast.error('Key is bound to another account');
          setLoading(false);
          return;
        }
        if (bindData.existing_email) {
          existingBinding = { user_email: bindData.existing_email };
        }
      } catch { /* if edge function not deployed, skip check */ }

      // ── Step 2: Validate with KeyAuth ──
      const [lagResult, intResult] = await Promise.all([
        alreadyLag ? { success: false, message: 'skip', info: null } : validatePanel(trimmedKey, 'lag'),
        alreadyInt ? { success: false, message: 'skip', info: null } : validatePanel(trimmedKey, 'internal'),
      ]);

      const lagOk = lagResult.success === true;
      const intOk = intResult.success === true;

      if (!lagOk && !intOk) {
        const noise  = ['Invalid license key', 'Invalid key', 'Key not found', 'skip', 'Connection error', 'Unexpected'];
        const useful = [lagResult.message, intResult.message].find(m => m && !noise.some(n => m.includes(n)));
        setErrorMsg(useful || 'Invalid license key');
        toast.error('Activation failed');
        setLoading(false);
        return;
      }

      let lastKey  = '';
      let lastName = '';
      const activatedLicenses: License[] = [];
      const panelType = lagOk && intOk ? 'both' : lagOk ? 'lag' : 'internal';

      if (lagOk) {
        const lic = {
          id: `lag_${Math.random().toString(36).slice(2, 10)}`,
          productId: 'keyauth-lag', productName: 'Fake Lag', key: trimmedKey,
          keyauthUsername: lagResult.info?.username ?? trimmedKey,
          hwid: lagResult.info?.hwid ?? '', lastLogin: toISO(lagResult.info?.lastlogin),
          expiresAt: getExpiry(lagResult.info), status: 'active' as const,
          ip: lagResult.info?.ip ?? '', device: '', hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth(),
        };
        activatedLicenses.push(lic);
        lastKey = trimmedKey; lastName = 'Fake Lag';
      }

      if (intOk) {
        const lic = {
          id: `int_${Math.random().toString(36).slice(2, 10)}`,
          productId: 'keyauth-internal', productName: 'Internal', key: trimmedKey + '_INTERNAL',
          keyauthUsername: intResult.info?.username ?? trimmedKey,
          hwid: intResult.info?.hwid ?? '', lastLogin: toISO(intResult.info?.lastlogin),
          expiresAt: getExpiry(intResult.info), status: 'active' as const,
          ip: intResult.info?.ip ?? '', device: '', hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth(),
        };
        activatedLicenses.push(lic);
        lastKey = trimmedKey + '_INTERNAL'; lastName = 'Internal';
      }

      if (activatedLicenses.length) {
        const payload = activatedLicenses.map((license) => toDbLicenseRow(license, { id: user.id, email: user.email }));
        const { data: savedRows, error: saveError } = await supabase
          .from('user_licenses')
          .upsert(payload, { onConflict: 'user_id,license_key' })
          .select('*');

        if (saveError) {
          throw new Error(saveError.message || 'Failed to save activated key');
        }

        const savedLicenses = ((savedRows ?? []) as UserLicenseRow[]).map(mapDbLicense);
        const mergedLicenses = [
          ...savedLicenses,
          ...licenses.filter((existing) => !savedLicenses.some((saved) => saved.key === existing.key)),
        ].sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime());

        setLicenses(mergedLicenses);
      }

      // ── Step 3: Bind key to Gmail in Supabase ──
      if (!existingBinding) {
        // Use supabase client with user session — RLS allows user to insert their own binding
        const { error: bindErr } = await supabase.from('key_bindings').insert({
          key:        trimmedKey,
          user_id:    user.id,
          user_email: user.email,
          panel_type: panelType,
        });
        if (bindErr) console.warn('Key binding save failed:', bindErr.message);
      }

      const count = (lagOk ? 1 : 0) + (intOk ? 1 : 0);
      if (count === 2) toast.success('🎉 Both panels activated!');
      else if (count === 1) toast.success(`✅ ${lastName} activated!`);

      if (lastKey) setSuccessKey({ productName: lagOk && intOk ? 'Fake Lag + Internal' : lastName, key: lastKey });
      setKeyValue('');
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(`Error: ${String(e)}`);
      toast.error('Something went wrong');
    }
    setLoading(false);
  };

  handleActivateRef.current = handleActivate;

  // Safe filter — split active vs expired
  const isExpiredLic = (l: any) => isLicenseExpired(l?.expiresAt);

  const lagActive   = (licenses || []).filter((l: any) => l?.productId === 'keyauth-lag' && !isExpiredLic(l));
  const lagExpired  = (licenses || []).filter((l: any) => l?.productId === 'keyauth-lag' && isExpiredLic(l));
  const intActive   = (licenses || []).filter((l: any) => (l?.productId === 'keyauth-internal' || l?.key?.endsWith?.('_INTERNAL')) && !isExpiredLic(l));
  const intExpired  = (licenses || []).filter((l: any) => (l?.productId === 'keyauth-internal' || l?.key?.endsWith?.('_INTERNAL')) && isExpiredLic(l));

  const hasActive   = lagActive.length > 0 || intActive.length > 0;
  const hasExpired  = lagExpired.length > 0 || intExpired.length > 0;
  const hasAny      = (licenses || []).length > 0;

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:18 }}>
      {hwidTarget && <HwidModal onConfirm={confirmResetHwid} onCancel={() => setHwidTarget(null)} />}
      {successKey && <SuccessCard productName={successKey.productName} licKey={successKey.key} onDismiss={() => setSuccessKey(null)} />}

      {/* Activate box */}
      <div className="g fu" style={{ padding:'24px 22px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:22 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Key size={20} color="var(--purple)" />
          </div>
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:'#fff' }}>Activate License Key</div>
            <div style={{ fontSize:12,color:'var(--muted)',marginTop:2 }}>Enter your KeyAuth key to activate your panel</div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8 }}>License Key</div>
          <LicenseInput value={keyValue} onChange={setKeyValue} />
        </div>

        <button onClick={handleActivate} disabled={loading || !isReady} className="btn btn-p btn-lg btn-full shim-btn">
          {loading ? <><Loader2 size={17} className="animate-spin" /> Validating...</> : <><Key size={17} /> Activate License Key</>}
        </button>

        {errorMsg && (
          <div style={{ marginTop:14,padding:'14px 16px',borderRadius:12,background:'rgba(248,113,113,.07)',border:'1px solid rgba(248,113,113,.2)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:5 }}>
              <AlertTriangle size={14} color="var(--red)" />
              <span style={{ fontSize:12,fontWeight:700,color:'var(--red)' }}>Activation Failed</span>
            </div>
            <p style={{ fontSize:12,color:'rgba(248,113,113,.7)',lineHeight:1.5,wordBreak:'break-word' }}>{errorMsg}</p>
          </div>
        )}
      </div>

      {/* ── Active Internal licenses ── */}
      {intActive.length > 0 && (
        <div className="fu" style={{ animationDelay:'40ms' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
            <div className="dot" style={{ background:'var(--blue)',boxShadow:'0 0 7px var(--blue)',width:6,height:6,borderRadius:'50%',animation:'blink 2s infinite' }} />
            <div style={{ fontSize:12,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'.1em' }}>1999X Internal Panel</div>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {intActive.map((l: any) => <LicenseCard key={l?.id || Math.random()} lic={l} onCopy={copyKey} onReset={setHwidTarget} accentColor="blue" />)}
          </div>
        </div>
      )}

      {/* ── Active Fake Lag licenses ── */}
      {lagActive.length > 0 && (
        <div className="fu" style={{ animationDelay:'80ms' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
            <div className="dot dot-purple" />
            <div style={{ fontSize:12,fontWeight:700,color:'var(--purple)',textTransform:'uppercase',letterSpacing:'.1em' }}>1999X Fake Lag Panel</div>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {lagActive.map((l: any) => <LicenseCard key={l?.id || Math.random()} lic={l} onCopy={copyKey} onReset={setHwidTarget} accentColor="purple" />)}
          </div>
        </div>
      )}

      {hasActive && <DownloadSection />}

      {/* ── No active licenses ── */}
      {!hasActive && (
        <div className="g fu" style={{ padding:'60px 20px',textAlign:'center',borderStyle:'dashed',animationDelay:'60ms' }}>
          <div style={{ width:64,height:64,borderRadius:20,background:'rgba(139,92,246,.08)',border:'1px solid rgba(139,92,246,.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
            <Key size={28} color="rgba(139,92,246,.35)" />
          </div>
          <p style={{ fontSize:15,fontWeight:600,color:'var(--muted)',marginBottom:6 }}>No active licenses</p>
          <p style={{ fontSize:13,color:'var(--dim)' }}>Paste your license key above to get started</p>
        </div>
      )}

      {/* ── Expired History Section ── */}
      {hasExpired && <ExpiredHistory intExpired={intExpired} lagExpired={lagExpired} />}
    </div>
  );
}
