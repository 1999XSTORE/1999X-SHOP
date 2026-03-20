import { useAppStore } from '@/lib/store';
import { Key, Copy, RefreshCw, Globe, Clock, Shield, Download, BookOpen, CheckCircle, Loader2, AlertCircle, Play, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const FF_IMAGE = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80';

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

// ── Single-char box key input — auto-sizes to any key length ─────────────────
function CharBoxInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // Detect key length from typed/pasted content — support 1–32 chars
  // We show individual boxes per character (excluding dashes)
  // The key can be any format: XXXX-XXXX, XXXXX-XXXXX-XXXXX-XXXXX, etc.
  // We just show one box per NON-DASH character position up to 32
  const MAX_CHARS = 32;
  const DASH_EVERY = 5; // insert visual separator every 5 chars

  // Clean value: strip non-alnum, uppercase
  const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, MAX_CHARS);
  // How many boxes to show: always show at least 8, or up to current length + a few more (min 8, max MAX_CHARS)
  const boxCount = Math.max(8, Math.min(MAX_CHARS, clean.length + (clean.length < MAX_CHARS ? 3 : 0)));

  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenRef    = useRef<HTMLInputElement>(null);

  const focusHidden = () => hiddenRef.current?.focus();

  const handleHiddenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, MAX_CHARS);
    onChange(raw);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, MAX_CHARS);
    onChange(pasted);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Bubble up for form submit
      containerRef.current?.closest('form')?.requestSubmit();
    }
  };

  // Group chars with visual dash separators
  const groups: { char: string; isDash: boolean; charIdx: number }[] = [];
  for (let i = 0; i < boxCount; i++) {
    if (i > 0 && i % DASH_EVERY === 0) {
      groups.push({ char: '—', isDash: true, charIdx: -1 });
    }
    groups.push({ char: clean[i] ?? '', isDash: false, charIdx: i });
  }

  const isFocused = document.activeElement === hiddenRef.current;

  return (
    <div
      ref={containerRef}
      onClick={focusHidden}
      className="relative cursor-text select-none"
    >
      {/* Hidden real input */}
      <input
        ref={hiddenRef}
        type="text"
        value={clean}
        onChange={handleHiddenChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        autoComplete="off"
        spellCheck={false}
      />

      {/* Orange glow border container */}
      <div
        className="relative rounded-2xl p-4 transition-all duration-300"
        style={{
          background: 'rgba(40, 15, 5, 0.85)',
          border: '1.5px solid rgba(251,115,30,0.5)',
          boxShadow: '0 0 40px rgba(251,115,30,0.15), inset 0 0 40px rgba(251,115,30,0.05)',
        }}
      >
        {/* Corner sparkles */}
        <span className="absolute top-3 left-3 text-orange-400/60 text-sm select-none">✦</span>
        <span className="absolute top-3 right-3 text-orange-400/60 text-sm select-none">✦</span>
        <span className="absolute bottom-3 right-3 text-orange-400/40 text-xs select-none">✦</span>

        {/* Char boxes */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap px-4 py-1 min-h-[60px]">
          {groups.map((g, idx) => {
            if (g.isDash) {
              return (
                <span key={`dash-${idx}`} className="text-orange-400/30 font-bold text-sm mx-0.5">—</span>
              );
            }
            const isActive = g.charIdx === clean.length; // cursor position
            const filled = g.char !== '';
            return (
              <div
                key={`box-${g.charIdx}`}
                className={cn(
                  'w-10 h-12 rounded-lg flex items-center justify-center font-mono font-bold text-lg transition-all duration-150',
                  filled
                    ? 'text-orange-300'
                    : 'text-transparent',
                  isActive
                    ? 'border-2 border-orange-400 bg-orange-500/20 shadow-[0_0_12px_rgba(251,115,30,0.5)]'
                    : filled
                    ? 'border border-orange-500/40 bg-orange-500/10'
                    : 'border border-white/8 bg-white/3'
                )}
              >
                {filled ? g.char : ''}
                {isActive && (
                  <span className="w-0.5 h-5 bg-orange-400 animate-pulse rounded-full" />
                )}
              </div>
            );
          })}
        </div>

        {/* Hint */}
        <p className="text-center text-[11px] text-orange-300/50 mt-2 flex items-center justify-center gap-1.5">
          <Key className="w-3 h-3" />
          Enter your license key — any format supported
        </p>
      </div>
    </div>
  );
}

// ── Download + Tutorial section (shown after activation) ─────────────────────
function DownloadSection() {
  return (
    <div className="rounded-3xl overflow-hidden border border-white/10 animate-fade-up" style={{ animationDelay: '100ms' }}>
      {/* FF Hero image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={FF_IMAGE}
          alt="Free Fire"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">OB52 Undetected</span>
          </div>
          <h2 className="text-2xl font-black text-white">1999X Panel Active</h2>
          <p className="text-sm text-white/50 mt-0.5">Your license is ready. Download and watch the setup guide.</p>
        </div>
      </div>

      {/* Buttons row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-white/5 bg-white/3">
        {/* Download */}
        <a
          href="#"
          className="group flex items-center gap-5 p-7 hover:bg-white/5 transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
            style={{ boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
            <Download className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-0.5">Download Panel</h3>
            <p className="text-xs text-white/40">Get the latest 1999X build</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all" />
        </a>

        {/* Tutorial */}
        <a
          href="#"
          className="group flex items-center gap-5 p-7 hover:bg-white/5 transition-all"
        >
          <div className="relative w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
            style={{ boxShadow: '0 0 20px rgba(99,102,241,0.2)' }}>
            <Play className="w-7 h-7 text-indigo-400 fill-indigo-400" />
            <span className="absolute inset-0 rounded-2xl border border-indigo-400/20 animate-ping" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-0.5">Watch Tutorial</h3>
            <p className="text-xs text-white/40">Step-by-step setup video guide</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all" />
        </a>
      </div>
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
  const isPurple  = accentColor === 'purple';
  const displayKey = lic.key.replace('_INTERNAL', '');

  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/10 bg-white/3 animate-fade-up"
      style={{
        animationDelay: `${i * 100}ms`,
        boxShadow: isPurple
          ? '0 0 40px rgba(124,58,237,0.08)'
          : '0 0 40px rgba(59,130,246,0.08)',
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
          isPurple
            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse',
            isPurple ? 'bg-purple-400' : 'bg-blue-400')} />
          {lic.status}
        </span>
      </div>

      {/* Key display */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-white/3 border border-white/5">
          <code className="flex-1 text-sm font-mono text-white tracking-[3px] font-semibold truncate">{displayKey}</code>
          <button
            onClick={() => onCopy(displayKey)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5 active:scale-[0.95] flex-shrink-0"
          >
            <Copy className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-semibold text-white/40">Copy</span>
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="px-5 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Shield, label: 'HWID',      value: lic.hwid || 'Not set' },
          { icon: Globe,  label: 'IP',         value: lic.ip   || 'Unknown' },
          { icon: Clock,  label: 'LAST LOGIN', value: new Date(lic.lastLogin).toLocaleDateString() },
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

      {/* Actions — NO small download/tutorial buttons here */}
      <div className="px-5 pb-5 flex flex-wrap gap-2">
        <button
          onClick={() => onReset(lic.id)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-white/60 hover:bg-white/8 transition-all border border-white/5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset HWID ({2 - lic.hwidResetsUsed} left)
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LicensesPage() {
  const { licenses, resetHwid, addLicense, user } = useAppStore();
  const [keyInput, setKeyInput]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [hwidTarget, setHwidTarget] = useState<string | null>(null);

  // Clean key: strip non-alnum, uppercase
  const cleanKey = keyInput.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const isReady  = cleanKey.length >= 5; // at least 5 chars to enable button

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
    if (!isReady)  { toast.error('Please enter your license key'); return; }
    if (!user)     { toast.error('Please login first'); return; }

    // Check not already activated — compare clean keys
    const alreadyLag = licenses.find(l => l.key.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanKey);
    const alreadyInt = licenses.find(l => l.key.replace('_INTERNAL','').replace(/[^A-Za-z0-9]/g, '').toUpperCase() === cleanKey);
    if (alreadyLag || alreadyInt) {
      toast.error('This key is already activated on your account');
      return;
    }

    setLoading(true);
    try {
      // Validate against BOTH apps independently — pass clean key
      const { data, error } = await supabase.functions.invoke('validate-key', {
        body: { key: cleanKey, appName: 'both' },
      });

      if (error) {
        toast.error('Server error. Please try again.');
        setLoading(false);
        return;
      }

      const lagData  = data?.lag;
      const intData  = data?.internal;

      if (!data?.anySuccess) {
        // Show the most relevant error message
        const msg = lagData?.message && lagData.message !== 'Invalid license key'
          ? lagData.message
          : intData?.message ?? 'Invalid license key';
        toast.error(msg);
        setLoading(false);
        return;
      }

      let activated = 0;

      // ── Add LAG license ONLY if LAG validated successfully ──
      if (lagData?.success === true) {
        const expiry = lagData.info?.expiry
          ? new Date(parseInt(lagData.info.expiry) * 1000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();

        addLicense({
          id:             Math.random().toString(36).substring(2, 10),
          productId:      'keyauth-lag',
          productName:    'Lag Bypass',
          key:            cleanKey,
          hwid:           lagData.info?.hwid ?? '',
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

      // ── Add INTERNAL license ONLY if INTERNAL validated successfully ──
      if (intData?.success === true) {
        const expiry = intData.info?.expiry
          ? new Date(parseInt(intData.info.expiry) * 1000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();

        addLicense({
          id:             Math.random().toString(36).substring(2, 10) + '_i',
          productId:      'keyauth-internal',
          productName:    'Internal',
          key:            cleanKey + '_INTERNAL',
          hwid:           intData.info?.hwid ?? '',
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
        toast.success(`✅ ${lagData?.success ? 'Lag Bypass' : 'Internal'} panel activated!`);
      }

      setKeyInput('');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const lagLicenses = licenses.filter(l =>
    l.productId === 'keyauth-lag' ||
    (l.productId === 'keyauth' && !l.key.endsWith('_INTERNAL'))
  );
  const intLicenses = licenses.filter(l =>
    l.productId === 'keyauth-internal' || l.key.endsWith('_INTERNAL')
  );

  const hasAnyLicense = licenses.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">

      {hwidTarget && (
        <HwidModal onConfirm={confirmResetHwid} onCancel={() => setHwidTarget(null)} />
      )}

      {/* ── Activate Key Card ── */}
      <div className="rounded-2xl p-8 border border-white/10 bg-white/3 animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Key className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Redeem Key</h2>
            <p className="text-xs text-white/30">Activate your purchase</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/10">
            <Key className="w-3 h-3 text-orange-400" />
            <span className="text-[11px] font-bold text-orange-400">Ready</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-8">
          <h1 className="text-2xl font-black text-orange-400 mb-2">Enter Your Product Key</h1>
          <p className="text-sm text-white/40">Activate your purchased key by entering the code below</p>
        </div>

        {/* Orange char-box input */}
        <CharBoxInput value={keyInput} onChange={setKeyInput} />

        {/* Activate button */}
        <button
          onClick={handleActivate}
          disabled={loading || !isReady}
          className="w-full mt-6 py-5 rounded-2xl font-black text-base text-white/90 flex items-center justify-center gap-3 transition-all active:scale-[0.98] relative overflow-hidden"
          style={{
            background: isReady && !loading
              ? 'linear-gradient(135deg, rgba(251,115,30,0.3), rgba(234,88,12,0.2))'
              : 'rgba(255,255,255,0.03)',
            border: isReady && !loading
              ? '1px solid rgba(251,115,30,0.4)'
              : '1px solid rgba(255,255,255,0.06)',
            boxShadow: isReady && !loading
              ? '0 0 40px rgba(251,115,30,0.2)'
              : 'none',
            color: isReady && !loading ? '#fb923c' : 'rgba(255,255,255,0.25)',
          }}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Validating with KeyAuth...</>
          ) : (
            <><Key className="w-5 h-5" /> {isReady ? 'ACTIVATE KEY →' : 'ENTER VALID KEY →'}</>
          )}
        </button>

        <p className="text-center text-[11px] text-white/20 mt-4">
          Keys are activated instantly • Check your panels after activation
        </p>
      </div>

      {/* ── 1999X INTERNAL PANEL ── */}
      {intLicenses.length > 0 && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide">1999X INTERNAL PANEL</h3>
          </div>
          {intLicenses.map((lic, i) => (
            <LicenseCard key={lic.id} lic={lic} i={i} onCopy={copyKey} onReset={setHwidTarget} accentColor="blue" />
          ))}
        </div>
      )}

      {/* ── 1999X FAKE LAG PANEL ── */}
      {lagLicenses.length > 0 && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide">1999X FAKE LAG PANEL</h3>
          </div>
          {lagLicenses.map((lic, i) => (
            <LicenseCard key={lic.id} lic={lic} i={i} onCopy={copyKey} onReset={setHwidTarget} accentColor="purple" />
          ))}
        </div>
      )}

      {/* ── Download + Tutorial — ONLY shown after at least one key activated ── */}
      {hasAnyLicense && <DownloadSection />}

      {/* ── Empty state ── */}
      {!hasAnyLicense && (
        <div className="rounded-2xl p-14 text-center border border-white/5 bg-white/2 animate-fade-up">
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
