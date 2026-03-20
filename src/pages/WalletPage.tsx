import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Wallet, Upload, ArrowRight, CheckCircle, Clock, XCircle, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AMOUNTS = [5, 10, 15, 25, 50, 100];
const BKASH_NUMBER = '01712345678';
const BINANCE_ADDRESS = 'TXyz...abc';

const METHODS = [
  { id: 'bkash'   as const, label: 'bKash',      desc: `Send to: ${BKASH_NUMBER}`,       icon: '📱' },
  { id: 'binance' as const, label: 'Binance Pay', desc: `USDT TRC20: ${BINANCE_ADDRESS}`, icon: '₿'  },
];

export default function WalletPage() {
  const { t } = useTranslation();
  const { transactions, addTransaction, balance } = useAppStore();
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [method, setMethod] = useState<'bkash' | 'binance'>('bkash');
  const [txnId, setTxnId] = useState('');
  const [step, setStep] = useState(1);
  const [screenshotName, setScreenshotName] = useState('');

  const selectedAmount = customAmount ? parseFloat(customAmount) : amount;

  const handleSubmit = () => {
    if (!txnId.trim()) { toast.error('Please enter transaction ID'); return; }
    addTransaction({ amount: selectedAmount, method, transactionId: txnId, status: 'pending' });
    toast.success('✅ Payment submitted! Awaiting admin approval.');
    setStep(1); setTxnId(''); setCustomAmount(''); setScreenshotName('');
  };

  return (
    <div className="space-y-6 w-full">
      {/* Balance card */}
      <div className="rounded-2xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-white/3 animate-fade-up">
        <p className="text-xs text-white/40 mb-1">{t('wallet.title')}</p>
        <p className="text-4xl font-black text-white">${balance.toFixed(2)}</p>
        <p className="text-xs text-white/30 mt-1">Available balance</p>
      </div>

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

            {/* Payment details */}
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

            <input placeholder={t('wallet.transactionId')} value={txnId} onChange={e => setTxnId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />

            <label className="flex items-center gap-2 p-3 rounded-xl bg-white/3 border border-dashed border-white/10 cursor-pointer hover:border-purple-500/30 transition-colors">
              <Upload className="w-4 h-4 text-white/30" />
              <span className="text-xs text-white/30">{screenshotName || t('wallet.screenshot')}</span>
              <input type="file" className="hidden" accept="image/*" onChange={e => setScreenshotName(e.target.files?.[0]?.name || '')} />
            </label>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-semibold hover:bg-white/8 transition-all border border-white/5">Back</button>
              <button onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                {t('wallet.submit')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: '150ms' }}>
        <h3 className="text-sm font-bold text-white mb-3">{t('wallet.history')}</h3>
        {transactions.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    {tx.method === 'bkash' ? '📱' : '₿'}
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
