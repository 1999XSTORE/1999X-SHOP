import { useAppStore } from '@/lib/store';
import { Key, Copy, RefreshCw, Globe, Clock, Shield, Download, BookOpen, CheckCircle, Loader2, AlertCircle, Play, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Free Fire themed image URL (public domain FF art)
const FF_IMAGE = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80';

// ── Expiry countdown ──────────────────────────────────────────────────────────
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

// ── HWID Reset confirmation ───────────────────────────────────────────────────
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
          Are you sure you want to reset your HWID? This allows the license to be used on a different device. You have limited resets per month.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm font-semibold hover:bg-white/8 transition-all border border-white/5">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-orange-400 hover:bg-orange-500/20 transition-all border border-orange-500/20 bg-orange-500/10">Yes, Reset</button>
        </div>
      </div>
    </div>
  );
}

// ── OTP-style segmented key input ─────────────────────────────────────────────
// Key format: XXXXX-XXXXX-XXXXX-XXXXX (4 segments of 5 chars)
const SEG_LEN = 5;
const SEG_COUNT = 4;

function SegmentedKeyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Parse value into segments
  const parts = value.split('-');
  const segs: string[] = Array.from({ length: SEG_COUNT }, (_, i) => (parts[i] || '').slice(0, SEG_LEN));

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateSegs = (newSegs: string[]) => {
    onChange(newSegs.join('-').toUpperCase());
  };

  const handleChange = (idx: number, raw: string) => {
    // Strip dashes, uppercase, only alphanumeric
    const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, SEG_LEN);
    const newSegs = [...segs];
    newSegs[idx] = cleaned;
    updateSegs(newSegs);
    // Auto-advance to next segment when full
    if (cleaned.length === SEG_LEN && idx < SEG_COUNT - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && segs[idx] === '' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && idx < SEG_COUNT - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
    // Support pasting full key like AAAAA-BBBBB-CCCCC-DDDDD
    const newParts = pasted.split('-');
    const newSegs = Array.from({ length: SEG_COUNT }, (_, i) =>
      (newParts[i] || '').slice(0, SEG_LEN)
    );
    updateSegs(newSegs);
    // Focus last filled segment
    const lastFilled = newSegs.findLastIndex((s: string) => s.length > 0);
    const target = Math.min(lastFilled + 1, SEG_COUNT - 1);
    inputRefs.current[Math.max(0, target)]?.focus();
  };

  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: SEG_COUNT }, (_, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            ref={el => { inputRefs.current[idx] = el; }}
            type="text"
            value={segs[idx]}
            maxLength={SEG_LEN}
            onChange={e => handleChange(idx, e.target.value)}
            onKeyDown={e => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            placeholder={'·'.repeat(SEG_LEN)}
            className={cn(
              'w-full h-14 text-center font-mono font-bold text-lg tracking-[6px] rounded-xl border transition-all focus:outline-none',
              segs[idx].length > 0
                ? 'bg-purple-500/10 border-purple-500/40 text-white'
                : 'bg-white/3 border-white/10 text-white/30',
              'focus:border-purple-500/60 focus:bg-purple-500/10 focus:ring-2 focus:ring-purple-500/20'
            )}
            style={{ minWidth: 0 }}
          />
          {idx < SEG_COUNT - 1 && (
            <span className="text-white/20 font-bold text-lg flex-shrink-0">—</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── License card ──────────────────────────────────────────────────────────────
function LicenseCard({
  lic, i, onCopy, onReset, accentColor,
}: {
  lic: any; i: number;
  onCopy: (k: string) => void;
  onReset: (id: string) => void;
  accentColor: 'purple' | 'blue';
}) {
  const isPurple = accentColor === 'purple';
  const displayKey = lic.key.replace('_INTERNAL', '');

  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/10 bg-white/3 animate-fade-up"
      style={{
        animationDelay: `${i * 100}ms`,
        boxShadow: isPurple
          ? '0 0 40px rgba(124,58,237,0.10)'
          : '0 0 40px rgba(59,130,246,0.10)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center',
            isPurple ? 'bg-purple-500/15' : 'bg-blue-500/15')}>
            <CheckCircle className={cn('w-4 h-4', isPurple ? 'text-purple-400' : 'text-blue-400')} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{lic.productName}</h3>
            <p className="text-[10px] text-white/30">KeyAuth License · Bound to your account</p>
          </div>
        </div>
        <span className={cn(
          'text-[10px] font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1.5 border',
          isPurple ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse',
            isPurple ? 'bg-purple-400' : 'bg-blue-400')} />
          {lic.status}
        </span>
      </div>

      {/* Key display */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-white/3 border border-white/5">
          <code className="flex-1 text-sm font-mono text-white tracking-[3px] font-semibold">{displayKey}</code>
          <button onClick={() => onCopy(displayKey)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5 active:scale-[0.95] flex-shrink-0">
            <Copy className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-semibold text-white/40">Copy</span>
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="px-5 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Shield, label: 'HWID',       value: lic.hwid || 'Not set' },
          { icon: Globe,  label: 'IP',          value: lic.ip   || 'Unknown' },
          { icon: Clock,  label: 'LAST LOGIN',  value: new Date(lic.lastLogin).toLocaleDateString() },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold">
              <Icon className="w-2.5 h-2.5" /> {label}
            </p>
            <p className="text-sm font-bold text-white truncate">{value}</p>
          </div>
        ))}
        <div className="p-3 rounded-xl bg-white/3 border border-white/5">
          <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold">
            <Clock className="w-2.5 h-2.5" /> EXPIRY
          </p>
          <p className="text-sm font-bold"><ExpiryCountdown expiresAt={lic.expiresAt} /></p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex flex-wrap gap-2">
        <button onClick={() => onReset(lic.id)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-white/60 hover:bg-white/8 transition-all border border-white/5">
          <RefreshCw className="w-3.5 h-3.5" />
          Reset HWID ({2 - lic.hwidResetsUsed} left)
        </button>
        <a href="#download"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
        <a href="#tutorial"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-500/10 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-all border border-indigo-500/20">
          <BookOpen className="w-3.5 h-3.5" />
          Tutorial
        </a>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LicensesPage() {
  const { licenses, resetHwid, addLicense, user } = useAppStore();
  const [segments, setSegments]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [hwidTarget, setHwidTarget] = useState<string | null>(null);

  const fullKey = segments.toUpperCase();
  const isKeyFull = fullKey.replace(/-/g, '').length === SEG_LEN * SEG_COUNT;

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Copied to clipboard!');
  };

  const confirmResetHwid = () => {
    if (!hwidTarget) return;
    const ok = resetHwid(hwidTarget);
    if (ok) toast.success('HWID reset successfully');
    else    toast.error('Reset limit reached (2/month)');
    setHwidTarget(null);
  };

  const handleActivate = async () => {
    if (!isKeyFull) { toast.error('Please enter a complete license key'); return; }
    if (!user)      { toast.error('Please login first'); return; }

    const existing = licenses.find(l =>
      l.key === fullKey || l.key === fullKey + '_INTERNAL'
    );
    if (existing) { toast.error('This key is already activated on your account'); return; }

    setLoading(true);

    try {
      // Call edge function with appName:'both' — validates against BOTH apps independently
      const { data, error } = await supabase.functions.invoke('validate-key', {
        body: { key: fullKey, appName: 'both' },
      });

      if (error) {
        toast.error('Server error. Try again.');
        setLoading(false);
        return;
      }

      const lagData = data?.lag;
      const intData = data?.internal;
      const anySuccess = data?.anySuccess;

      if (!anySuccess) {
        toast.error(lagData?.message ?? intData?.message ?? 'Invalid license key');
        setLoading(false);
        return;
      }

      let activated = 0;

      // Add LAG license only if LAG validation succeeded
      if (lagData?.success) {
        const expiry = lagData.info?.expiry
          ? new Date(parseInt(lagData.info.expiry) * 1000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();

        addLicense({
          id:             Math.random().toString(36).substring(2, 10),
          productId:      'keyauth-lag',
          productName:    'Lag Bypass',
          key:            fullKey,
          hwid:           lagData.info?.hwid      ?? '',
          lastLogin:      lagData.info?.lastlogin
            ? new Date(parseInt(lagData.info.lastlogin) * 1000).toISOString()
            : new Date().toISOString(),
          expiresAt:      expiry,
          status:         'active',
          ip:             lagData.info?.ip ?? '',
          device:         '',
          hwidResetsUsed: 0,
          hwidResetMonth: new Date().getMonth(),
        });
        activated++;
      }

      // Add INTERNAL license only if INTERNAL validation succeeded
      if (intData?.success) {
        const expiry = intData.info?.expiry
          ? new Date(parseInt(intData.info.expiry) * 1000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();

        addLicense({
          id:             Math.random().toString(36).substring(2, 10) + '_i',
          productId:      'keyauth-internal',
          productName:    'Internal',
          key:            fullKey + '_INTERNAL',
          hwid:           intData.info?.hwid      ?? '',
          lastLogin:      intData.info?.lastlogin
            ? new Date(parseInt(intData.info.lastlogin) * 1000).toISOString()
            : new Date().toISOString(),
          expiresAt:      expiry,
          status:         'active',
          ip:             intData.info?.ip ?? '',
          device:         '',
          hwidResetsUsed: 0,
          hwidResetMonth: new Date().getMonth(),
        });
        activated++;
      }

      if (activated === 2) {
        toast.success('🎉 Both panels activated! Lag Bypass + Internal');
      } else if (activated === 1) {
        const which = lagData?.success ? 'Lag Bypass' : 'Internal';
        toast.success(`✅ ${which} panel activated!`);
      }

      setSegments('');
    } catch {
      toast.error('Something went wrong. Try again.');
    }

    setLoading(false);
  };

  const lagLicenses = licenses.filter(l =>
    l.productId === 'keyauth-lag' || (l.productId === 'keyauth' && !l.key.endsWith('_INTERNAL'))
  );
  const intLicenses = licenses.filter(l =>
    l.productId === 'keyauth-internal' || l.key.endsWith('_INTERNAL')
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {hwidTarget && (
        <HwidModal onConfirm={confirmResetHwid} onCancel={() => setHwidTarget(null)} />
      )}

      {/* ── Hero banner with Free Fire image ── */}
      <div className="relative rounded-3xl overflow-hidden h-44 animate-fade-up">
        <img
          src={FF_IMAGE}
          alt="Free Fire"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Content over image */}
        <div className="relative h-full flex flex-col justify-center px-7">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">OB52 Undetected</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">1999X Panel</h1>
          <p className="text-xs text-white/50">Activate your license key to access all features</p>
        </div>
      </div>

      {/* ── Activate Key Card ── */}
      <div className="rounded-2xl p-6 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">Activate License Key</h2>
        </div>
        <p className="text-xs text-white/30 mb-6">
          Enter your KeyAuth license key to activate both panels (Lag Bypass + Internal).
        </p>

        {/* OTP-style segmented input */}
        <div className="mb-6">
          <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3 block">
            License Key
          </label>
          <SegmentedKeyInput value={segments} onChange={setSegments} />
        </div>

        {/* BIG glowing activate button */}
        <button
          onClick={handleActivate}
          disabled={loading || !isKeyFull}
          className="w-full py-5 rounded-2xl font-black text-base text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-40 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9, #5b21b6)',
            boxShadow: isKeyFull && !loading
              ? '0 0 40px rgba(124,58,237,0.6), 0 0 80px rgba(124,58,237,0.2), 0 4px 20px rgba(0,0,0,0.5)'
              : '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {/* Shimmer effect */}
          {isKeyFull && !loading && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 translate-x-[-100%] animate-[shimmer_2s_infinite]"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
            </div>
          )}
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Validating with KeyAuth...</>
            : <><Key className="w-5 h-5" /> ⚡ Activate License Key</>
          }
        </button>
      </div>

      {/* ── Download + Tutorial Big Buttons ── */}
      <div id="download" className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '160ms' }}>
        {/* Download Panel */}
        <a
          href="#"
          className="group relative rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all active:scale-[0.98] overflow-hidden"
          style={{ boxShadow: '0 0 30px rgba(16,185,129,0.08)' }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Download Panel</h3>
            <p className="text-xs text-white/40 mb-4">Get the latest version of 1999X</p>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:gap-2 transition-all">
              Download Now <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </a>

        {/* Tutorial Video */}
        <a
          id="tutorial"
          href="#"
          className="group relative rounded-2xl p-6 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all active:scale-[0.98] overflow-hidden"
          style={{ boxShadow: '0 0 30px rgba(99,102,241,0.08)' }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mb-4 relative">
              <Play className="w-6 h-6 text-indigo-400 fill-indigo-400" />
              {/* Pulse ring */}
              <span className="absolute inset-0 rounded-xl border border-indigo-400/30 animate-ping" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Watch Tutorial</h3>
            <p className="text-xs text-white/40 mb-4">Step-by-step setup guide video</p>
            <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:gap-2 transition-all">
              Watch Now <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </a>
      </div>

      {/* ── License panels ── */}

      {/* 1999X INTERNAL PANEL */}
      {intLicenses.length > 0 && (
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide">1999X INTERNAL PANEL</h3>
          </div>
          {intLicenses.map((lic, i) => (
            <LicenseCard key={lic.id} lic={lic} i={i} onCopy={copyKey} onReset={setHwidTarget} accentColor="blue" />
          ))}
        </div>
      )}

      {/* 1999X FAKE LAG PANEL */}
      {lagLicenses.length > 0 && (
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: '320ms' }}>
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide">1999X FAKE LAG PANEL</h3>
          </div>
          {lagLicenses.map((lic, i) => (
            <LicenseCard key={lic.id} lic={lic} i={i} onCopy={copyKey} onReset={setHwidTarget} accentColor="purple" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {licenses.length === 0 && (
        <div className="rounded-2xl p-14 text-center border border-white/5 bg-white/2 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-purple-400/50" />
          </div>
          <p className="text-sm font-semibold text-white/40 mb-1">No active licenses</p>
          <p className="text-xs text-white/20">Enter your license key above to get started</p>
        </div>
      )}
    </div>
  );
}
