import { useAppStore, type Product, type License } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { Check, ShoppingCart, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import { generateKey } from '@/lib/keyauth-generate';
import PurchaseSuccessModal from './PurchaseSuccessModal';

const badgeStyles = {
  green:  { bg: 'bg-emerald/10 border-emerald/30',  text: 'text-emerald', dot: 'bg-emerald shadow-[0_0_6px] shadow-emerald' },
  gold:   { bg: 'bg-primary/10 border-primary/30',  text: 'text-primary', dot: 'bg-primary shadow-[0_0_6px] shadow-primary' },
  indigo: { bg: 'bg-indigo/10 border-indigo/28',    text: 'text-indigo',  dot: 'bg-indigo shadow-[0_0_6px] shadow-indigo'  },
};
const priceColor = { green: 'text-emerald', gold: 'text-primary', indigo: 'text-indigo' };
const tickColor  = { green: 'bg-emerald/12 text-emerald', gold: 'bg-primary/12 text-primary', indigo: 'bg-indigo/12 text-indigo' };
const cardBg = {
  green:  'glass-surface',
  gold:   'bg-[rgba(22,18,8,0.82)] border border-primary/30 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_40px_rgba(201,168,76,0.08)]',
  indigo: 'glass-surface',
};
const btnStyle = {
  green:  'bg-emerald/10 border border-emerald/30 text-emerald hover:bg-emerald/20 hover:shadow-[0_8px_22px_rgba(74,222,128,0.18)]',
  gold:   'bg-gradient-to-br from-primary to-gold-light text-background font-bold shadow-[0_4px_18px_rgba(201,168,76,0.32)] hover:shadow-[0_10px_28px_rgba(201,168,76,0.46)]',
  indigo: 'bg-indigo/10 border border-indigo/28 text-indigo hover:bg-indigo/20 hover:shadow-[0_8px_22px_rgba(165,180,252,0.16)]',
};
const floatAnim = [
  'animate-[float-1_10s_cubic-bezier(0.45,0.05,0.55,0.95)_infinite]',
  'animate-[float-2_12s_cubic-bezier(0.45,0.05,0.55,0.95)_1s_infinite]',
  'animate-[float-3_9s_cubic-bezier(0.45,0.05,0.55,0.95)_2s_infinite]',
];
const typeIcon: Record<string, string> = {
  weekly: '📅', monthly: '🗓️', combo: '🎯', lifetime: '♾️', reward: '🎁', trial: '⚡',
};

export default function ProductCard({ product, index }: { product: Product; index: number }) {
  const { t } = useTranslation();
  const { balance, user, addBalance, addLicense, addPurchaseRecord } = useAppStore();
  const [purchasing, setPurchasing] = useState(false);
  const [successLicense, setSuccessLicense] = useState<License | null>(null);
  const badge = badgeStyles[product.badgeType];

  const handlePurchase = async () => {
    if (!user)                  { toast.error('Please sign in first.');                        return; }
    if (balance < product.price){ toast.error(t('shop.insufficientBalance') ?? 'Insufficient balance'); return; }

    setPurchasing(true);
    try {
      // ── 1. Call Supabase edge function → real KeyAuth key ──
      const generated = await generateKey(product.productType ?? 'weekly', user.email);

      // ── 2. Deduct balance ──────────────────────────────────
      addBalance(-product.price);

      // ── 3. Build license object with real key + expiry ─────
      const id = Math.random().toString(36).substring(2, 10);
      const license: License = {
        id,
        productId:      product.id,
        productName:    product.name,
        key:            generated.key,
        hwid:           '',
        lastLogin:      new Date().toISOString(),
        expiresAt:      generated.expiry,
        status:         'active',
        ip:             '',
        device:         '',
        hwidResetsUsed: 0,
        hwidResetMonth: new Date().getMonth(),
        productType:    product.productType,
        boundEmail:     user.email,
      };

      // ── 4. Save to store ───────────────────────────────────
      addLicense(license);
      addPurchaseRecord({
        id,
        productId:   product.id,
        productName: product.name,
        productType: product.productType ?? 'weekly',
        amount:      product.price,
        key:         generated.key,
        expiresAt:   generated.expiry,
        purchasedAt: new Date().toISOString(),
      });

      // ── 5. Show success modal ──────────────────────────────
      setSuccessLicense(license);

      if (generated.source === 'local') {
        toast.info('Key generated locally. Add KA_SELLER_KEY to Supabase for real KeyAuth keys.');
      }
    } catch (err: any) {
      toast.error('Purchase failed: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <>
      <PurchaseSuccessModal
        open={!!successLicense}
        license={successLicense}
        onClose={() => setSuccessLicense(null)}
      />

      <div
        className={cn(
          'rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] relative group',
          cardBg[product.badgeType],
          floatAnim[index % 3],
        )}
        style={{ animationDelay: `${index * 200}ms` }}
      >
        {/* Shimmer top line */}
        <div className={cn('absolute top-0 left-0 right-0 h-px z-10',
          product.badgeType === 'gold'
            ? 'bg-gradient-to-r from-transparent via-primary/50 to-transparent'
            : 'shimmer-line'
        )} />

        {/* Image area */}
        <div className="relative h-[170px] bg-background/60 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-secondary to-background flex items-center justify-center">
            <span className="text-5xl opacity-60">{typeIcon[product.productType ?? ''] ?? '🔑'}</span>
          </div>
          {/* Badge */}
          <div className={cn('absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase backdrop-blur-xl border', badge.bg, badge.text)}>
            <span className={cn('w-[5px] h-[5px] rounded-full animate-[pulse-dot_2s_ease-in-out_infinite]', badge.dot)} />
            {product.badge}
          </div>
          {product.productType === 'combo' && (
            <div className="absolute top-2.5 right-2.5 z-10 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-xl"
              style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}>
              All Products
            </div>
          )}
          <div className={cn('absolute bottom-0 left-0 right-0 h-20 pointer-events-none',
            product.badgeType === 'gold'
              ? 'bg-gradient-to-t from-[rgba(22,18,8,0.95)] to-transparent'
              : 'bg-gradient-to-t from-card to-transparent'
          )} />
        </div>

        {/* Body */}
        <div className="p-[18px]">
          <h3 className="text-base font-bold text-foreground mb-1.5 tracking-tight">{product.name}</h3>
          <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-4">{product.description}</p>

          {/* Feature list */}
          <ul className="space-y-1.5 mb-4">
            {product.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[11px] font-medium text-secondary-foreground">
                <span className={cn('w-3.5 h-3.5 rounded flex items-center justify-center font-extrabold', tickColor[product.badgeType])}>
                  <Check className="w-2.5 h-2.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>

          {/* Instant delivery notice */}
          <div className="flex items-center gap-1.5 mb-3 py-2 px-3 rounded-lg text-[10px]"
            style={{ background: 'rgba(16,232,152,0.05)', border: '1px solid rgba(16,232,152,0.12)' }}>
            <Zap size={10} style={{ color: '#10e898' }} />
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Instant KeyAuth key delivery</span>
          </div>

          <div className="h-px bg-border mb-3.5" />

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mb-3.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">From</span>
            <span className={cn('text-[26px] font-extrabold tracking-tight leading-none', priceColor[product.badgeType])}>
              ${product.price}
            </span>
            <span className="text-[11px] text-muted-foreground">/{product.duration}</span>
          </div>

          {/* Buy button */}
          <button
            onClick={handlePurchase}
            disabled={purchasing}
            className={cn(
              'w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold transition-all duration-200 active:scale-[0.97]',
              btnStyle[product.badgeType],
              purchasing && 'opacity-60 pointer-events-none'
            )}
          >
            {purchasing ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Generating Key...
              </span>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                {t('products.buy') ?? 'Buy Now'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
