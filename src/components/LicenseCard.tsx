import { useState, useEffect } from 'react';
import { useAppStore, type License } from '@/lib/store';
import { toast } from 'sonner';
import { Copy, Check, RefreshCw, Shield, Clock, Cpu, Monitor, AlertTriangle } from 'lucide-react';

function useCountdown(expiresAt: string) {
  const calc = () => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    const secs  = Math.floor((diff % 60000) / 1000);
    return { days, hours, mins, secs };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return t;
}

function CountdownDisplay({ expiresAt }: { expiresAt: string }) {
  const t = useCountdown(expiresAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (!t) return <span style={{ color: '#f87171' }}>Expired</span>;
  return (
    <span className="font-mono font-bold" style={{ color: t.days < 3 ? '#fbbf24' : '#10e898' }}>
      {t.days > 0 ? `${t.days}d ` : ''}{pad(t.hours)}:{pad(t.mins)}:{pad(t.secs)}
    </span>
  );
}

export default function LicenseCard({ license }: { license: License }) {
  const { resetHwid } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(license.key).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHwidReset = async () => {
    setResetting(true);
    await new Promise(r => setTimeout(r, 700));
    const ok = resetHwid(license.id);
    setResetting(false);
    if (ok) toast.success('HWID reset successfully!');
    else toast.error('Reset limit reached (2/month) or not available.');
  };

  const currentMonth = new Date().getMonth();
  const resetsUsed = license.hwidResetMonth === currentMonth ? license.hwidResetsUsed : 0;
  const resetsLeft = 2 - resetsUsed;
  const isLifetime = license.expiresAt === '2099-12-31T23:59:59Z';
  const isExpired  = !isLifetime && new Date(license.expiresAt) < new Date();
  const isBanned   = license.status === 'banned';

  const statusColor = isBanned ? '#f87171' : isExpired ? '#fbbf24' : '#10e898';
  const statusLabel = isBanned ? 'Banned' : isExpired ? 'Expired' : 'Active';

  const typeLabels: Record<string, string> = {
    weekly: '📅 Weekly', monthly: '🗓️ Monthly', combo: '🎯 Combo',
    reward: '🎁 Reward', trial: '⚡ Trial', lifetime: '♾️ Lifetime',
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,8,20,0.9)', border: `1px solid ${isBanned ? 'rgba(248,113,113,0.25)' : isExpired ? 'rgba(251,191,36,0.2)' : 'rgba(139,92,246,0.25)'}`, boxShadow: isBanned ? 'none' : '0 0 24px rgba(109,40,217,0.08)' }}>
      {/* Top glow */}
      <div style={{ height: 2, background: isBanned ? 'rgba(248,113,113,0.5)' : isExpired ? 'linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)' : 'linear-gradient(90deg, transparent, #8b5cf6 40%, #10e898 70%, transparent)' }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>{license.productName}</span>
              {license.productType && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                  {typeLabels[license.productType] ?? license.productType}
                </span>
              )}
            </div>
            {isBanned && (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#f87171' }}>
                <AlertTriangle size={11} /> This key has been disabled
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: `${statusColor}12`, border: `1px solid ${statusColor}30` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: statusColor }}>{statusLabel}</span>
          </div>
        </div>

        {/* Key display */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>License Key</span>
            <button onClick={copy} className="flex items-center gap-1 text-[10px] font-semibold transition-all px-2 py-1 rounded-lg" style={{ background: copied ? 'rgba(16,232,152,0.1)' : 'rgba(139,92,246,0.1)', color: copied ? '#10e898' : '#a78bfa', border: `1px solid ${copied ? 'rgba(16,232,152,0.2)' : 'rgba(139,92,246,0.2)'}` }}>
              {copied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy</>}
            </button>
          </div>
          <div className="font-mono font-bold text-base break-all" style={{ color: '#c4b5fd', letterSpacing: '0.06em', textShadow: '0 0 20px rgba(139,92,246,0.3)' }}>
            {license.key}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Expiry */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Time Left</span>
            </div>
            {isLifetime ? (
              <span className="font-bold text-sm" style={{ color: '#10e898' }}>♾️ Lifetime</span>
            ) : (
              <span className="text-sm"><CountdownDisplay expiresAt={license.expiresAt} /></span>
            )}
          </div>

          {/* HWID */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Cpu size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>HWID</span>
            </div>
            <span className="font-mono text-xs" style={{ color: license.hwid ? '#a78bfa' : 'rgba(255,255,255,0.25)' }}>
              {license.hwid ? license.hwid.substring(0, 12) + '...' : 'Not bound'}
            </span>
          </div>

          {/* Device */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Monitor size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Device</span>
            </div>
            <span className="text-xs" style={{ color: license.device ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }}>
              {license.device || 'Not logged in'}
            </span>
          </div>

          {/* Bound email */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Shield size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Bound Email</span>
            </div>
            <span className="text-[10px] truncate block" style={{ color: license.boundEmail ? '#10e898' : 'rgba(255,255,255,0.25)' }}>
              {license.boundEmail || 'Not bound'}
            </span>
          </div>
        </div>

        {/* Last login */}
        {license.lastLogin && (
          <div className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Last login: {new Date(license.lastLogin).toLocaleString()}
            {license.ip && ` · IP: ${license.ip}`}
          </div>
        )}

        {/* HWID Reset button */}
        <button
          onClick={handleHwidReset}
          disabled={resetsLeft <= 0 || resetting || isBanned}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: resetsLeft > 0 && !isBanned ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${resetsLeft > 0 && !isBanned ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.07)'}`,
            color: resetsLeft > 0 && !isBanned ? '#fbbf24' : 'rgba(255,255,255,0.2)',
            cursor: resetsLeft > 0 && !isBanned ? 'pointer' : 'not-allowed',
          }}
        >
          <RefreshCw size={13} className={resetting ? 'animate-spin' : ''} />
          {resetting ? 'Resetting...' : resetsLeft > 0 ? `Reset HWID (${resetsLeft} left this month)` : 'HWID Reset Limit Reached'}
        </button>
      </div>
    </div>
  );
}
