import { useAppStore, type Product } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { Check, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';

const badgeStyles = {
  green: { bg: 'bg-emerald/10 border-emerald/30', text: 'text-emerald', dot: 'bg-emerald shadow-[0_0_6px] shadow-emerald' },
  gold: { bg: 'bg-primary/10 border-primary/30', text: 'text-primary', dot: 'bg-primary shadow-[0_0_6px] shadow-primary' },
  indigo: { bg: 'bg-indigo/10 border-indigo/30', text: 'text-indigo', dot: 'bg-indigo shadow-[0_0_6px] shadow-indigo' },
};

const priceColor = { green: 'text-emerald', gold: 'text-primary', indigo: 'text-indigo' };
const tickColor = { green: 'bg-emerald/12 text-emerald', gold: 'bg-primary/12 text-primary', indigo: 'bg-indigo/12 text-indigo' };

const cardBg = {
  green: 'glass-surface',
  gold: 'bg-[rgba(22,18,8,0.82)] border border-primary/30 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_40px_rgba(201,168,76,0.08)]',
  indigo: 'glass-surface',
};

const btnStyle = {
  green: 'bg-emerald/10 border border-emerald/30 text-emerald hover:bg-emerald/20 hover:shadow-[0_8px_22px_rgba(74,222,128,0.18)]',
  gold: 'bg-gradient-to-br from-primary to-gold-light text-background font-bold shadow-[0_4px_18px_rgba(201,168,76,0.32)] hover:shadow-[0_10px_28px_rgba(201,168,76,0.46)]',
  indigo: 'bg-indigo/10 border border-indigo/28 text-indigo hover:bg-indigo/20 hover:shadow-[0_8px_22px_rgba(165,180,252,0.16)]',
};

const floatAnim = ['animate-[float-1_10s_cubic-bezier(0.45,0.05,0.55,0.95)_infinite]', 'animate-[float-2_12s_cubic-bezier(0.45,0.05,0.55,0.95)_1s_infinite]', 'animate-[float-3_9s_cubic-bezier(0.45,0.05,0.55,0.95)_2s_infinite]'];

export default function ProductCard({ product, index }: { product: Product; index: number }) {
  const { t } = useTranslation();
  const { balance, purchaseProduct } = useAppStore();
  const [purchasing, setPurchasing] = useState(false);
  const badge = badgeStyles[product.badgeType];

  const handlePurchase = () => {
    if (balance < product.price) {
      toast.error(t('products.insufficient'));
      return;
    }
    setPurchasing(true);
    setTimeout(() => {
      const license = purchaseProduct(product);
      setPurchasing(false);
      if (license) {
        toast.success(`Purchased! Key: ${license.key}`);
      }
    }, 800);
  };

  return (
    <div className={cn(
      'rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] relative group',
      cardBg[product.badgeType],
      floatAnim[index % 3],
    )}
      style={{ animationDelay: `${index * 200}ms` }}
    >
      {/* Shimmer line */}
      <div className={cn('absolute top-0 left-0 right-0 h-px z-10',
        product.badgeType === 'gold'
          ? 'bg-gradient-to-r from-transparent via-primary/50 to-transparent'
          : 'shimmer-line'
      )} />

      {/* Image area */}
      <div className="relative h-[170px] bg-background/60 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-secondary to-background flex items-center justify-center">
          <ShoppingCart className={cn('w-12 h-12 opacity-20', priceColor[product.badgeType])} />
        </div>
        {/* Badge */}
        <div className={cn('absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase backdrop-blur-xl border', badge.bg, badge.text)}>
          <span className={cn('w-[5px] h-[5px] rounded-full animate-[pulse-dot_2s_ease-in-out_infinite]', badge.dot)} />
          {product.badge}
        </div>
        {/* Gradient overlay */}
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

        {/* Features */}
        <ul className="space-y-1.5 mb-4">
          {product.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[11px] font-medium text-secondary-foreground">
              <span className={cn('w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-extrabold', tickColor[product.badgeType])}>
                <Check className="w-2.5 h-2.5" />
              </span>
              {f}
            </li>
          ))}
        </ul>

        {/* Divider */}
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
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              {t('products.buy')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
