import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Key, Copy, RefreshCw, Monitor, Globe, Clock, Shield, Eye, EyeOff, Lock, Download, BookOpen, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

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
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [expiresAt]);
  return <span className={timeLeft === 'Expired' ? 'text-destructive' : 'text-emerald'}>{timeLeft}</span>;
}

export default function LicensesPage() {
  const { t } = useTranslation();
  const { licenses, resetHwid } = useAppStore();
  const [activateKey, setActivateKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [activatedKeys, setActivatedKeys] = useState<Set<string>>(new Set());

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success(t('licenses.copied'));
  };

  const handleResetHwid = (id: string) => {
    const success = resetHwid(id);
    if (success) toast.success('HWID reset successfully');
    else toast.error('Reset limit reached (2/month)');
  };

  const handleActivateKey = () => {
    const key = activateKey.trim().toUpperCase();
    if (!key) { toast.error('Please enter a license key'); return; }
    const found = licenses.find(l => l.key === key);
    if (found) {
      setActivatedKeys(prev => new Set(prev).add(found.id));
      toast.success('License key activated!');
      setActivateKey('');
    } else {
      toast.error('Invalid license key');
    }
  };

  const isActivated = (id: string) => activatedKeys.has(id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Activate Key Section */}
      <div className="glass-surface rounded-2xl p-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Activate License Key</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Paste your license key below to activate your panel access. After purchase you will receive a key via email or dashboard.
        </p>

        <div className="relative mb-4">
          <label className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5 block">License Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={activateKey}
              onChange={e => setActivateKey(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3.5 rounded-xl bg-secondary border border-border text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 tracking-widest"
            />
            <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/50 transition-colors">
              {showKey ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleActivateKey}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] shadow-lg shadow-indigo-500/25"
        >
          <Key className="w-4 h-4" />
          Activate Key
        </button>
      </div>

      {/* License Cards */}
      {licenses.length === 0 ? (
        <div className="glass-surface rounded-2xl p-12 text-center animate-fade-up">
          <Key className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No licenses yet. Purchase a product to get started.</p>
        </div>
      ) : (
        licenses.map((lic, i) => {
          const activated = isActivated(lic.id);
          return (
            <div key={lic.id} className="glass-surface rounded-2xl overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
              {/* License header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', activated ? 'bg-emerald/15' : 'bg-muted')}>
                    {activated ? <CheckCircle className="w-4 h-4 text-emerald" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{lic.productName}</h3>
                    <p className="text-[10px] text-muted-foreground">License Key</p>
                  </div>
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1.5',
                  lic.status === 'active' ? 'bg-emerald/10 text-emerald' : 'bg-destructive/10 text-destructive'
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', lic.status === 'active' ? 'bg-emerald animate-pulse' : 'bg-destructive')} />
                  {lic.status}
                </span>
              </div>

              {/* License key display */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 p-4 rounded-xl bg-secondary/80 border border-border">
                  <code className="flex-1 text-base font-mono text-foreground tracking-[3px] font-semibold">
                    {activated ? lic.key : '••••-••••-••••-••••'}
                  </code>
                  {activated && (
                    <button onClick={() => copyKey(lic.key)}
                      className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1.5 active:scale-[0.95]">
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground">Copy Key</span>
                    </button>
                  )}
                </div>
              </div>

              {activated ? (
                <>
                  {/* Info grid */}
                  <div className="px-5 pb-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <InfoItem icon={Shield} label="HWID" value={lic.hwid} />
                      <InfoItem icon={Clock} label="LAST LOGIN" value={new Date(lic.lastLogin).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} />
                      <div className="p-3 rounded-xl bg-muted/40">
                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold">
                          <Clock className="w-2.5 h-2.5" /> Expiry
                        </p>
                        <p className="text-sm font-bold">
                          <ExpiryCountdown expiresAt={lic.expiresAt} />
                        </p>
                      </div>
                      <InfoItem icon={Globe} label="STATUS" value={lic.status === 'active' ? '● Active' : '● Expired'} valueClass={lic.status === 'active' ? 'text-emerald' : 'text-destructive'} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-5 pb-5 flex flex-wrap gap-2">
                    <button onClick={() => handleResetHwid(lic.id)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-all active:scale-[0.97]">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset HWID ({2 - lic.hwidResetsUsed} left)
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald/10 text-xs font-semibold text-emerald hover:bg-emerald/20 transition-all active:scale-[0.97]">
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo/10 text-xs font-semibold text-indigo hover:bg-indigo/20 transition-all active:scale-[0.97]">
                      <BookOpen className="w-3.5 h-3.5" />
                      Tutorials
                    </button>
                  </div>
                </>
              ) : (
                /* Locked state */
                <div className="px-5 pb-5">
                  <div className="rounded-xl border border-dashed border-border p-8 text-center bg-muted/20">
                    <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Premium Content Locked</p>
                    <p className="text-[10px] text-muted-foreground">Activate this license key above to unlock downloads, tutorials, and full access.</p>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, valueClass }: { icon: any; label: string; value: string; valueClass?: string }) {
  return (
    <div className="p-3 rounded-xl bg-muted/40">
      <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold">
        <Icon className="w-2.5 h-2.5" /> {label}
      </p>
      <p className={cn('text-sm font-bold text-foreground truncate', valueClass)}>{value}</p>
    </div>
  );
}
