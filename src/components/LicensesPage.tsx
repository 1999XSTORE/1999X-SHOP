import { useAppStore } from '@/lib/store';
import { Key, Plus } from 'lucide-react';
import LicenseCard from './LicenseCard';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function LicensesPage() {
  const { licenses, addLicense, user } = useAppStore();
  const [inputKey, setInputKey] = useState('');
  const [validating, setValidating] = useState(false);

  const activeLicenses   = licenses.filter(l => l.status === 'active');
  const expiredLicenses  = licenses.filter(l => l.status === 'expired');
  const bannedLicenses   = licenses.filter(l => l.status === 'banned');

  const handleActivate = async () => {
    const key = inputKey.trim().toUpperCase();
    if (!key) { toast.error('Enter a license key.'); return; }
    if (!user) { toast.error('Please sign in first.'); return; }

    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-key', {
        body: { key, panel_type: 'lag' },
      });

      if (error || !data?.success) {
        toast.error(data?.message ?? 'Invalid or expired key.');
        return;
      }

      const info = data.info ?? {};
      const id   = Math.random().toString(36).substring(2, 10);
      addLicense({
        id,
        productId:      'keyauth-validated',
        productName:    '1999X Panel',
        key,
        hwid:           info.hwid ?? '',
        lastLogin:      new Date().toISOString(),
        expiresAt:      info.expiry ? new Date(parseInt(info.expiry) * 1000).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
        status:         'active',
        ip:             info.ip ?? '',
        device:         info.username ?? '',
        hwidResetsUsed: 0,
        hwidResetMonth: new Date().getMonth(),
        boundEmail:     user.email,
      });
      setInputKey('');
      toast.success('License activated! 🎉');
    } catch {
      toast.error('Validation failed. Check your internet connection.');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Key className="w-6 h-6" style={{ color: '#a78bfa' }} />
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>My Licenses</h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>All your active and past license keys</p>
        </div>
      </div>

      {/* Activate Key input */}
      <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.2)' }}>
        <h3 className="font-semibold text-sm mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Activate License Key</h3>
        <div className="flex gap-2">
          <input
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleActivate()}
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
            className="flex-1 px-4 py-3 rounded-xl font-mono text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#c4b5fd' }}
          />
          <button
            onClick={handleActivate}
            disabled={validating}
            className="px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', color: '#a78bfa' }}
          >
            {validating ? (
              <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <><Plus size={14} /> Activate</>
            )}
          </button>
        </div>
      </div>

      {/* Active */}
      {activeLicenses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#10e898' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Active ({activeLicenses.length})
          </h2>
          <div className="space-y-3">
            {activeLicenses.map(l => <LicenseCard key={l.id} license={l} />)}
          </div>
        </div>
      )}

      {/* Expired */}
      {expiredLicenses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(251,191,36,0.7)' }}>
            Expired ({expiredLicenses.length})
          </h2>
          <div className="space-y-3">
            {expiredLicenses.map(l => <LicenseCard key={l.id} license={l} />)}
          </div>
        </div>
      )}

      {/* Banned */}
      {bannedLicenses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(248,113,113,0.7)' }}>
            Banned ({bannedLicenses.length})
          </h2>
          <div className="space-y-3">
            {bannedLicenses.map(l => <LicenseCard key={l.id} license={l} />)}
          </div>
        </div>
      )}

      {/* Empty */}
      {licenses.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Key className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No licenses yet.</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Purchase a key from the Shop or activate one above.</p>
        </div>
      )}
    </div>
  );
}
