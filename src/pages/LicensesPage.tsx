import { useAppStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { Key, Copy, RefreshCw, Globe, Clock, Shield, Download, CheckCircle, Loader2, AlertCircle, Play, ChevronRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

const SUPABASE_URL  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';
const FF_IMAGE      = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80';
const LOGO          = 'https://www.dropbox.com/scl/fi/uv2artcam1x5w1afg7ecc/1999XX-Png.png?raw=1';
const DOWNLOAD_LINK = 'https://www.asuswebstorage.com/navigate/a/#/s/4E1D05A81552402C8D05FCE0E61402A64';
const TUTORIAL_LINK = 'https://youtu.be/vwUYk589SzU';

async function validatePanel(key: string, panelType: 'lag' | 'internal') {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}`, 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ key, panel_type: panelType, appName: panelType }),
    });
    const data = await res.json();
    if (typeof data.success === 'boolean') return { success: data.success, message: data.message ?? '', info: data.info ?? null };
    const nested = data[panelType === 'lag' ? 'lag' : 'internal'];
    if (nested && typeof nested.success === 'boolean') return { success: nested.success, message: nested.message ?? '', info: nested.info ?? null };
    return { success: false, message: 'Unexpected response', info: null };
  } catch (e) { return { success: false, message: `Connection error: ${String(e)}`, info: null }; }
}

function toISO(unixSec: any): string {
  const ms = parseInt(String(unixSec ?? '0')) * 1000;
  return ms > 100000 ? new Date(ms).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString();
}
function getExpiry(info: any): string {
  const fromSub = info?.subscriptions?.[0]?.expiry;
  const direct  = info?.expiry;
  return toISO(fromSub ?? direct ?? '0');
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [t, setT] = useState('');
  useEffect(() => {
    const up = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setT('Expired'); return; }
      const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000),
            m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setT(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    up(); const i = setInterval(up, 1000); return () => clearInterval(i);
  }, [expiresAt]);
  return <span style={{ color: t === 'Expired' ? 'var(--red)' : 'var(--green)' }}>{t}</span>;
}

function HwidModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)' }}>
      <div className="g" style={{ padding:24,maxWidth:360,width:'calc(100% - 32px)',boxShadow:'0 32px 80px rgba(0,0,0,.6)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
          <div style={{ width:40,height:40,borderRadius:11,background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <AlertCircle size={20} color="var(--amber)" />
          </div>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>Reset HWID?</div>
            <div style={{ fontSize:11,color:'var(--muted)' }}>This action cannot be undone</div>
          </div>
        </div>
        <p style={{ fontSize:12,color:'var(--muted)',marginBottom:20,lineHeight:1.6 }}>Resetting HWID allows the license to be used on a different device. Limited to 2 resets per month.</p>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ flex:1 }}>Cancel</button>
          <button onClick={onConfirm} className="btn btn-danger" style={{ flex:1 }}>Yes, Reset</button>
        </div>
      </div>
    </div>
  );
}

// ── Premium success card shown after activation ──────────────
function SuccessCard({ productName, licKey, onDismiss }: { productName: string; licKey: string; onDismiss: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayKey = licKey.replace('_INTERNAL', '');

  const copy = () => {
    navigator.clipboard.writeText(displayKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.8)',backdropFilter:'blur(12px)',padding:16 }}
      onClick={(e) => e.target === e.currentTarget && onDismiss()}>
      <div className="g si" style={{ padding:'36px 32px',maxWidth:440,width:'100%',textAlign:'center',boxShadow:'0 0 80px rgba(16,232,152,.12), 0 32px 80px rgba(0,0,0,.7)',borderColor:'rgba(16,232,152,.2)' }}>
        {/* Success icon */}
        <div style={{ width:64,height:64,borderRadius:20,background:'rgba(16,232,152,.1)',border:'1px solid rgba(16,232,152,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 0 40px rgba(16,232,152,.2)' }}>
          <CheckCircle size={32} color="var(--green)" />
        </div>

        <div style={{ fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-.02em',marginBottom:6 }}>Purchase Successful</div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:28 }}>Your {productName} license key is ready</div>

        {/* Key reveal */}
        <div style={{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.09)',borderRadius:14,padding:'18px 16px',marginBottom:16,position:'relative',overflow:'hidden' }}>
          <div style={{ fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10 }}>License Key</div>
          <div style={{ position:'relative',display:'flex',alignItems:'center',justifyContent:'center',gap:10 }}>
            <code style={{ fontSize:14,fontFamily:'monospace',color:'#fff',letterSpacing:revealed?'2px':'0',filter:revealed?'none':'blur(8px)',transition:'filter .4s ease, letter-spacing .3s ease',userSelect:revealed?'text':'none',flex:1,textAlign:'center',wordBreak:'break-all' }}>
              {displayKey}
            </code>
            <button onClick={() => setRevealed(!revealed)}
              style={{ background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'6px 8px',cursor:'pointer',color:'var(--muted)',flexShrink:0,transition:'all .15s' }}>
              {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {!revealed && (
            <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',borderRadius:14 }} onClick={() => setRevealed(true)}>
              <span style={{ fontSize:12,color:'var(--muted)',background:'rgba(0,0,0,.6)',padding:'5px 12px',borderRadius:20,backdropFilter:'blur(8px)' }}>Click to reveal</span>
            </div>
          )}
        </div>

        <div style={{ display:'flex',gap:10,marginBottom:20 }}>
          <button onClick={copy} className="btn btn-g" style={{ flex:1 }}>
            {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy Key'}
          </button>
          <button onClick={onDismiss} className="btn btn-ghost" style={{ flex:1 }}>Done</button>
        </div>

        <p style={{ fontSize:11,color:'var(--dim)' }}>Keep this key safe. Don't share it with anyone.</p>
      </div>
    </div>
  );
}

const handleActivateRef = { current: null as (() => void) | null };

function LicenseInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position:'relative' }}>
      <Key size={15} style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',pointerEvents:'none' }} />
      <input
        value={value} onChange={e => onChange(e.target.value)}
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
          <div style={{ fontSize:20,fontWeight:800,color:'#fff',letterSpacing:'-.02em' }}>1999X Panel Active</div>
          <p style={{ fontSize:12,color:'rgba(255,255,255,.45)',marginTop:3 }}>Your license is ready. Download and watch the setup guide.</p>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr' }}>
        {[
          { href: DOWNLOAD_LINK, icon: Download, label: 'Download Panel', sub: 'Latest 1999X build', c: 'var(--green)', bg: 'rgba(16,232,152,.08)', bc: 'rgba(16,232,152,.15)' },
          { href: TUTORIAL_LINK, icon: Play,     label: 'Watch Tutorial', sub: 'Step-by-step guide',  c: '#818cf8',     bg: 'rgba(99,102,241,.08)',  bc: 'rgba(99,102,241,.15)' },
        ].map(({ href, icon: Icon, label, sub, c, bg, bc }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer"
            style={{ display:'flex',alignItems:'center',gap:14,padding:'18px 20px',textDecoration:'none',transition:'background .2s',borderTop:'1px solid var(--border)' }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.03)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
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
  lic: any; onCopy: (k: string) => void; onReset: (id: string) => void; accentColor: 'purple' | 'blue';
}) {
  const isPurple   = accentColor === 'purple';
  const displayKey = lic.key.endsWith('_INTERNAL') ? lic.key.replace('_INTERNAL', '') : lic.key;
  const daysLeft   = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const isExpired  = new Date(lic.expiresAt).getTime() < Date.now();
  const c    = isPurple ? 'var(--purple)' : 'var(--blue)';
  const bg   = isPurple ? 'rgba(109,40,217,.07)' : 'rgba(56,189,248,.06)';
  const bc   = isPurple ? 'rgba(139,92,246,.18)' : 'rgba(56,189,248,.16)';

  return (
    <div className="g g-hover" style={{ background:bg, borderColor:bc, overflow:'hidden', boxShadow:`0 0 40px ${isPurple?'rgba(109,40,217,.06)':'rgba(56,189,248,.06)'}` }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:bg,border:`1px solid ${bc}`,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <CheckCircle size={16} color={c} />
          </div>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{lic.productName}</div>
            <div style={{ fontSize:11,color:'var(--muted)' }}>{t('license.boundToAccount')}</div>
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          {!isExpired && (
            <span className="badge badge-green">{daysLeft}d left</span>
          )}
          <span className={`badge badge-${isExpired ? 'red' : isPurple ? 'purple' : 'blue'}`}>
            <span className="dot" style={{ width:5,height:5,background:isExpired?'var(--red)':c,boxShadow:isExpired?'none':`0 0 5px ${c}`,animation:isExpired?'none':'blink 2s infinite' }} />
            {isExpired ? 'Expired' : 'Active'}
          </span>
        </div>
      </div>

      {/* Key row */}
      <div style={{ padding:'14px 18px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px' }}>
          <code style={{ flex:1,fontSize:13,fontFamily:'monospace',color:'#fff',letterSpacing:'2px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{displayKey}</code>
          <button onClick={() => onCopy(displayKey)}
            style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',cursor:'pointer',color:'var(--muted)',fontSize:11,fontWeight:600,transition:'all .15s',flexShrink:0 }}
            onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.1)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,.06)')}>
            <Copy size={13} /> Copy
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,padding:'14px 18px',borderBottom:'1px solid var(--border)' }}>
        {[
          { icon: Shield, label: 'HWID',       value: lic.hwid      || 'Not bound' },
          { icon: Globe,  label: 'IP',          value: lic.ip        || 'Unknown'   },
          { icon: Clock,  label: 'Last Login',  value: lic.lastLogin ? new Date(lic.lastLogin).toLocaleDateString() : '—' },
          { icon: Clock,  label: 'Expiry',      value: null, countdown: true },
        ].map(({ icon: Icon, label, value, countdown }) => (
          <div key={label} style={{ background:'rgba(255,255,255,.025)',border:'1px solid var(--border)',borderRadius:10,padding:'11px 14px' }}>
            <div style={{ fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600,marginBottom:5,display:'flex',alignItems:'center',gap:4 }}>
              <Icon size={10} />{label}
            </div>
            <div style={{ fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
              {countdown ? <ExpiryCountdown expiresAt={lic.expiresAt} /> : value}
            </div>
          </div>
        ))}
      </div>

      {/* HWID reset */}
      <div style={{ padding:'12px 18px' }}>
        <button onClick={() => onReset(lic.id)} className="btn btn-ghost btn-sm"
          style={{ gap:6 }}>
          <RefreshCw size={13} /> Reset HWID ({2 - (lic.hwidResetsUsed ?? 0)} left this month)
        </button>
      </div>
    </div>
  );
}

export default function LicensesPage() {
  const { t } = useTranslation();
  const { licenses, resetHwid, addLicense, user } = useAppStore();
  const [keyValue, setKeyValue]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [hwidTarget, setHwidTarget] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState('');
  const [successKey, setSuccessKey] = useState<{ productName: string; key: string } | null>(null);

  const trimmedKey = keyValue.trim();
  const isReady    = trimmedKey.length >= 1;

  const copyKey = (k: string) => { navigator.clipboard.writeText(k); toast.success('Copied!'); };

  const confirmResetHwid = () => {
    if (!hwidTarget) return;
    if (resetHwid(hwidTarget)) toast.success('HWID reset successfully');
    else toast.error('Reset limit reached (2/month)');
    setHwidTarget(null);
  };

  const handleActivate = async () => {
    if (!isReady) { toast.error('Enter a license key'); return; }
    if (!user)    { toast.error('Please login first'); return; }
    setErrorMsg('');

    const alreadyLag = licenses.some(l => l.productId === 'keyauth-lag' && l.key === trimmedKey);
    const alreadyInt = licenses.some(l => l.productId === 'keyauth-internal' && l.key === trimmedKey + '_INTERNAL');
    if (alreadyLag && alreadyInt) { toast.error('Key already activated'); return; }

    setLoading(true);
    try {
      const [lagResult, intResult] = await Promise.all([
        alreadyLag ? { success: false, message: 'skip', info: null } : validatePanel(trimmedKey, 'lag'),
        alreadyInt ? { success: false, message: 'skip', info: null } : validatePanel(trimmedKey, 'internal'),
      ]);

      const lagOk = lagResult.success === true;
      const intOk = intResult.success === true;

      if (!lagOk && !intOk) {
        const noise  = ['Invalid license key', 'Invalid key', 'Key not found', 'skip', 'Connection error', 'Unexpected response'];
        const lagMsg = lagResult.message ?? '';
        const intMsg = intResult.message ?? '';
        const useful = [lagMsg, intMsg].find(m => m && !noise.some(n => m.includes(n)));
        setErrorMsg(useful || 'Invalid license key');
        toast.error('Activation failed');
        setLoading(false);
        return;
      }

      let lastActivatedKey = '';
      let lastProductName  = '';

      if (lagOk) {
        const lic = {
          id: `lag_${Math.random().toString(36).slice(2, 10)}`,
          productId: 'keyauth-lag', productName: 'Fake Lag', key: trimmedKey,
          hwid: lagResult.info?.hwid ?? '', lastLogin: toISO(lagResult.info?.lastlogin),
          expiresAt: getExpiry(lagResult.info), status: 'active' as const,
          ip: lagResult.info?.ip ?? '', device: '', hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth(),
        };
        addLicense(lic);
        lastActivatedKey = trimmedKey;
        lastProductName  = 'Fake Lag';
      }

      if (intOk) {
        const lic = {
          id: `int_${Math.random().toString(36).slice(2, 10)}`,
          productId: 'keyauth-internal', productName: 'Internal', key: trimmedKey + '_INTERNAL',
          hwid: intResult.info?.hwid ?? '', lastLogin: toISO(intResult.info?.lastlogin),
          expiresAt: getExpiry(intResult.info), status: 'active' as const,
          ip: intResult.info?.ip ?? '', device: '', hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth(),
        };
        addLicense(lic);
        lastActivatedKey = trimmedKey + '_INTERNAL';
        lastProductName  = 'Internal';
      }

      // Show premium success card
      setSuccessKey({ productName: lagOk && intOk ? 'Fake Lag + Internal' : lastProductName, key: lastActivatedKey });
      setKeyValue('');
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(`Error: ${String(e)}`);
      toast.error('Something went wrong');
    }
    setLoading(false);
  };

  handleActivateRef.current = handleActivate;

  const lagLicenses = licenses.filter(l => l.productId === 'keyauth-lag');
  const intLicenses = licenses.filter(l => l.productId === 'keyauth-internal' || l.key.endsWith('_INTERNAL'));
  const hasAny      = licenses.length > 0;

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
            <div style={{ fontSize:16,fontWeight:800,color:'#fff',letterSpacing:'-.01em' }}>{t('license.title')}</div>
            <div style={{ fontSize:12,color:'var(--muted)',marginTop:2 }}>{t('license.subtitle')}</div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8 }}>License Key</div>
          <LicenseInput value={keyValue} onChange={setKeyValue} />
        </div>

        <button onClick={handleActivate} disabled={loading || !isReady} className="btn btn-p btn-lg btn-full shim-btn">
          {loading ? <><Loader2 size={17} className="animate-spin" /> Validating...</> : <><Key size={17} />{t('license.activate')}</>}
        </button>

        {errorMsg && (
          <div style={{ marginTop:14,padding:'14px 16px',borderRadius:12,background:'rgba(248,113,113,.07)',border:'1px solid rgba(248,113,113,.2)' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:5 }}>
              <AlertTriangle size={14} color="var(--red)" />
              <span style={{ fontSize:12,fontWeight:700,color:'var(--red)' }}>{t('license.activationFailed')}</span>
            </div>
            <p style={{ fontSize:12,color:'rgba(248,113,113,.7)',lineHeight:1.5,wordBreak:'break-word' }}>{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Internal licenses */}
      {intLicenses.length > 0 && (
        <div className="fu" style={{ animationDelay:'40ms' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
            <div className="dot dot-purple" style={{ background:'var(--blue)',boxShadow:'0 0 7px var(--blue)' }} />
            <div style={{ fontSize:12,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'.1em' }}>{t('license.internalPanel')}</div>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {intLicenses.map(l => <LicenseCard key={l.id} lic={l} onCopy={copyKey} onReset={setHwidTarget} accentColor="blue" />)}
          </div>
        </div>
      )}

      {/* Lag licenses */}
      {lagLicenses.length > 0 && (
        <div className="fu" style={{ animationDelay:'80ms' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:12 }}>
            <div className="dot dot-purple" />
            <div style={{ fontSize:12,fontWeight:700,color:'var(--purple)',textTransform:'uppercase',letterSpacing:'.1em' }}>{t('license.fakeLagPanel')}</div>
          </div>
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {lagLicenses.map(l => <LicenseCard key={l.id} lic={l} onCopy={copyKey} onReset={setHwidTarget} accentColor="purple" />)}
          </div>
        </div>
      )}

      {hasAny && <DownloadSection />}

      {!hasAny && (
        <div className="g fu" style={{ padding:'60px 20px',textAlign:'center',borderStyle:'dashed',animationDelay:'60ms' }}>
          <div style={{ width:64,height:64,borderRadius:20,background:'rgba(139,92,246,.08)',border:'1px solid rgba(139,92,246,.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px' }}>
            <Key size={28} color="rgba(139,92,246,.35)" />
          </div>
          <p style={{ fontSize:15,fontWeight:600,color:'var(--muted)',marginBottom:6 }}>{t('license.noLicense')}</p>
          <p style={{ fontSize:13,color:'var(--dim)' }}>{t('license.noLicenseDesc')}</p>
        </div>
      )}
    </div>
  );
}
