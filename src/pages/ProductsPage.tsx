import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, PRODUCTS } from '@/lib/store';
import { Wallet, Upload, ArrowRight, CheckCircle, Clock, XCircle, Zap, Shield, Star, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AMOUNTS = [5, 10, 15, 25, 50, 100];

// bKash QR placeholder (replace with real QR image URL)
const BKASH_QR = '';
const BKASH_NUMBER = '01712345678'; // replace with real number
const BINANCE_ADDRESS = 'TXyz...abc'; // replace with real USDT TRC20

const METHODS = [
  { id: 'bkash'   as const, label: 'bKash',           icon: '📱', detail: `Send to: ${BKASH_NUMBER}`, hasQR: true },
  { id: 'binance' as const, label: 'Binance Pay',      icon: '₿',  detail: `USDT TRC20: ${BINANCE_ADDRESS}`, hasQR: false },
];

export default function ProductsPage() {
  const { t } = useTranslation();
  const { transactions, addTransaction, balance, purchaseProduct, addLicense } = useAppStore();
  const [amount, setAmount]           = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod]           = useState<'bkash' | 'binance'>('bkash');
  const [txnId, setTxnId]             = useState('');
  const [step, setStep]               = useState(1);
  const [screenshotName, setScreenshotName] = useState('');

  const selectedAmount = customAmount ? parseFloat(customAmount) : amount;

  const handleSubmit = () => {
    if (!txnId.trim()) { toast.error('Please enter transaction ID'); return; }
    addTransaction({ amount: selectedAmount, method, transactionId: txnId, status: 'pending' });
    toast.success('✅ Payment submitted! Awaiting admin approval.');
    setStep(1); setTxnId(''); setCustomAmount(''); setScreenshotName('');
  };

  const handleBuy = (product: typeof PRODUCTS[0]) => {
    if (balance < product.price) {
      toast.error('Insufficient balance. Please add funds first.');
      return;
    }
    const license = purchaseProduct(product);
    if (license) toast.success(`🎉 ${product.name} purchased! Check your licenses.`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Products Section */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-bold text-white">Products</h2>
          <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400">OB52 Undetected</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTS.map((product, i) => (
            <ProductItem key={product.id} product={product} i={i} onBuy={handleBuy} balance={balance} />
          ))}
        </div>
      </div>

      {/* Payment Section */}
      <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden animate-fade-up">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white">Add Balance</h2>
          </div>
          <p className="text-xs text-white/30 mt-1">Manual verification · Approved within minutes</p>
        </div>

        {step === 1 && (
          <div className="p-5 space-y-4">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Select Amount</p>
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
              type="number" placeholder="Custom amount" value={customAmount}
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
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Payment Method</p>
            <div className="space-y-2">
              {METHODS.map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={cn('w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left border',
                    method === m.id
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-white/3 hover:bg-white/5 border-white/5'
                  )}>
                  <span className="text-2xl">{m.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{m.label}</p>
                    <p className="text-[10px] text-white/30">{m.detail}</p>
                  </div>
                  {method === m.id && <CheckCircle className="w-4 h-4 text-purple-400" />}
                </button>
              ))}
            </div>

            {/* bKash QR */}
            {method === 'bkash' && (
              <div className="rounded-xl p-4 bg-pink-500/5 border border-pink-500/15 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                  {BKASH_QR ? (
                    <img src={BKASH_QR} alt="bKash QR" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <QrCode className="w-10 h-10 text-pink-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-pink-400">bKash</p>
                  <p className="text-[11px] text-white/50 mt-0.5">Send <strong className="text-white">${selectedAmount}</strong> to</p>
                  <p className="text-sm font-mono font-bold text-white mt-0.5">{BKASH_NUMBER}</p>
                  <p className="text-[10px] text-white/30">Type: Send Money</p>
                </div>
              </div>
            )}

            {/* Binance info */}
            {method === 'binance' && (
              <div className="rounded-xl p-4 bg-yellow-500/5 border border-yellow-500/15">
                <p className="text-xs font-bold text-yellow-400 mb-1">Binance Pay (USDT TRC20)</p>
                <p className="text-[11px] text-white/50">Send <strong className="text-white">${selectedAmount} USDT</strong> to:</p>
                <code className="text-xs font-mono text-white/70 break-all mt-1 block">{BINANCE_ADDRESS}</code>
              </div>
            )}

            <div className="rounded-xl p-4 bg-white/3 border border-white/5 flex items-center justify-between">
              <p className="text-xs text-white/40">Amount to send:</p>
              <p className="text-xl font-bold text-purple-400">${selectedAmount.toFixed(2)}</p>
            </div>

            <input
              placeholder="Transaction ID / Reference number"
              value={txnId}
              onChange={e => setTxnId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />

            <label className="flex items-center gap-2 p-3 rounded-xl bg-white/3 border border-dashed border-white/10 cursor-pointer hover:border-purple-500/30 transition-colors">
              <Upload className="w-4 h-4 text-white/30" />
              <span className="text-xs text-white/30">{screenshotName || 'Upload payment screenshot (optional)'}</span>
              <input type="file" className="hidden" accept="image/*" onChange={e => setScreenshotName(e.target.files?.[0]?.name || '')} />
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-semibold hover:bg-white/8 transition-all border border-white/5">
                Back
              </button>
              <button onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                Submit Payment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up">
        <h3 className="text-sm font-bold text-white mb-3">{t('wallet.history')}</h3>
        {transactions.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                    {tx.method === 'bkash' ? '📱' : tx.method === 'binance' ? '₿' : '💳'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/80">${tx.amount} via {tx.method}</p>
                    <p className="text-[10px] text-white/30">ID: {tx.transactionId}</p>
                  </div>
                </div>
                <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full',
                  tx.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                  tx.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                  'bg-yellow-500/10 text-yellow-400'
                )}>
                  {tx.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : tx.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductItem({ product, i, onBuy, balance }: { product: typeof PRODUCTS[0]; i: number; onBuy: (p: any) => void; balance: number }) {
  const canAfford = balance >= product.price;
  const badgeColors = {
    green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    gold:   { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20' },
    indigo: { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
  };
  const bc = badgeColors[product.badgeType];

  return (
    <div
      className="rounded-2xl p-5 border border-white/10 bg-white/3 hover:bg-white/5 transition-all animate-fade-up flex flex-col"
      style={{
        animationDelay: `${i * 100}ms`,
        animation: `fadeUp 0.5s ease ${i * 0.1}s both, float 4s ease-in-out ${i * 0.5}s infinite`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', bc.bg, bc.text, bc.border)}>
          {product.badge}
        </span>
        <span className="text-xl font-black text-white">${product.price}</span>
      </div>

      <h3 className="text-sm font-bold text-white mb-1">{product.name}</h3>
      <p className="text-[11px] text-white/40 mb-4 flex-1">{product.description}</p>

      <div className="space-y-1.5 mb-4">
        {product.features.map(f => (
          <div key={f} className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] text-white/60">{f}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onBuy(product)}
        disabled={!canAfford}
        className={cn(
          'w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-40',
          canAfford
            ? 'text-white'
            : 'bg-white/5 text-white/30 cursor-not-allowed'
        )}
        style={canAfford ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' } : {}}
      >
        {canAfford ? `Buy — $${product.price}` : 'Insufficient Balance'}
      </button>
    </div>
  );
}
