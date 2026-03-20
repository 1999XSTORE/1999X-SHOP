import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Wallet, Upload, ArrowRight, CheckCircle, Clock, XCircle, QrCode, RefreshCw, Users, DollarSign, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AMOUNTS = [5, 10, 15, 25, 50, 100];
const BKASH_NUMBER    = '01712345678';
const BINANCE_ADDRESS = 'TXyz...abc';

const METHODS = [
  { id: 'bkash'   as const, label: 'bKash',      desc: `Send to: ${BKASH_NUMBER}`,       icon: '📱' },
  { id: 'binance' as const, label: 'Binance Pay', desc: `USDT TRC20: ${BINANCE_ADDRESS}`, icon: '₿'  },
];

// ── Admin Panel ───────────────────────────────────────────────
function AdminPanel() {
  const { user, addBalance } = useAppStore();
  const [txns, setTxns]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const loadTxns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load: ' + error.message);
    else setTxns(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadTxns(); }, []);

  const handleApprove = async (tx: any) => {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', tx.id);

    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success(`✅ Approved $${tx.amount} for ${tx.user_name}`);
    setTxns(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'approved' } : t));
  };

  const handleReject = async (tx: any) => {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', tx.id);

    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success(`Rejected payment from ${tx.user_name}`);
    setTxns(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'rejected' } : t));
  };

  const filtered = filter === 'all' ? txns : txns.filter(t => t.status === filter);
  const pendingCount  = txns.filter(t => t.status === 'pending').length;
  const approvedTotal = txns.filter(t => t.status === 'approved').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',  value: pendingCount,            color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Total Txn', value: txns.length,            color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20'   },
          { label: 'Approved $', value: `$${approvedTotal.toFixed(2)}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4 border text-center', s.bg)}>
            <p className={cn('text-xl font-black', s.color)}>{s.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5 font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs + refresh */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-1">
          {(['pending','approved','rejected','all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all',
                filter === f ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/70'
              )}
            >
              {f}{f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
        <button
          onClick={loadTxns}
          disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-white/30 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No {filter} transactions</div>
        ) : (
          filtered.map(tx => (
            <div key={tx.id} className={cn(
              'rounded-xl border p-4 transition-all',
              tx.status === 'pending'  ? 'bg-yellow-500/5 border-yellow-500/15' :
              tx.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/15' :
              'bg-red-500/5 border-red-500/15'
            )}>
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-white">{tx.user_name}</p>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                      tx.status === 'pending'  ? 'bg-yellow-500/20 text-yellow-400' :
                      tx.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/30">{tx.user_email}</p>
                </div>
                <p className="text-xl font-black text-white">${Number(tx.amount).toFixed(2)}</p>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-[10px] text-white/30 mb-0.5">Method</p>
                  <p className="text-xs font-semibold text-white capitalize">{tx.method}</p>
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-[10px] text-white/30 mb-0.5">Transaction ID</p>
                  <p className="text-xs font-semibold text-white truncate">{tx.transaction_id}</p>
                </div>
              </div>
              <p className="text-[10px] text-white/20 mb-3">
                {new Date(tx.created_at).toLocaleString()}
              </p>

              {/* Action buttons — only for pending */}
              {tx.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(tx)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-all active:scale-[0.97]"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(tx)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/25 transition-all active:scale-[0.97]"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── User Wallet ───────────────────────────────────────────────
export default function WalletPage() {
  const { t } = useTranslation();
  const { balance, addBalance, user } = useAppStore();
  const [amount, setAmount]           = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod]           = useState<'bkash' | 'binance'>('bkash');
  const [txnId, setTxnId]             = useState('');
  const [step, setStep]               = useState(1);
  const [screenshotName, setScreenshotName] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [myTxns, setMyTxns]           = useState<any[]>([]);
  const [txnsLoading, setTxnsLoading] = useState(true);

  const isAdmin   = user?.role === 'admin';
  const isSupport = user?.role === 'support';

  const selectedAmount = customAmount ? parseFloat(customAmount) : amount;

  // Load this user's transactions from Supabase
  const loadMyTxns = async () => {
    if (!user) return;
    setTxnsLoading(true);
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyTxns(data ?? []);
    setTxnsLoading(false);
  };

  // Poll for status changes on pending txns (auto-credit balance when approved)
  useEffect(() => {
    if (!user || isAdmin || isSupport) return;
    loadMyTxns();

    const channel = supabase
      .channel('my-txns')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'transactions',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === 'approved') {
          addBalance(Number(updated.amount));
          toast.success(`🎉 Payment approved! $${updated.amount} added to your balance.`);
        } else if (updated.status === 'rejected') {
          toast.error(`Payment of $${updated.amount} was rejected.`);
        }
        setMyTxns(prev => prev.map(t => t.id === updated.id ? updated : t));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!txnId.trim())   { toast.error('Please enter transaction ID'); return; }
    if (!user)           { toast.error('Please login first'); return; }
    if (selectedAmount <= 0) { toast.error('Invalid amount'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('transactions').insert({
      user_id:        user.id,
      user_email:     user.email,
      user_name:      user.name,
      amount:         selectedAmount,
      method,
      transaction_id: txnId.trim(),
      status:         'pending',
    });

    if (error) {
      toast.error('Failed to submit: ' + error.message);
    } else {
      toast.success('✅ Payment submitted! Awaiting admin approval.');
      setStep(1); setTxnId(''); setCustomAmount(''); setScreenshotName('');
      loadMyTxns();
    }
    setSubmitting(false);
  };

  // ── Admin/Support view ────────────────────────────────────
  if (isAdmin || isSupport) {
    return (
      <div className="space-y-6 w-full">
        <div className="rounded-2xl p-5 border border-white/10 bg-white/3">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Payment Approvals</h2>
              <p className="text-xs text-white/30">Review and approve user deposit requests</p>
            </div>
          </div>
          <AdminPanel />
        </div>
      </div>
    );
  }

  // ── Regular user view ─────────────────────────────────────
  return (
    <div className="space-y-6 w-full">
      {/* Balance card */}
      <div className="rounded-2xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-white/3 animate-fade-up">
        <p className="text-xs text-white/40 mb-1">{t('wallet.title')}</p>
        <p className="text-4xl font-black text-white">${balance.toFixed(2)}</p>
        <p className="text-xs text-white/30 mt-1">Available balance</p>
      </div>

      {/* Add Balance */}
      <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden animate-fade-up">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-sm font-bold text-white">Add Balance</h2>
          <p className="text-xs text-white/30 mt-0.5">Manual verification · Approved within minutes</p>
        </div>

        {step === 1 && (
          <div className="p-5 space-y-4">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">{t('wallet.selectAmount')}</p>
            <div className="grid grid-cols-3 gap-2">
              {AMOUNTS.map(a => (
                <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
                  className={cn('py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]',
                    amount === a && !customAmount
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/8 border border-white/5'
                  )}>
                  ${a}
                </button>
              ))}
            </div>
            <input
              type="number" placeholder={t('wallet.custom')} value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
            <button onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 20px rgba(124,58,237,0.25)' }}>
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="p-5 space-y-4">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">{t('wallet.paymentMethod')}</p>
            <div className="space-y-2">
              {METHODS.map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={cn('w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left border',
                    method === m.id ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/3 hover:bg-white/5 border-white/5'
                  )}>
                  <span className="text-2xl">{m.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{m.label}</p>
                    <p className="text-[10px] text-white/30">{m.desc}</p>
                  </div>
                  {method === m.id && <CheckCircle className="w-4 h-4 text-purple-400" />}
                </button>
              ))}
            </div>

            {method === 'bkash' && (
              <div className="rounded-xl p-4 bg-pink-500/5 border border-pink-500/15 flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-8 h-8 text-pink-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-pink-400">bKash</p>
                  <p className="text-[11px] text-white/50 mt-0.5">Send <strong className="text-white">${selectedAmount}</strong> to</p>
                  <p className="text-base font-mono font-bold text-white">{BKASH_NUMBER}</p>
                </div>
              </div>
            )}
            {method === 'binance' && (
              <div className="rounded-xl p-4 bg-yellow-500/5 border border-yellow-500/15">
                <p className="text-xs font-bold text-yellow-400 mb-1">Binance Pay (USDT TRC20)</p>
                <code className="text-xs font-mono text-white/60 break-all">{BINANCE_ADDRESS}</code>
              </div>
            )}

            <div className="rounded-xl p-4 bg-white/3 border border-white/5 flex items-center justify-between">
              <p className="text-xs text-white/40">Amount:</p>
              <p className="text-xl font-bold text-purple-400">${selectedAmount.toFixed(2)}</p>
            </div>

            <input
              placeholder={t('wallet.transactionId')} value={txnId}
              onChange={e => setTxnId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />

            <label className="flex items-center gap-2 p-3 rounded-xl bg-white/3 border border-dashed border-white/10 cursor-pointer hover:border-purple-500/30 transition-colors">
              <Upload className="w-4 h-4 text-white/30" />
              <span className="text-xs text-white/30">{screenshotName || t('wallet.screenshot')}</span>
              <input type="file" className="hidden" accept="image/*" onChange={e => setScreenshotName(e.target.files?.[0]?.name || '')} />
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-semibold hover:bg-white/8 transition-all border border-white/5">Back</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                {submitting ? 'Submitting...' : t('wallet.submit')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History from Supabase */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: '150ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">{t('wallet.history')}</h3>
          <button onClick={loadMyTxns} className="text-white/30 hover:text-white/60 transition-colors">
            <RefreshCw className={cn('w-3.5 h-3.5', txnsLoading && 'animate-spin')} />
          </button>
        </div>
        {txnsLoading ? (
          <p className="text-xs text-white/30 text-center py-4">Loading...</p>
        ) : myTxns.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {myTxns.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    {tx.method === 'bkash' ? '📱' : '₿'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/80">${tx.amount} via {tx.method}</p>
                    <p className="text-[10px] text-white/30">ID: {tx.transaction_id}</p>
                  </div>
                </div>
                <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full',
                  tx.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                  tx.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                  'bg-yellow-500/10 text-yellow-400'
                )}>
                  {tx.status === 'approved' ? '✓ Approved' : tx.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
