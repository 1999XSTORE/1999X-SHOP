import { useState } from 'react';
import { useAppStore, type License } from '@/lib/store';
import { generateKey } from '@/lib/keyauth-generate';
import { toast } from 'sonner';
import { X, Wallet, Key, CheckCircle, Sparkles, Copy, Check, Clock } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; }
type Step = 'choose' | 'success-balance' | 'success-key';

export default function RewardModal({ open, onClose }: Props) {
  const { bonusPoints, user, addBalance, addLicense } = useAppStore();
  const [step,    setStep]    = useState<Step>('choose');
  const [license, setLicense] = useState<License | null>(null);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState<'balance' | 'key' | null>(null);

  if (!open) return null;

  // Deduct points helper (reaches into store directly)
  const deductPoints = () => {
    const store = useAppStore.getState();
    const newPts = store.bonusPoints - 100;
    // Update via claimRewardBalance but we'll override the balance part
    // Actually call the store's internal setter via the action
    useAppStore.setState({ bonusPoints: newPts });
    // Also persist to localStorage
    if (store.user?.id) {
      try {
        const raw  = localStorage.getItem(`1999x-user-${store.user.id}`);
        const data = raw ? JSON.parse(raw) : {};
        localStorage.setItem(`1999x-user-${store.user.id}`, JSON.stringify({ ...data, bonusPoints: newPts }));
      } catch {}
    }
  };

  const handleBalance = async () => {
    if (bonusPoints < 100) { toast.error('Not enough points.'); return; }
    setLoading('balance');
    await new Promise(r => setTimeout(r, 700));
    deductPoints();
    addBalance(3);
    setLoading(null);
    setStep('success-balance');
  };

  const handleKey = async () => {
    if (bonusPoints < 100) { toast.error('Not enough points.'); return; }
    if (!user)             { toast.error('Please sign in first.'); return; }
    setLoading('key');
    try {
      // ── Call real KeyAuth edge function ──
      const generated = await generateKey('reward', user.email);
      deductPoints();

      const id = Math.random().toString(36).substring(2, 10);
      const lic: License = {
        id,
        productId:      'reward',
        productName:    '3-Day Reward Key',
        key:            generated.key,
        hwid:           '',
        lastLogin:      new Date().toISOString(),
        expiresAt:      generated.expiry,
        status:         'active',
        ip:             '',
        device:         '',
        hwidResetsUsed: 0,
        hwidResetMonth: new Date().getMonth(),
        productType:    'reward',
        boundEmail:     user.email,
      };
      addLicense(lic);
      setLicense(lic);
      setStep('success-key');

      if (generated.source === 'local') {
        toast.info('Add KA_SELLER_KEY to Supabase for real KeyAuth keys.');
      }
    } catch (err: any) {
      toast.error('Key generation failed: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setLoading(null);
    }
  };

  const copyKey = () => {
    if (!license) return;
    navigator.clipboard.writeText(license.key).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExpiry = () => license
    ? new Date(license.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const handleClose = () => {
    setStep('choose');
    setLicense(null);
    setCopied(false);
    setLoading(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(14,12,25,0.96)',
          border: '1px solid rgba(139,92,246,0.35)',
          boxShadow: '0 0 80px rgba(109,40,217,0.25), 0 30px 60px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(24px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow bar */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #8b5cf6 40%, #10e898 70%, transparent)' }} />

        {/* Ambient blobs */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #10e898, transparent 70%)' }} />

        {/* Close */}
        <button onClick={handleClose} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <X size={16} />
        </button>

        <div className="p-8">

          {/* ── CHOOSE ── */}
          {step === 'choose' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                <Sparkles className="w-8 h-8" style={{ color: '#a78bfa' }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgba(255,255,255,0.95)' }}>Choose Your Reward</h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>You've earned 100 points! Pick your reward below.</p>

              <div className="space-y-3">
                {/* $3 Balance */}
                <button onClick={handleBalance} disabled={!!loading}
                  className="w-full relative group rounded-2xl p-5 text-left transition-all duration-200 overflow-hidden"
                  style={{ background: 'rgba(16,232,152,0.07)', border: '1px solid rgba(16,232,152,0.25)', opacity: loading === 'key' ? 0.5 : 1 }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: 'rgba(16,232,152,0.12)', border: '1px solid rgba(16,232,152,0.2)' }}>💰</div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-base" style={{ color: '#10e898' }}>Get $3 Balance</div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Added to your wallet instantly</div>
                    </div>
                    {loading === 'balance'
                      ? <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#10e898', borderTopColor: 'transparent' }} />
                      : <Wallet size={18} style={{ color: '#10e898', opacity: 0.7 }} />}
                  </div>
                </button>

                {/* 3-Day Key */}
                <button onClick={handleKey} disabled={!!loading}
                  className="w-full relative group rounded-2xl p-5 text-left transition-all duration-200 overflow-hidden"
                  style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)', opacity: loading === 'balance' ? 0.5 : 1 }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>🔑</div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-base" style={{ color: '#a78bfa' }}>Get 3-Day Key</div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Real KeyAuth license · bound to your account</div>
                    </div>
                    {loading === 'key'
                      ? <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
                      : <Key size={18} style={{ color: '#a78bfa', opacity: 0.7 }} />}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── SUCCESS BALANCE ── */}
          {step === 'success-balance' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5"
                style={{ background: 'rgba(16,232,152,0.15)', border: '1px solid rgba(16,232,152,0.3)', boxShadow: '0 0 32px rgba(16,232,152,0.2)' }}>
                <CheckCircle className="w-10 h-10" style={{ color: '#10e898' }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#10e898' }}>$3 Added! 🎉</h2>
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Your wallet has been credited instantly.</p>
              <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(16,232,152,0.07)', border: '1px solid rgba(16,232,152,0.2)' }}>
                <div className="text-4xl font-black" style={{ color: '#10e898' }}>+$3.00</div>
                <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Added to wallet balance</div>
              </div>
              <button onClick={handleClose} className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'rgba(16,232,152,0.12)', border: '1px solid rgba(16,232,152,0.25)', color: '#10e898' }}>
                Done
              </button>
            </div>
          )}

          {/* ── SUCCESS KEY ── */}
          {step === 'success-key' && license && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 32px rgba(109,40,217,0.2)' }}>
                <Key className="w-10 h-10" style={{ color: '#a78bfa' }} />
              </div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#a78bfa' }}>Key Generated! 🔑</h2>
              <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>Your 3-day KeyAuth license is ready.</p>

              {/* Key card */}
              <div className="rounded-2xl p-4 mb-4 text-left"
                style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 24px rgba(109,40,217,0.12)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>License Key</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(16,232,152,0.12)', color: '#10e898', border: '1px solid rgba(16,232,152,0.25)' }}>Active</span>
                </div>
                <div className="font-mono font-bold text-lg mb-3 break-all" style={{ color: '#a78bfa', letterSpacing: '0.05em' }}>
                  {license.key}
                </div>
                <div className="flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <span className="flex items-center gap-1"><Clock size={10} /> Expires {getExpiry()}</span>
                  <span>3-Day Reward</span>
                </div>
              </div>

              <button onClick={copyKey}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all mb-3 flex items-center justify-center gap-2"
                style={{ background: copied ? 'rgba(16,232,152,0.12)' : 'rgba(139,92,246,0.12)', border: `1px solid ${copied ? 'rgba(16,232,152,0.3)' : 'rgba(139,92,246,0.3)'}`, color: copied ? '#10e898' : '#a78bfa' }}>
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Key</>}
              </button>
              <button onClick={handleClose} className="w-full py-2.5 rounded-xl text-sm transition-all"
                style={{ color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
