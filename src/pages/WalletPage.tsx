import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Wallet, ArrowRight, ArrowLeft, RefreshCw, Users, Check, X, Copy, CheckCircle, ExternalLink, Loader2, Zap, Shield } from 'lucide-react';
import { PRODUCTS } from '@/lib/store';
import { safeQuery } from '@/lib/safeFetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
//  ✏️  EDIT YOUR PAYMENT DETAILS HERE
// ============================================================
const PAYMENT_METHODS = [
  {
    id: 'bkash', label: 'bKash', emoji: '📱',
    bgClass: 'bg-pink-500/10 border-pink-500/20',
    qr: 'https://www.dropbox.com/scl/fi/0sfir9cpytsqso5z7idlw/01760889747-3_44_10-AM-Mar-21-2026.png.jpg?rlkey=dvxxouvnp3nxwrozpz5j12stc&st=33owmssu&dl=1',
    fields: [{ label: 'Number', value: '01760880747', note: 'Send Money (not Payment)' }],
    instruction: 'Open bKash → Send Money → enter number → send exact amount',
    hasQr: true,
  },
  {
    id: 'binance', label: 'Binance Pay', emoji: '🔶',
    bgClass: 'bg-yellow-500/10 border-yellow-500/20',
    qr: 'https://www.dropbox.com/scl/fi/vu9ys724n9vyij3kpnwd2/qr-image-1774043312091.png?rlkey=8601ge6mlljbzjcdkyn4f656i&st=qsf32sfb&dl=1',
    fields: [{ label: 'Pay ID', value: '1104953117', note: 'Binance Pay ID' }],
    instruction: 'Open Binance → Pay → scan QR or enter Pay ID',
    hasQr: true,
  },
  {
    id: 'dana', label: 'Dana', emoji: '🇮🇩',
    bgClass: 'bg-blue-500/10 border-blue-500/20',
    qr: 'YOUR_DANA_QR_URL',
    fields: [
      { label: 'Name',   value: 'Dana Account Name', note: '' },
      { label: 'Number', value: '08xxxxxxxxxx',       note: '' },
    ],
    instruction: 'Open Dana → Transfer → enter number or scan QR',
    hasQr: true,
  },
  {
    id: 'usdt_trc20', label: 'USDT TRC20', emoji: '💎',
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    qr: 'YOUR_USDT_TRC20_QR_URL',
    fields: [{ label: 'TRC20 Address', value: 'YOUR_TRC20_ADDRESS', note: 'Tron network only' }],
    instruction: 'Send USDT on Tron (TRC20) network only — wrong network = lost funds',
    hasQr: true,
  },
  {
    id: 'usdt_bep20', label: 'USDT BEP20', emoji: '🔷',
    bgClass: 'bg-yellow-500/10 border-yellow-500/20',
    qr: 'YOUR_USDT_BEP20_QR_URL',
    fields: [{ label: 'BEP20 Address', value: 'YOUR_BEP20_ADDRESS', note: 'BSC network only' }],
    instruction: 'Send USDT on BNB Smart Chain (BEP20) network only',
    hasQr: true,
  },
  {
    id: 'litecoin', label: 'Litecoin', emoji: '🪙',
    bgClass: 'bg-slate-500/10 border-slate-500/20',
    qr: 'YOUR_LTC_QR_URL',
    fields: [{ label: 'LTC Address', value: 'YOUR_LTC_ADDRESS', note: 'Litecoin network' }],
    instruction: 'Send LTC to the address above — double check network before sending',
    hasQr: true,
  },
  {
    id: 'paypal', label: 'PayPal', emoji: '🅿️',
    bgClass: 'bg-blue-600/10 border-blue-600/20',
    qr: '',
    fields: [{ label: 'PayPal.me', value: 'YOUR_PAYPAL_ME_URL', note: '' }],
    instruction: 'Click the button below to open PayPal and complete your payment',
    hasQr: false,
  },
] as const;

type MethodId = typeof PAYMENT_METHODS[number]['id'];
const AMOUNTS = [5, 10, 15, 25, 50, 100];

// ============================================================
//  Admin Panel
// ============================================================
function AdminPanel() {
  const [txns, setTxns]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter]   = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const intervalRef           = useRef<any>(null);

  const loadTxns = async () => {
    setLoading(true);
    const { data, error } = await safeQuery(() =>
      supabase.from('transactions').select('*').order('created_at', { ascending: false })
    );
    if (error) {
      if (error.message !== 'Request timed out') toast.error('Load failed: ' + error.message);
    } else {
      setTxns(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTxns();
    intervalRef.current = setInterval(loadTxns, 20000);
    const channel = supabase
      .channel('admin-txns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, loadTxns)
      .subscribe();
    return () => {
      clearInterval(intervalRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (tx: any) => {
    const { error } = await safeQuery(() =>
      supabase.from('transactions').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', tx.id)
    );
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success(`✅ Approved $${tx.amount} for ${tx.user_name}`);
    setTxns(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'approved' } : t));
  };

  const handleReject = async (tx: any) => {
    const { error } = await safeQuery(() =>
      supabase.from('transactions').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', tx.id)
    );
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.error(`Rejected payment from ${tx.user_name}`);
    setTxns(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'rejected' } : t));
  };

  const filtered      = filter === 'all' ? txns : txns.filter(t => t.status === filter);
  const pendingCount  = txns.filter(t => t.status === 'pending').length;
  const approvedTotal = txns.filter(t => t.status === 'approved').reduce((s, t) => s + Number(t.amount), 0);
  const methodEmoji   = (m: string) => PAYMENT_METHODS.find(p => p.id === m)?.emoji ?? '💳';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending',    value: pendingCount,                   color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20'  },
          { label: 'Total',      value: txns.length,                    color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20'      },
          { label: 'Approved $', value: `$${approvedTotal.toFixed(2)}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4 border text-center', s.bg)}>
            <p className={cn('text-xl font-black', s.color)}>{s.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5 font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-1">
          {(['pending','approved','rejected','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all',
                filter === f ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white/70')}>
              {f}{f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>
        <button onClick={loadTxns} disabled={loading}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-colors">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="space-y-2">
        {loading && txns.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-white/30">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No {filter} transactions</div>
        ) : (
          filtered.map(tx => (
            <div key={tx.id} className={cn('rounded-xl border p-4',
              tx.status === 'pending'  ? 'bg-yellow-500/5 border-yellow-500/15' :
              tx.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/15' :
              'bg-red-500/5 border-red-500/15')}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-white">{tx.user_name}</p>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                      tx.status === 'pending'  ? 'bg-yellow-500/20 text-yellow-400' :
                      tx.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-red-500/20 text-red-400')}>
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/30">{tx.user_email}</p>
                </div>
                <p className="text-xl font-black text-white">${Number(tx.amount).toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-[10px] text-white/30 mb-0.5">Method</p>
                  <p className="text-xs font-semibold text-white">{methodEmoji(tx.method)} {tx.method}</p>
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-[10px] text-white/30 mb-0.5">Transaction ID</p>
                  <p className="text-xs font-semibold text-white truncate">{tx.transaction_id}</p>
                </div>
              </div>
              <p className="text-[10px] text-white/20 mb-3">{new Date(tx.created_at).toLocaleString()}</p>
              {tx.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(tx)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-all active:scale-[0.97]">
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => handleReject(tx)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/25 transition-all active:scale-[0.97]">
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

// ============================================================
//  QR + Info Card
// ============================================================
function PaymentCard({ method, amount }: { method: typeof PAYMENT_METHODS[number]; amount: number }) {
  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`${label} copied!`); };

  if (!method.hasQr) {
    return (
      <div className={cn('rounded-2xl border p-6 text-center space-y-5', method.bgClass)}>
        <div className="text-5xl">{method.emoji}</div>
        <div>
          <p className="text-white font-bold text-lg mb-1">Pay via PayPal</p>
          <p className="text-xs text-white/40">{method.instruction}</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-[10px] text-white/40 mb-1">Amount to send</p>
          <p className="text-2xl font-black text-white">${amount.toFixed(2)}</p>
        </div>
        <a href={method.fields[0].value} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg,#003087,#009cde)' }}>
          <span className="text-xl">🅿️</span> Pay with PayPal <ExternalLink className="w-4 h-4" />
        </a>
        <p className="text-[10px] text-white/30">After paying, enter the PayPal transaction ID below</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border overflow-hidden', method.bgClass)}>
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-white/5">
        <span className="text-2xl">{method.emoji}</span>
        <div>
          <p className="font-bold text-white text-sm">{method.label}</p>
          <p className="text-[10px] text-white/40">{method.instruction}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
          <p className="text-xs text-white/40">Send exactly</p>
          <p className="text-2xl font-black text-white">${amount.toFixed(2)}</p>
        </div>
        {method.qr && !method.qr.startsWith('YOUR_') && (
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-3 shadow-lg" style={{ width: 180, height: 180 }}>
              <img src={method.qr} alt={`${method.label} QR`}
                className="w-full h-full object-contain rounded-lg"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>
        )}
        {method.qr && method.qr.startsWith('YOUR_') && (
          <div className="flex justify-center">
            <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl flex items-center justify-center" style={{ width: 180, height: 180 }}>
              <div className="text-center"><p className="text-3xl mb-2">📷</p><p className="text-[10px] text-white/30">QR coming soon</p></div>
            </div>
          </div>
        )}
        {method.fields.map((field, i) => (
          <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">{field.label}</p>
              {field.note && <span className="text-[10px] text-white/30 italic">{field.note}</span>}
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono font-bold text-white text-sm break-all flex-1">{field.value}</p>
              {!field.value.startsWith('YOUR_') && (
                <button onClick={() => copy(field.value, field.label)}
                  className="flex-shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <Copy className="w-3.5 h-3.5 text-white/40" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ============================================================
//  Product Card
// ============================================================
function ProductCard({ product, i, onBuy, balance }: { product: any; i: number; onBuy: (p: any) => void; balance: number }) {
  const canAfford = balance >= product.price;
  const badgeColors: any = {
    green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    gold:   { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20'  },
    indigo: { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20'  },
  };
  const bc = badgeColors[product.badgeType] ?? badgeColors.green;

  return (
    <div className="rounded-2xl p-5 border border-white/10 bg-white/3 hover:bg-white/5 transition-all flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', bc.bg, bc.text, bc.border)}>
          {product.badge}
        </span>
        <span className="text-xl font-black text-white">${product.price}</span>
      </div>
      <h3 className="text-sm font-bold text-white mb-1">{product.name}</h3>
      <p className="text-[11px] text-white/40 mb-4 flex-1">{product.description}</p>
      <div className="space-y-1.5 mb-4">
        {product.features.map((f: string) => (
          <div key={f} className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] text-white/60">{f}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => onBuy(product)}
        disabled={!canAfford}
        className={cn('w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-40',
          canAfford ? 'text-white' : 'bg-white/5 text-white/30 cursor-not-allowed')}
        style={canAfford ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' } : {}}
      >
        {canAfford ? `Buy — $${product.price}` : 'Insufficient Balance'}
      </button>
    </div>
  );
}

// ============================================================
//  Step Bar
// ============================================================
function StepBar({ step }: { step: number }) {
  const steps = ['Amount', 'Pay', 'Confirm'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === step, done = n < step;
        return (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-all',
                done ? 'bg-emerald-500 text-white' : active ? 'bg-purple-600 text-white ring-2 ring-purple-500/40' : 'bg-white/5 text-white/30')}>
                {done ? <CheckCircle className="w-4 h-4" /> : n}
              </div>
              <span className={cn('text-xs font-semibold', active ? 'text-white' : done ? 'text-emerald-400' : 'text-white/30')}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={cn('h-px flex-1', done ? 'bg-emerald-500/50' : 'bg-white/10')} />}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
//  Main WalletPage
// ============================================================
export default function WalletPage() {
  const { balance, addBalance, purchaseProduct, user } = useAppStore();
  const [step, setStep]               = useState<1 | 2 | 3>(1);
  const [amount, setAmount]           = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [methodId, setMethodId]       = useState<MethodId>('bkash');
  const [txnId, setTxnId]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [myTxns, setMyTxns]           = useState<any[]>([]);
  const [txnsLoading, setTxnsLoading] = useState(false);

  const isAdmin   = user?.role === 'admin';
  const isSupport = user?.role === 'support';

  const handleBuy = (product: any) => {
    if (balance < product.price) {
      toast.error('Insufficient balance. Add funds first.');
      return;
    }
    const license = purchaseProduct(product);
    if (license) toast.success(`🎉 ${product.name} purchased! Check your licenses.`);
  };

  const selectedAmount = customAmount ? parseFloat(customAmount) || 0 : amount;
  const selectedMethod = PAYMENT_METHODS.find(m => m.id === methodId) ?? PAYMENT_METHODS[0];

  // ── Load user transactions with hard timeout ──────────────
  const loadMyTxns = async () => {
    if (!user) return;
    setTxnsLoading(true);
    const { data } = await safeQuery(() =>
      supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    );
    setMyTxns(data ?? []);
    setTxnsLoading(false);
  };

  useEffect(() => {
    if (!user || isAdmin || isSupport) return;
    loadMyTxns();

    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'transactions',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
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

  // ── Submit with hard timeout ──────────────────────────────
  const handleSubmit = async () => {
    if (!txnId.trim())       { toast.error('Enter your transaction ID'); return; }
    if (!user)               { toast.error('Please login first'); return; }
    if (selectedAmount <= 0) { toast.error('Select a valid amount'); return; }

    setSubmitting(true);
    const { error } = await safeQuery(() =>
      supabase.from('transactions').insert({
        user_id:        user.id,
        user_email:     user.email,
        user_name:      user.name,
        amount:         selectedAmount,
        method:         methodId,
        transaction_id: txnId.trim(),
        status:         'pending',
      })
    );

    if (error) {
      if (error.message === 'Request timed out') {
        toast.error('Request timed out. Check your connection and try again.');
      } else if (error.message.includes('not found') || error.message.includes('relation')) {
        toast.error('Table not found. Run the SQL migrations in Supabase SQL Editor first.');
      } else if (error.message.includes('policy') || error.message.includes('permission')) {
        toast.error('Permission denied. Check RLS policies in Supabase.');
      } else {
        toast.error('Failed: ' + error.message);
      }
    } else {
      toast.success('✅ Payment submitted! Admin will approve shortly.');
      setStep(1);
      setTxnId('');
      setCustomAmount('');
      loadMyTxns();
    }
    setSubmitting(false);
  };

  // ── Admin view ────────────────────────────────────────────
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
              <p className="text-xs text-white/30">Realtime updates · auto-refreshes every 20s</p>
            </div>
          </div>
          <AdminPanel />
        </div>
      </div>
    );
  }

  // ── User view ─────────────────────────────────────────────
  return (
    <div className="space-y-6 w-full">

      {/* Products */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold text-white">Products</h2>
          <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400">OB52 Undetected</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTS.map((product, i) => (
            <ProductCard key={product.id} product={product} i={i} onBuy={handleBuy} balance={balance} />
          ))}
        </div>
      </div>

      {/* Balance */}
      <div className="rounded-2xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-white/3">
        <div className="flex items-center gap-3 mb-1">
          <Wallet className="w-4 h-4 text-purple-400" />
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Available Balance</p>
        </div>
        <p className="text-5xl font-black text-white">${balance.toFixed(2)}</p>
        <p className="text-xs text-white/30 mt-1">Approved deposits are credited instantly</p>
      </div>

      {/* Add Balance */}
      <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-sm font-bold text-white">Add Balance</h2>
          <p className="text-xs text-white/30 mt-0.5">Choose a payment method · Admin approval within minutes</p>
        </div>
        <div className="p-5">
          <StepBar step={step} />

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Select Amount</p>
              <div className="grid grid-cols-3 gap-2">
                {AMOUNTS.map(a => (
                  <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
                    className={cn('py-3.5 rounded-xl text-sm font-bold transition-all border',
                      amount === a && !customAmount
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/8')}>
                    ${a}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-bold">$</span>
                <input type="number" placeholder="Custom amount" value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
              </div>
              {selectedAmount > 0 && (
                <div className="rounded-xl bg-purple-500/8 border border-purple-500/20 p-3 flex items-center justify-between">
                  <span className="text-xs text-white/40">You will deposit</span>
                  <span className="text-lg font-black text-purple-300">${selectedAmount.toFixed(2)}</span>
                </div>
              )}
              <button onClick={() => selectedAmount > 0 ? setStep(2) : toast.error('Select an amount')}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 20px rgba(124,58,237,0.25)' }}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Payment Method</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.id} onClick={() => setMethodId(m.id)}
                    className={cn('flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 border transition-all',
                      methodId === m.id
                        ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20'
                        : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80')}>
                    <span>{m.emoji}</span><span>{m.label}</span>
                  </button>
                ))}
              </div>
              <PaymentCard method={selectedMethod} amount={selectedAmount} />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setStep(1)}
                  className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl bg-white/5 text-white/60 text-sm font-semibold border border-white/5">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                  I've Sent Payment <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{selectedMethod.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{selectedMethod.label}</p>
                    <p className="text-[10px] text-white/30">Payment method</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-white">${selectedAmount.toFixed(2)}</p>
                  <p className="text-[10px] text-white/30">Amount sent</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/50 block mb-2 uppercase tracking-wider">
                  Transaction / Reference ID
                </label>
                <input type="text" placeholder="Paste your transaction ID here"
                  value={txnId} onChange={e => setTxnId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !submitting && handleSubmit()}
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  autoComplete="off" />
                <p className="text-[10px] text-white/30 mt-2">
                  Enter the transaction ID or reference number you received after payment
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} disabled={submitting}
                  className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-xl bg-white/5 text-white/60 text-sm font-semibold border border-white/5 disabled:opacity-40">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleSubmit} disabled={submitting || !txnId.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                  {submitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                    : <><CheckCircle className="w-4 h-4" /> Submit Payment</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Transaction History</h3>
          <button onClick={loadMyTxns} disabled={txnsLoading}
            className="text-white/30 hover:text-white/60 transition-colors disabled:opacity-40">
            <RefreshCw className={cn('w-3.5 h-3.5', txnsLoading && 'animate-spin')} />
          </button>
        </div>
        {txnsLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-white/30">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Loading...</span>
          </div>
        ) : myTxns.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-6">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {myTxns.map(tx => {
              const m = PAYMENT_METHODS.find(p => p.id === tx.method);
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-base">
                      {m?.emoji ?? '💳'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">${tx.amount} via {m?.label ?? tx.method}</p>
                      <p className="text-[10px] text-white/30">{new Date(tx.created_at).toLocaleDateString()} · {tx.transaction_id}</p>
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border',
                    tx.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    tx.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20')}>
                    {tx.status === 'approved' ? '✓ Approved' : tx.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
