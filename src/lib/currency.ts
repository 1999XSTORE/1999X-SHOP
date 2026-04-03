// ── Currency conversion based on i18n language ────────────────
// Rates are approximate USD base rates

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  rate: number;   // how many of this currency = $1 USD
  locale: string; // for Intl.NumberFormat
}

const CURRENCIES: Record<string, CurrencyInfo> = {
  en: { code:'USD', symbol:'$',  name:'US Dollar',      rate:1,     locale:'en-US'  },
  ar: { code:'SAR', symbol:'﷼',  name:'Saudi Riyal',    rate:3.75,  locale:'ar-SA'  },
  bn: { code:'BDT', symbol:'৳',  name:'Bangladeshi Taka', rate:110, locale:'bn-BD'  },
  th: { code:'THB', symbol:'฿',  name:'Thai Baht',      rate:35,    locale:'th-TH'  },
  id: { code:'IDR', symbol:'Rp', name:'Indonesian Rupiah', rate:16000, locale:'id-ID' },
  vi: { code:'VND', symbol:'₫',  name:'Vietnamese Dong', rate:25000, locale:'vi-VN' },
  ms: { code:'MYR', symbol:'RM', name:'Malaysian Ringgit', rate:4.7, locale:'ms-MY' },
  hi: { code:'INR', symbol:'₹',  name:'Indian Rupee',   rate:83,    locale:'hi-IN'  },
  zh: { code:'CNY', symbol:'¥',  name:'Chinese Yuan',   rate:7.2,   locale:'zh-CN'  },
  ja: { code:'JPY', symbol:'¥',  name:'Japanese Yen',   rate:150,   locale:'ja-JP'  },
  ko: { code:'KRW', symbol:'₩',  name:'Korean Won',     rate:1300,  locale:'ko-KR'  },
  ru: { code:'RUB', symbol:'₽',  name:'Russian Ruble',  rate:90,    locale:'ru-RU'  },
  tr: { code:'TRY', symbol:'₺',  name:'Turkish Lira',   rate:32,    locale:'tr-TR'  },
  es: { code:'EUR', symbol:'€',  name:'Euro',           rate:0.92,  locale:'es-ES'  },
  pt: { code:'BRL', symbol:'R$', name:'Brazilian Real', rate:5.0,   locale:'pt-BR'  },
  fr: { code:'EUR', symbol:'€',  name:'Euro',           rate:0.92,  locale:'fr-FR'  },
  de: { code:'EUR', symbol:'€',  name:'Euro',           rate:0.92,  locale:'de-DE'  },
};

export function getCurrencyForLang(lang: string): CurrencyInfo {
  // Strip region code (e.g. 'en-US' → 'en')
  const base = lang.split('-')[0].toLowerCase();
  return CURRENCIES[base] ?? CURRENCIES['en'];
}

export function formatPrice(usd: number, lang: string): string {
  const c = getCurrencyForLang(lang);
  if (c.code === 'USD') return `$${usd.toFixed(2)}`;
  const local = usd * c.rate;
  // Format nicely based on magnitude
  if (local >= 1000) {
    return `${c.symbol}${Math.round(local).toLocaleString(c.locale)}`;
  }
  return `${c.symbol}${local.toFixed(local < 10 ? 2 : 0)}`;
}

export function formatPriceShort(usd: number, lang: string): string {
  const c = getCurrencyForLang(lang);
  if (c.code === 'USD') return `$${usd % 1 === 0 ? usd : usd.toFixed(2)}`;
  const local = usd * c.rate;
  if (local >= 10000) return `${c.symbol}${(local/1000).toFixed(0)}k`;
  if (local >= 1000)  return `${c.symbol}${Math.round(local).toLocaleString()}`;
  return `${c.symbol}${Math.round(local)}`;
}
