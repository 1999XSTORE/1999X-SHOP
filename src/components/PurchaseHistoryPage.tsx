import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Copy, Check, ShoppingBag, Calendar, Key } from 'lucide-react';

export default function PurchaseHistoryPage() {
  const { purchaseHistory } = useAppStore();
  const [copied, setCopied] = useState('');

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const typeLabels: Record<string, { label: string; color: string; bg: string }> = {
    weekly:  { label: '📅 Weekly',  color: '#10e898', bg: 'rgba(16,232,152,0.08)' },
    monthly: { label: '🗓️ Monthly', color: '#a78bfa', bg: 'rgba(139,92,246,0.08)' },
    combo:   { label: '🎯 Combo',   color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
    reward:  { label: '🎁 Reward',  color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
    trial:   { label: '⚡ Trial',   color: '#10e898', bg: 'rgba(16,232,152,0.08)' },
    lifetime:{ label: '♾️ Lifetime',color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="w-6 h-6" style={{ color: '#a78bfa' }} />
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>Purchase History</h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>All your past purchases and generated keys</p>
        </div>
      </div>

      {(!purchaseHistory || purchaseHistory.length === 0) ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No purchases yet.</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Head to the Shop to buy your first key.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchaseHistory.map((p) => {
            const type = typeLabels[p.productType] ?? { label: p.productType, color: '#a78bfa', bg: 'rgba(139,92,246,0.08)' };
            return (
              <div key={p.id} className="rounded-2xl p-5" style={{ background: 'rgba(10,8,20,0.9)', border: '1px solid rgba(139,92,246,0.15)', boxShadow: '0 0 20px rgba(109,40,217,0.05)' }}>
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{p.productName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: type.bg, color: type.color, border: `1px solid ${type.color}25` }}>
                        {type.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      <span className="flex items-center gap-1"><Calendar size={9} /> {formatDate(p.purchasedAt)}</span>
                      <span>→ Expires {formatDate(p.expiresAt)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-xl" style={{ color: '#10e898' }}>${p.amount}</div>
                  </div>
                </div>

                {/* Key row */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.12)' }}>
                  <Key size={13} style={{ color: '#a78bfa', flexShrink: 0 }} />
                  <span className="font-mono text-sm font-bold flex-1 truncate" style={{ color: '#c4b5fd' }}>{p.key}</span>
                  <button
                    onClick={() => copy(p.key, p.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex-shrink-0"
                    style={{
                      background: copied === p.id ? 'rgba(16,232,152,0.1)' : 'rgba(139,92,246,0.1)',
                      border: `1px solid ${copied === p.id ? 'rgba(16,232,152,0.25)' : 'rgba(139,92,246,0.2)'}`,
                      color: copied === p.id ? '#10e898' : '#a78bfa',
                    }}
                  >
                    {copied === p.id ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
