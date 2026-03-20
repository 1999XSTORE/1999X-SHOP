import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, PRODUCTS } from '@/lib/store';
import ProductCard from '@/components/ProductCard';
import { Wallet, Upload, ArrowRight, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AMOUNTS = [5, 10, 15, 25, 50, 100];
const METHODS = [
  { id: 'bkash' as const, label: 'bKash', desc: 'Send to: 01712345678', icon: '📱' },
  { id: 'binance' as const, label: 'Binance / Crypto', desc: 'USDT TRC20: TXyz...abc', icon: '₿' },
  { id: 'paypal' as const, label: 'PayPal', desc: 'Auto payment via PayPal', icon: '💳' },
];

export default function ProductsPage() {
  const { t } = useTranslation();
  const { transactions, addTransaction } = useAppStore();
  const [walletOpen, setWalletOpen] = useState(false);
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState<'bkash' | 'binance' | 'paypal'>('bkash');
  const [txnId, setTxnId] = useState('');
  const [step, setStep] = useState(1);

  const selectedAmount = customAmount ? parseFloat(customAmount) : amount;
  const statusIcon = { pending: <Clock className="w-3 h-3" />, approved: <CheckCircle className="w-3 h-3" />, rejected: <XCircle className="w-3 h-3" /> };
  const statusColor = { pending: 'text-primary bg-primary/10', approved: 'text-emerald bg-emerald/10', rejected: 'text-destructive bg-destructive/10' };

  const handleSubmit = () => {
    if (!txnId.trim()) { toast.error('Please enter transaction ID'); return; }
    addTransaction({ amount: selectedAmount, method, transactionId: txnId, status: 'pending' });
    toast.success('Payment submitted! Awaiting admin approval.');
    setStep(1); setTxnId(''); setCustomAmount('');
  };

  return (
    <div className="space-y-8">
      {/* Products header */}
      <div className="text-center animate-fade-up">
        <h1 className="text-3xl font-bold text-gradient-gold tracking-tight mb-2">1999X SHOP</h1>
        <p className="text-xs text-muted-foreground tracking-[4px] uppercase">Premium Software Solutions</p>
      </div>

      {/* Product cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1000px] mx-auto">
        {PRODUCTS.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-5 flex-wrap text-[11px] font-medium text-muted-foreground animate-fade-up" style={{ animationDelay: '600ms' }}>
        <span>🔒 Secure Payments</span>
        <span className="w-px h-3 bg-border" />
        <span>⚡ Instant Delivery</span>
        <span className="w-px h-3 bg-border" />
        <span>🛡 24/7 Support</span>
      </div>

      {/* Wallet section - collapsible */}
      <div className="max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '400ms' }}>
        <button
          onClick={() => setWalletOpen(!walletOpen)}
          className="w-full flex items-center justify-between glass-surface rounded-xl px-5 py-4 hover:bg-secondary/40 transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground">{t('wallet.title')}</span>
          </div>
          {walletOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {walletOpen && (
          <div className="mt-3 space-y-4 animate-fade-up">
            <div className="glass-surface rounded-xl p-5">
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground font-medium">{t('wallet.selectAmount')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {AMOUNTS.map(a => (
                      <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
                        className={cn('py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]',
                          amount === a && !customAmount ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        )}>
                        ${a}
                      </button>
                    ))}
                  </div>
                  <input type="number" placeholder={t('wallet.custom')} value={customAmount} onChange={e => setCustomAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:opacity-90 active:scale-[0.97]">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground font-medium">{t('wallet.paymentMethod')}</p>
                  <div className="space-y-2">
                    {METHODS.map(m => (
                      <button key={m.id} onClick={() => setMethod(m.id)}
                        className={cn('w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
                          method === m.id ? 'bg-primary/10 border border-primary/30' : 'bg-secondary hover:bg-secondary/80 border border-transparent'
                        )}>
                        <span className="text-lg">{m.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{m.label}</p>
                          <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="glass-surface rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">Amount to send:</p>
                    <p className="text-lg font-bold text-primary">${selectedAmount.toFixed(2)}</p>
                  </div>
                  <input placeholder={t('wallet.transactionId')} value={txnId} onChange={e => setTxnId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-dashed border-border cursor-pointer hover:border-primary/30 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t('wallet.screenshot')}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-all active:scale-[0.97]">Back</button>
                    <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all active:scale-[0.97]">{t('wallet.submit')}</button>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction History */}
            {transactions.length > 0 && (
              <div className="glass-surface rounded-xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">{t('wallet.history')}</h3>
                <div className="space-y-2">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-xs">
                          {tx.method === 'bkash' ? '📱' : tx.method === 'binance' ? '₿' : '💳'}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-foreground">${tx.amount} via {tx.method}</p>
                          <p className="text-[10px] text-muted-foreground">ID: {tx.transactionId}</p>
                        </div>
                      </div>
                      <span className={cn('flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full', statusColor[tx.status])}>
                        {statusIcon[tx.status]} {tx.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
