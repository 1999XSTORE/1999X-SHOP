import { useState, useEffect } from 'react';
import { License } from '@/lib/store';
import { CheckCircle, Key, Copy, Check, Shield, Clock } from 'lucide-react';

interface PurchaseSuccessModalProps {
  open: boolean;
  license: License | null;
  onClose: () => void;
}

function useCountdown(expiresAt: string) {
  const calc = () => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
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

function Countdown({ expiresAt }: { expiresAt: string }) {
  const { days, hours, mins, secs } = useCountdown(expiresAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-2 justify-center">
      {[{ v: days, l: 'd' }, { v: hours, l: 'h' }, { v: mins, l: 'm' }, { v: secs, l: 's' }].map(({ v, l }) => (
        <div key={l} className="text-center">
          <div className="rounded-lg px-2.5 py-1.5 font-mono font-bold text-lg" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', minWidth: 40 }}>
            {pad(v)}
          </div>
          <div className="text-[9px] mt-1 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

export default function PurchaseSuccessModal({ open, license, onClose }: PurchaseSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open || !license) return null;

  const copy = () => {
    navigator.clipboard.writeText(license.key).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const productTypeLabel: Record<string, string> = {
    weekly:  'Weekly',
    monthly: 'Monthly',
    combo:   'Combo — All Access',
    reward:  '3-Day Reward',
    trial:   'Trial',
    lifetime: 'Lifetime',
  };

  const label = productTypeLabel[license.productType ?? ''] ?? license.productName;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(8,14,22,0.96)',
          border: '1px solid rgba(16,232,152,0.3)',
          boxShadow: '0 0 80px rgba(16,232,152,0.15), 0 30px 60px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(24px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow bar */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #10e898 30%, #8b5cf6 70%, transparent)' }} />

        {/* Ambient */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #10e898, transparent 70%)' }} />

        <div className="p-7">
          {/* Success icon */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(16,232,152,0.12)', border: '1px solid rgba(16,232,152,0.3)', boxShadow: '0 0 32px rgba(16,232,152,0.2)' }}>
              <CheckCircle className="w-10 h-10" style={{ color: '#10e898' }} />
            </div>
            <h2 className="text-2xl font-black mb-1" style={{ color: 'rgba(255,255,255,0.95)' }}>Purchase Successful!</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Your {label} license is ready</p>
          </div>

          {/* Key card */}
          <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.28)', boxShadow: '0 0 30px rgba(109,40,217,0.1), inset 0 0 20px rgba(139,92,246,0.04)' }}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Key size={14} style={{ color: '#a78bfa' }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>License Key</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,232,152,0.1)', border: '1px solid rgba(16,232,152,0.25)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#10e898' }}>Active</span>
              </div>
            </div>

            {/* Key */}
            <div className="font-mono font-bold text-xl mb-4 break-all" style={{ color: '#c4b5fd', textShadow: '0 0 20px rgba(139,92,246,0.4)', letterSpacing: '0.08em' }}>
              {license.key}
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <div className="flex items-center gap-1.5">
                <Shield size={11} />
                <span>{license.boundEmail ?? 'Bound to your account'}</span>
              </div>
              <span className="font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
            </div>

            {/* Countdown */}
            {license.productType !== 'lifetime' && (
              <div>
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  <Clock size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Expires in</span>
                </div>
                <Countdown expiresAt={license.expiresAt} />
              </div>
            )}
            {license.productType === 'lifetime' && (
              <div className="text-center text-sm font-bold" style={{ color: '#10e898' }}>♾️ Lifetime Access</div>
            )}
          </div>

          {/* Buttons */}
          <button
            onClick={copy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all mb-3"
            style={{
              background: copied ? 'rgba(16,232,152,0.12)' : 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.15))',
              border: `1px solid ${copied ? 'rgba(16,232,152,0.35)' : 'rgba(139,92,246,0.4)'}`,
              color: copied ? '#10e898' : '#c4b5fd',
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : 'Copy License Key'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
