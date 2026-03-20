import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Key, Copy, RefreshCw, Globe, Clock, Shield, Eye, EyeOff, Download, BookOpen, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

// HWID Reset Confirmation Modal
function HwidResetModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f0f1f] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Reset HWID?</h3>
            <p className="text-[10px] text-white/40">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-xs text-white/60 mb-5">
          Are you sure you want to reset your HWID? This will allow you to use the license on a different device. You have limited resets per month.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/70 text-sm font-semibold hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-orange-500/20 text-orange-400 text-sm font-bold hover:bg-orange-500/30 transition-all border border-orange-500/20">
            Yes, Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LicensesPage() {
  const { licenses, resetHwid, addLicense, user } = useAppStore();
  const [activateKey, setActivateKey] = useState('');
  const [showKey, setShowKey]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [hwidResetTarget, setHwidResetTarget] = useState<string | null>(null);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Copied to clipboard!');
  };

  const handleResetHwid = (id: string) => {
    setHwidResetTarget(id);
  };

  const confirmResetHwid = () => {
    if (!hwidResetTarget) return;
    const success = resetHwid(hwidResetTarget);
    if (success) toast.success('HWID reset successfully');
    else toast.error('Reset limit reached (2/month)');
    setHwidResetTarget(null);
  };

  const handleActivateKey = async () => {
    const key = activateKey.trim().toUpperCase();
    if (!key) { toast.error('Please enter a license key'); return; }

    const existing = licenses.find(l => l.key === key);
    if (existing) { toast.error('This key is already activated'); return; }

    // Bind key to user's Google account
    if (!user) { toast.error('Please login first'); return; }

    setLoading(true);
    try {
      // Try LAG key first, then INTERNAL key
      let lagData: any = null;
      let internalData: any = null;

      // Validate against LAG app
      const lagRes = await supabase.functions.invoke('validate-key', {
        body: { key, appName: 'lag' },
      });
      if (!lagRes.error && lagRes.data?.success) {
        lagData = lagRes.data;
      }

      // Validate against INTERNAL app
      const intRes = await supabase.functions.invoke('validate-key', {
        body: { key, appName: 'internal' },
      });
      if (!intRes.error && intRes.data?.success) {
        internalData = intRes.data;
      }

      if (!lagData && !internalData) {
        toast.error(lagRes.data?.message ?? 'Invalid license key');
        setLoading(false);
        return;
      }

      // Add LAG license if found
      if (lagData) {
        const expiry = lagData.info?.expiry
          ? new Date(parseInt(lagData.info.expiry) * 1000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();

        addLicense({
          id:             Math.random().toString(36).substring(2, 10),
          productId:      'keyauth-lag',
          productName:    'Lag Bypass',
          key,
          hwid:           lagData.info?.hwid      ?? '',
          lastLogin:      lagData.info?.lastlogin  ? new Date(parseInt(lagData.info.lastlogin) * 1000).toISOString() : new Date().toISOString(),
          expiresAt:      expiry,
          status:         'active',
          ip:             lagData.info?.ip         ?? '',
          device:         '',
          hwidResetsUsed: 0,
          hwidResetMonth: new Date().getMonth(),
        });
      }

      // Add INTERNAL license if found
      if (internalData) {
        const expiry = internalData.info?.expiry
          ? new Date(parseInt(internalData.info.expiry) * 1000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();

        addLicense({
          id:             Math.random().toString(36).substring(2, 10) + '_int',
          productId:      'keyauth-internal',
          productName:    'Internal',
          key: key + '_INTERNAL',
          hwid:           internalData.info?.hwid      ?? '',
          lastLogin:      internalData.info?.lastlogin  ? new Date(parseInt(internalData.info.lastlogin) * 1000).toISOString() : new Date().toISOString(),
          expiresAt:      expiry,
          status:         'active',
          ip:             internalData.info?.ip         ?? '',
          device:         '',
          hwidResetsUsed: 0,
          hwidResetMonth: new Date().getMonth(),
        });
      }

      toast.success('🎉 License activated successfully!');
      setActivateKey('');
    } catch (e) {
      toast.error('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  // Group licenses by original key (lag and internal share same base key)
  const lagLicenses = licenses.filter(l => l.productId === 'keyauth-lag' || (l.productId === 'keyauth' && !l.key.endsWith('_INTERNAL')));
  const intLicenses = licenses.filter(l => l.productId === 'keyauth-internal' || l.key.endsWith('_INTERNAL'));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {hwidResetTarget && (
        <HwidResetModal
          onConfirm={confirmResetHwid}
          onCancel={() => setHwidResetTarget(null)}
        />
      )}

      {/* Activate Key Section */}
      <div className="rounded-2xl p-6 border border-white/10 bg-white/3 backdrop-blur animate-fade-up">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">Activate License Key</h2>
        </div>
        <p className="text-xs text-white/40 mb-5">
          Enter your KeyAuth license key to activate both panels (Lag Bypass + Internal).
        </p>

        <div className="relative mb-4">
          <label className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1.5 block">License Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={activateKey}
              onChange={e => setActivateKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleActivateKey()}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 tracking-widest"
            />
            <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/5 transition-colors">
              {showKey ? <EyeOff className="w-4 h-4 text-white/30" /> : <Eye className="w-4 h-4 text-white/30" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleActivateKey}
          disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 30px rgba(124,58,237,0.3)' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
          {loading ? 'Validating with KeyAuth...' : '⚡ Activate Key'}
        </button>
      </div>

      {/* 1999X INTERNAL PANEL */}
      {intLicenses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">1999X INTERNAL PANEL</h3>
          </div>
          {intLicenses.map((lic, i) => (
            <LicenseCard key={lic.id} lic={{ ...lic, key: lic.key.replace('_INTERNAL', '') }} i={i} onCopy={copyKey} onReset={handleResetHwid} accentColor="blue" />
          ))}
        </div>
      )}

      {/* 1999X FAKE LAG PANEL */}
      {lagLicenses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">1999X FAKE LAG PANEL</h3>
          </div>
          {lagLicenses.map((lic, i) => (
            <LicenseCard key={lic.id} lic={lic} i={i} onCopy={copyKey} onReset={handleResetHwid} accentColor="purple" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {licenses.length === 0 && (
        <div className="rounded-2xl p-12 text-center border border-white/5 bg-white/2 animate-fade-up">
          <Key className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white/40 mb-1">No licenses yet</p>
          <p className="text-xs text-white/20">Enter your license key above to activate access.</p>
        </div>
      )}
    </div>
  );
}

function LicenseCard({ lic, i, onCopy, onReset, accentColor }: { lic: any; i: number; onCopy: (k: string) => void; onReset: (id: string) => void; accentColor: 'purple' | 'blue' }) {
  const accent = accentColor === 'purple' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  const glowColor = accentColor === 'purple' ? 'rgba(124,58,237,0.15)' : 'rgba(59,130,246,0.15)';

  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/10 bg-white/3 backdrop-blur animate-fade-up"
      style={{ animationDelay: `${i * 100}ms`, boxShadow: `0 0 40px ${glowColor}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', accentColor === 'purple' ? 'bg-purple-500/15' : 'bg-blue-500/15')}>
            <CheckCircle className={cn('w-4 h-4', accentColor === 'purple' ? 'text-purple-400' : 'text-blue-400')} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">{lic.productName}</h3>
            <p className="text-[10px] text-white/30">KeyAuth License · Bound to account</p>
          </div>
        </div>
        <span className={cn('text-[10px] font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1.5 border', accent)}>
          <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', accentColor === 'purple' ? 'bg-purple-400' : 'bg-blue-400')} />
          {lic.status}
        </span>
      </div>

      {/* Key display */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-white/3 border border-white/5">
          <code className="flex-1 text-sm font-mono text-white tracking-[3px] font-semibold">{lic.key}</code>
          <button onClick={() => onCopy(lic.key)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-1.5 active:scale-[0.95]">
            <Copy className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-semibold text-white/40">Copy</span>
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <InfoItem icon={Shield} label="HWID" value={lic.hwid || 'Not set'} />
          <InfoItem icon={Globe} label="IP" value={lic.ip || 'Unknown'} />
          <InfoItem icon={Clock} label="LAST LOGIN" value={new Date(lic.lastLogin).toLocaleDateString()} />
          <div className="p-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold">
              <Clock className="w-2.5 h-2.5" /> Expiry
            </p>
            <p className="text-sm font-bold"><ExpiryCountdown expiresAt={lic.expiresAt} /></p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex flex-wrap gap-2">
        <button
          onClick={() => onReset(lic.id)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-white/60 hover:bg-white/10 transition-all active:scale-[0.97] border border-white/5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset HWID ({2 - lic.hwidResetsUsed} left)
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-[0.97] border border-emerald-500/20">
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-500/10 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-all active:scale-[0.97] border border-indigo-500/20">
          <BookOpen className="w-3.5 h-3.5" />
          Tutorial
        </button>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/3 border border-white/5">
      <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold">
        <Icon className="w-2.5 h-2.5" /> {label}
      </p>
      <p className="text-sm font-bold text-white truncate">{value}</p>
    </div>
  );
}
