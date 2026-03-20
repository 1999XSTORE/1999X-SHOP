import { useAppStore } from '@/lib/store';
import { Key, Copy, RefreshCw, Globe, Clock, Shield, Download, CheckCircle, Loader2, AlertCircle, Play, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const FF_IMAGE = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80';

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
      <div className="rounded-2xl p-6 max-w-sm w-full mx-4 border border-white/10 bg-[#0f0f1f] shadow-2xl animate-fade-up">
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
          Are you sure you want to reset your HWID? This allows the license on a different device. Limited resets per month.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-semibold border border-white/5">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-orange-400 border border-orange-500/20 bg-orange-500/10">Yes, Reset</button>
        </div>
      </div>
    </div>
  );
}

// ── Segmented OTP-style input ─────────────────────────────────────────────────
const SEG = 5, GROUPS = 4;

function SegmentedInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const clean = value.replace(/-/g, '').toUpperCase();
  const segs  = Array.from({ length: GROUPS }, (_, i) => clean.slice(i * SEG, i * SEG + SEG));

  const rebuild = (s: string[]) => onChange(s.join('-'));

  const handleChange = (idx: number, raw: string) => {
    const val = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, SEG);
    const next = [...segs]; next[idx] = val; rebuild(next);
    if (val.length === SEG && idx < GROUPS - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace'  && segs[idx] === '' && idx > 0)          refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowLeft'  && idx > 0)                               refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < GROUPS - 1)                      refs.current[idx + 1]?.focus();
    if (e.key === 'Enter') handleActivateRef.current?.();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const raw    = e.clipboardData.getData('text').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, SEG * GROUPS);
    const newSegs = Array.from({ length: GROUPS }, (_, i) => raw.slice(i * SEG, i * SEG + SEG));
    rebuild(newSegs);
    const last = newSegs.findLastIndex((s: string) => s.length > 0);
    refs.current[Math.min(last + 1, GROUPS - 1)]?.focus();
  };

  return (
    <div className="flex items-center gap-3 w-full">
      {segs.map((seg, idx) => (
        <div key={idx} className="flex items-center gap-3 flex-1">
          <input
            ref={el => { refs.current[idx] = el; }}
            type="text" value={seg} maxLength={SEG}
            onChange={e => handleChange(idx, e.target.value)}
            onKeyDown={e => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            placeholder="·····"
            className={cn(
              'flex-1 h-16 text-center font-mono font-bold text-xl rounded-2xl border-2 transition-all duration-150 focus:outline-none tracking-[8px] placeholder:tracking-[4px] placeholder:text-white/15',
              seg.length > 0
                ? 'bg-purple-500/12 border-purple-500/50 text-white shadow-[0_0_20px_rgba(124,58,237,0.2)]'
                : 'bg-white/3 border-white/10 text-white/40',
              'focus:border-purple-500/70 focus:bg-purple-500/15 focus:shadow-[0_0_25px_rgba(124,58,237,0.3)]'
            )}
          />
          {idx < GROUPS - 1 && <span className="text-white/20 font-bold text-2xl flex-shrink-0 select-none">–</span>}
        </div>
      ))}
    </div>
  );
}

// ref so Enter key inside input can trigger activate
const handleActivateRef = { current: null as (() => void) | null };

function DownloadSection() {
  return (
    <div className="rounded-3xl overflow-hidden border border-white/10 animate-fade-up">
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
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
            style={{ boxShadow: '0 0 20px rgba(16,185,129,0.15)' }}>
            <Download className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-0.5">Download Panel</h3>
            <p className="text-xs text-white/40">Get the latest 1999X build</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all" />
        </a>
        <a href="#" className="group flex items-center gap-5 p-7 hover:bg-white/5 transition-all">
          <div className="relative w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
            style={{ boxShadow: '0 0 20px rgba(99,102,241,0.15)' }}>
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
  const displayKey = lic.key.replace('_INTERNAL', '');
  const daysLeft   = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const isExpired  = new Date(lic.expiresAt).getTime() < Date.now();

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/3 animate-fade-up"
      style={{ animationDelay: `${i * 100}ms`, boxShadow: isPurple ? '0 0 40px rgba(124,58,237,0.08)' : '0 0 40px rgba(59,130,246,0.08)' }}>
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
            {isExpired ? 'expired' : 'active'}
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-white/3 border border-white/5">
          <code className="flex-1 text-sm font-mono text-white tracking-[3px] font-semibold truncate">{displayKey}</code>
          <button onClick={() => onCopy(displayKey)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5 active:scale-[0.95] flex-shrink-0">
            <Copy className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-semibold text-white/40">Copy</span>
          </button>
        </div>
      </div>
      <div className="px-5 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Shield, label: 'HWID',      value: lic.hwid || 'Not set' },
          { icon: Globe,  label: 'IP',         value: lic.ip   || 'Unknown' },
          { icon: Clock,  label: 'LAST LOGIN', value: new Date(lic.lastLogin).toLocaleDateString() },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold"><Icon className="w-2.5 h-2.5" /> {label}</p>
            <p className="text-sm font-bold text-white truncate">{value}</p>
          </div>
        ))}
        <div className="p-3 rounded-xl bg-white/3 border border-white/5">
          <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold"><Clock className="w-2.5 h-2.5" /> EXPIRY</p>
          <p className="text-sm font-bold"><ExpiryCountdown expiresAt={lic.expiresAt} /></p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <button onClick={() => onReset(lic.id)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-white/60 hover:bg-white/8 transition-all border border-white/5">
          <RefreshCw className="w-3.5 h-3.5" /> Reset HWID ({2 - lic.hwidResetsUsed} left)
        </button>
      </div>
    </div>
  );
}

export default function LicensesPage() {
  const { licenses, resetHwid, addLicense, user } = useAppStore();
  const [keyValue, setKeyValue]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [hwidTarget, setHwidTarget] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState('');
  const [debugInfo, setDebugInfo]   = useState<any>(null);

  const cleanKey = keyValue.replace(/-/g, '').toUpperCase();
  const isReady  = cleanKey.length >= 10;

  const copyKey = (key: string) => { navigator.clipboard.writeText(key); toast.success('Copied!'); };

  const confirmResetHwid = () => {
    if (!hwidTarget) return;
    if (resetHwid(hwidTarget)) toast.success('HWID reset successfully');
    else toast.error('Reset limit reached (2/month)');
    setHwidTarget(null);
  };

  const handleActivate = async () => {
    if (!isReady)  { toast.error('Enter a complete license key'); return; }
    if (!user)     { toast.error('Please login first'); return; }
    setErrorMsg(''); setDebugInfo(null);

    const alreadyExists = licenses.find(l =>
      l.key.replace('_INTERNAL', '').replace(/-/g, '').toUpperCase() === cleanKey
    );
    if (alreadyExists) { toast.error('Key already activated on this account'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-key', {
        body: { key: cleanKey, appName: 'both' },
      });

      if (error) {
        const msg = `Edge function error: ${error.message}. Make sure you have deployed the validate-key function.`;
        setErrorMsg(msg);
        toast.error('Server error — check error message below');
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMsg('No response from server. Edge function may not be deployed.');
        setLoading(false);
        return;
      }

      // Show debug info to help diagnose issues
      setDebugInfo(data);

      const lagData = data?.lag;
      const intData = data?.internal;

      if (!data?.anySuccess) {
        // Build a helpful error message
        const lagMsg = lagData?.message ?? '';
        const intMsg = intData?.message ?? '';
        const bothFailed = !lagData?.success && !intData?.success;
        const msg = bothFailed
          ? `LAG: ${lagMsg} | INTERNAL: ${intMsg}`
          : (lagMsg || intMsg || 'Invalid license key');
        setErrorMsg(msg);
        toast.error('Key validation failed — see details below');
        setLoading(false);
        return;
      }

      let activated = 0;

      if (lagData?.success === true) {
        const expiry = lagData.info?.expiry
          ? new Date(parseInt(lagData.info.expiry) * 1000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();
        addLicense({
          id: Math.random().toString(36).substring(2, 10),
          productId: 'keyauth-lag', productName: 'Lag Bypass', key: cleanKey,
          hwid: lagData.info?.hwid ?? '',
          lastLogin: lagData.info?.lastlogin ? new Date(parseInt(lagData.info.lastlogin) * 1000).toISOString() : new Date().toISOString(),
          expiresAt: expiry, status: 'active', ip: lagData.info?.ip ?? '',
          device: '', hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth(),
        });
        activated++;
      }

      if (intData?.success === true) {
        const expiry = intData.info?.expiry
          ? new Date(parseInt(intData.info.expiry) * 1000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();
        addLicense({
          id: Math.random().toString(36).substring(2, 10) + '_i',
          productId: 'keyauth-internal', productName: 'Internal', key: cleanKey + '_INTERNAL',
          hwid: intData.info?.hwid ?? '',
          lastLogin: intData.info?.lastlogin ? new Date(parseInt(intData.info.lastlogin) * 1000).toISOString() : new Date().toISOString(),
          expiresAt: expiry, status: 'active', ip: intData.info?.ip ?? '',
          device: '', hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth(),
        });
        activated++;
      }

      if (activated === 2)      toast.success('🎉 Both panels activated! Lag Bypass + Internal');
      else if (activated === 1) toast.success(`✅ ${lagData?.success ? 'Lag Bypass' : 'Internal'} panel activated!`);

      setKeyValue(''); setErrorMsg(''); setDebugInfo(null);
    } catch (e) {
      setErrorMsg(`Unexpected error: ${String(e)}`);
      toast.error('Something went wrong');
    }
    setLoading(false);
  };

  // Expose to enter key handler
  handleActivateRef.current = handleActivate;

  const lagLicenses = licenses.filter(l => l.productId === 'keyauth-lag' || (l.productId === 'keyauth' && !l.key.endsWith('_INTERNAL')));
  const intLicenses = licenses.filter(l => l.productId === 'keyauth-internal' || l.key.endsWith('_INTERNAL'));
  const hasAny      = licenses.length > 0;

  return (
    <div className="space-y-8 w-full">
      {hwidTarget && <HwidModal onConfirm={confirmResetHwid} onCancel={() => setHwidTarget(null)} />}

      {/* ── Activate Card ── */}
      <div className="rounded-2xl p-8 border border-white/10 bg-white/3 animate-fade-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Key className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Activate License Key</h2>
            <p className="text-xs text-white/30">Enter your KeyAuth key — activates both Lag Bypass and Internal panels</p>
          </div>
        </div>

        <div className="mb-2">
          <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3 block">License Key</label>
          <SegmentedInput value={keyValue} onChange={setKeyValue} />
        </div>
        <p className="text-[11px] text-white/20 mb-6 text-center">Paste your full key — auto-fills all segments</p>

        <button
          onClick={handleActivate}
          disabled={loading || !isReady}
          className="w-full py-5 rounded-2xl font-black text-base text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-40 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9, #5b21b6)',
            boxShadow: isReady && !loading
              ? '0 0 50px rgba(124,58,237,0.55), 0 0 100px rgba(124,58,237,0.15), 0 4px 20px rgba(0,0,0,0.5)'
              : '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {isReady && !loading && (
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute inset-0 -translate-x-full"
                style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)', animation: 'shimmer 2s infinite' }} />
            </div>
          )}
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Validating with KeyAuth...</>
                   : <><Key className="w-5 h-5" /> ⚡ Activate License Key</>}
        </button>

        {/* Error details */}
        {errorMsg && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/8 border border-red-500/20">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-400">Activation Failed</p>
            </div>
            <p className="text-xs text-red-300/70 break-words">{errorMsg}</p>
            {debugInfo && (
              <details className="mt-2">
                <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50">Show debug info</summary>
                <pre className="text-[10px] text-white/30 mt-1 overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            )}
            <div className="mt-3 p-3 rounded-lg bg-white/3 border border-white/5">
              <p className="text-[10px] text-white/40 font-semibold mb-1">Common fixes:</p>
              <ul className="text-[10px] text-white/30 space-y-0.5 list-disc list-inside">
                <li>Deploy edge functions: <code className="text-purple-400">supabase functions deploy validate-key</code></li>
                <li>Add secrets: <code className="text-purple-400">KA_OWNERID</code>, <code className="text-purple-400">KA_LAG_APPID</code>, <code className="text-purple-400">KA_INT_APPID</code></li>
                <li>Make sure the key is not expired and matches your KeyAuth app name exactly</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── INTERNAL PANEL ── */}
      {intLicenses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide">1999X INTERNAL PANEL</h3>
          </div>
          {intLicenses.map((lic, i) => <LicenseCard key={lic.id} lic={lic} i={i} onCopy={copyKey} onReset={setHwidTarget} accentColor="blue" />)}
        </div>
      )}

      {/* ── LAG PANEL ── */}
      {lagLicenses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide">1999X FAKE LAG PANEL</h3>
          </div>
          {lagLicenses.map((lic, i) => <LicenseCard key={lic.id} lic={lic} i={i} onCopy={copyKey} onReset={setHwidTarget} accentColor="purple" />)}
        </div>
      )}

      {/* ── Download + Tutorial — hidden until a key is activated ── */}
      {hasAny && <DownloadSection />}

      {!hasAny && (
        <div className="rounded-2xl p-14 text-center border border-white/5 bg-white/2">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-purple-400/40" />
          </div>
          <p className="text-sm font-semibold text-white/40 mb-1">No active licenses</p>
          <p className="text-xs text-white/20">Enter your license key above to get started</p>
        </div>
      )}
    </div>
  );
}
