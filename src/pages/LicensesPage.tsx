import { useAppStore } from '@/lib/store';
import { Key, Copy, RefreshCw, Globe, Clock, Shield, Download, CheckCircle, Loader2, AlertCircle, Play, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

const SUPABASE_URL  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';
const FF_IMAGE      = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80';

// ── Validate key against ONE specific panel using its own credentials ──
// panel_type tells the edge function which AppName + OwnerID + Version to use.
// The edge function isolates each app completely — no credential mixing.
async function validatePanel(key: string, panelType: 'lag' | 'internal'): Promise<{
  success: boolean;
  message: string;
  info: any;
}> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-key`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'apikey':        SUPABASE_ANON,
      },
      // panel_type is the new param — edge function uses it to pick the right profile
      // appName kept as fallback for old deployed function compatibility
      body: JSON.stringify({ key, panel_type: panelType, appName: panelType }),
    });

    const data = await res.json();

    // New function returns flat { success, message, info } for single panel calls
    if (typeof data.success === 'boolean') {
      return { success: data.success, message: data.message ?? '', info: data.info ?? null };
    }

    // Old function returns { lag:{...}, internal:{...} } — extract by panel type
    const nested = data[panelType === 'lag' ? 'lag' : 'internal'];
    if (nested && typeof nested.success === 'boolean') {
      return { success: nested.success, message: nested.message ?? '', info: nested.info ?? null };
    }

    return { success: false, message: 'Unexpected response from server', info: null };
  } catch (e) {
    return { success: false, message: `Connection error: ${String(e)}`, info: null };
  }
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
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [expiresAt]);
  return <span className={timeLeft === 'Expired' ? 'text-red-400' : 'text-emerald-400'}>{timeLeft}</span>;
}

function HwidModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="rounded-2xl p-6 max-w-sm w-full mx-4 border border-white/10 bg-[#0f0f1f] shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Reset HWID?</h3>
            <p className="text-[10px] text-white/40">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-xs text-white/50 mb-5 leading-relaxed">
          Resetting HWID allows the license to be used on a different device. Limited to 2 resets per month.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-semibold border border-white/5">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-orange-400 border border-orange-500/20 bg-orange-500/10">Yes, Reset</button>
        </div>
      </div>
    </div>
  );
}

const handleActivateRef = { current: null as (() => void) | null };

function LicenseInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const masked = value ? '·'.repeat(value.length) : '';
  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={show ? value : masked}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleActivateRef.current?.(); }}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        placeholder="Paste your license key"
        className="w-full h-12 px-4 pr-12 rounded-xl bg-[#12121f] border border-white/10 text-white/70 font-mono text-sm tracking-wider focus:outline-none focus:border-purple-500/40 focus:bg-[#16162a] transition-all placeholder:text-white/20"
        spellCheck={false}
        autoComplete="off"
      />
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setShow(s => !s); }}
        className="absolute right-3 text-white/25 hover:text-white/55 transition-colors"
        tabIndex={-1}
      >
        {show
          ? <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        }
      </button>
    </div>
  );
}

function DownloadSection() {
  return (
    <div className="rounded-3xl overflow-hidden border border-white/10">
      <div className="relative h-56 overflow-hidden">
        <img src={FF_IMAGE} alt="Free Fire" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-7">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">OB52 Undetected</span>
          </div>
          <h2 className="text-2xl font-black text-white">1999X Panel Active</h2>
          <p className="text-sm text-white/50 mt-0.5">Your license is ready. Download and watch the setup guide.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/5 bg-white/3">
        <a href="#" className="group flex items-center gap-5 p-7 hover:bg-white/5 transition-all">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform" style={{ boxShadow: '0 0 20px rgba(16,185,129,0.15)' }}>
            <Download className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-0.5">Download Panel</h3>
            <p className="text-xs text-white/40">Get the latest 1999X build</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all" />
        </a>
        <a href="#" className="group flex items-center gap-5 p-7 hover:bg-white/5 transition-all">
          <div className="relative w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform" style={{ boxShadow: '0 0 20px rgba(99,102,241,0.15)' }}>
            <Play className="w-7 h-7 text-indigo-400 fill-indigo-400" />
            <span className="absolute inset-0 rounded-2xl border border-indigo-400/20 animate-ping" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-0.5">Watch Tutorial</h3>
            <p className="text-xs text-white/40">Step-by-step video setup guide</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all" />
        </a>
      </div>
    </div>
  );
}

function LicenseCard({ lic, i, onCopy, onReset, accentColor }: {
  lic: any; i: number; onCopy: (k: string) => void; onReset: (id: string) => void; accentColor: 'purple' | 'blue';
}) {
  const isPurple   = accentColor === 'purple';
  const displayKey = lic.key.endsWith('_INTERNAL') ? lic.key.replace('_INTERNAL', '') : lic.key;
  const daysLeft   = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const isExpired  = new Date(lic.expiresAt).getTime() < Date.now();

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/3"
      style={{ boxShadow: isPurple ? '0 0 40px rgba(124,58,237,0.08)' : '0 0 40px rgba(59,130,246,0.08)' }}>
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', isPurple ? 'bg-purple-500/15' : 'bg-blue-500/15')}>
            <CheckCircle className={cn('w-4 h-4', isPurple ? 'text-purple-400' : 'text-blue-400')} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{lic.productName}</h3>
            <p className="text-[10px] text-white/30">KeyAuth License · Bound to account</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isExpired && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {daysLeft}d left
            </span>
          )}
          <span className={cn('text-[10px] font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1.5 border',
            isExpired ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : isPurple ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20')}>
            <span className={cn('w-1.5 h-1.5 rounded-full', isExpired ? 'bg-red-400' : isPurple ? 'bg-purple-400 animate-pulse' : 'bg-blue-400 animate-pulse')} />
            {isExpired ? 'Expired' : 'Active'}
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-white/3 border border-white/5">
          <code className="flex-1 text-sm font-mono text-white tracking-[2px] font-semibold truncate">{displayKey}</code>
          <button onClick={() => onCopy(displayKey)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5 active:scale-[0.95] flex-shrink-0">
            <Copy className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-semibold text-white/40">Copy</span>
          </button>
        </div>
      </div>
      <div className="px-5 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Shield, label: 'HWID',      value: lic.hwid      || 'Not bound' },
          { icon: Globe,  label: 'IP',         value: lic.ip        || 'Unknown'   },
          { icon: Clock,  label: 'Last Login', value: lic.lastLogin ? new Date(lic.lastLogin).toLocaleDateString() : '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold"><Icon className="w-2.5 h-2.5" /> {label}</p>
            <p className="text-sm font-bold text-white truncate">{value}</p>
          </div>
        ))}
        <div className="p-3 rounded-xl bg-white/3 border border-white/5">
          <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold"><Clock className="w-2.5 h-2.5" /> Expiry</p>
          <p className="text-sm font-bold"><ExpiryCountdown expiresAt={lic.expiresAt} /></p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <button onClick={() => onReset(lic.id)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-white/60 hover:bg-white/8 transition-all border border-white/5">
          <RefreshCw className="w-3.5 h-3.5" /> Reset HWID ({2 - (lic.hwidResetsUsed ?? 0)} left)
        </button>
      </div>
    </div>
  );
}

export default function LicensesPage() {
  const { licenses, resetHwid, addLicense, user } = useAppStore();
  const [keyValue, setKeyValue] = useState('');
  const [loading, setLoading]   = useState(false);
  const [hwidTarget, setHwidTarget] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

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

    // Skip panels where this key is already stored
    const alreadyLag = licenses.some(l => l.productId === 'keyauth-lag' && l.key === trimmedKey);
    const alreadyInt = licenses.some(l => l.productId === 'keyauth-internal' && l.key === trimmedKey + '_INTERNAL');
    if (alreadyLag && alreadyInt) { toast.error('Key already activated'); return; }

    setLoading(true);
    try {
      // Call each panel independently using its own isolated credentials.
      // panel_type = 'lag'      → edge function uses KA_LAG_APPNAME + KA_LAG_OWNERID + KA_LAG_VERSION
      // panel_type = 'internal' → edge function uses KA_INT_APPNAME + KA_INT_OWNERID + KA_INT_VERSION
      const [lagResult, intResult] = await Promise.all([
        alreadyLag ? { success: false, message: 'skip', info: null } : validatePanel(trimmedKey, 'lag'),
        alreadyInt ? { success: false, message: 'skip', info: null } : validatePanel(trimmedKey, 'internal'),
      ]);

      const lagOk = lagResult.success === true;
      const intOk = intResult.success === true;

      if (!lagOk && !intOk) {
        // Show the most meaningful error — skip generic noise messages
        const noise  = ['Invalid license key', 'Invalid key', 'Key not found', 'skip', 'Connection error', 'Unexpected response'];
        const lagMsg = lagResult.message ?? '';
        const intMsg = intResult.message ?? '';
        const useful = [lagMsg, intMsg].find(m => m && !noise.some(n => m.includes(n)));
        setErrorMsg(useful || 'Invalid license key');
        toast.error('Activation failed');
        setLoading(false);
        return;
      }

      let activated = 0;

      // Lag app accepted this key with lag credentials → show Fake Lag card
      if (lagOk) {
        addLicense({
          id:             `lag_${Math.random().toString(36).slice(2, 10)}`,
          productId:      'keyauth-lag',
          productName:    'Fake Lag',
          key:            trimmedKey,
          hwid:           lagResult.info?.hwid     ?? '',
          lastLogin:      toISO(lagResult.info?.lastlogin),
          expiresAt:      getExpiry(lagResult.info),
          status:         'active',
          ip:             lagResult.info?.ip        ?? '',
          device:         '',
          hwidResetsUsed: 0,
          hwidResetMonth: new Date().getMonth(),
        });
        activated++;
      }

      // Internal app accepted this key with internal credentials → show Internal card
      if (intOk) {
        addLicense({
          id:             `int_${Math.random().toString(36).slice(2, 10)}`,
          productId:      'keyauth-internal',
          productName:    'Internal',
          key:            trimmedKey + '_INTERNAL',
          hwid:           intResult.info?.hwid     ?? '',
          lastLogin:      toISO(intResult.info?.lastlogin),
          expiresAt:      getExpiry(intResult.info),
          status:         'active',
          ip:             intResult.info?.ip        ?? '',
          device:         '',
          hwidResetsUsed: 0,
          hwidResetMonth: new Date().getMonth(),
        });
        activated++;
      }

      if (activated === 2)      toast.success('🎉 Both panels activated!');
      else if (activated === 1) toast.success(`✅ ${lagOk ? 'Fake Lag' : 'Internal'} activated!`);

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
    <div className="space-y-8 w-full">
      {hwidTarget && <HwidModal onConfirm={confirmResetHwid} onCancel={() => setHwidTarget(null)} />}

      <div className="rounded-2xl p-8 border border-white/10 bg-white/3">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Key className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Activate License Key</h2>
            <p className="text-xs text-white/30">Enter your KeyAuth key to activate your panel</p>
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs font-semibold text-white/50 mb-2 block">License Key</label>
          <LicenseInput value={keyValue} onChange={setKeyValue} />
        </div>

        <button
          onClick={handleActivate}
          disabled={loading || !isReady}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9, #5b21b6)',
            boxShadow: isReady && !loading ? '0 0 40px rgba(124,58,237,0.45), 0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</> : <><Key className="w-4 h-4" /> Activate License Key</>}
        </button>

        {errorMsg && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
            <div className="flex items-start gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-400">Activation Failed</p>
            </div>
            <p className="text-xs text-red-300/70 break-words mt-1">{errorMsg}</p>
          </div>
        )}
      </div>

      {intLicenses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">1999X Internal Panel</h3>
          </div>
          {intLicenses.map((lic, i) => <LicenseCard key={lic.id} lic={lic} i={i} onCopy={copyKey} onReset={setHwidTarget} accentColor="blue" />)}
        </div>
      )}

      {lagLicenses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">1999X Fake Lag Panel</h3>
          </div>
          {lagLicenses.map((lic, i) => <LicenseCard key={lic.id} lic={lic} i={i} onCopy={copyKey} onReset={setHwidTarget} accentColor="purple" />)}
        </div>
      )}

      {hasAny && <DownloadSection />}

      {!hasAny && (
        <div className="rounded-2xl p-14 text-center border border-white/5 bg-white/2">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-purple-400/40" />
          </div>
          <p className="text-sm font-semibold text-white/40 mb-1">No active licenses</p>
          <p className="text-xs text-white/20">Paste your license key above to get started</p>
        </div>
      )}
    </div>
  );
}
