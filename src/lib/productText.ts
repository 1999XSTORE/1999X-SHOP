import type { TFunction } from 'i18next';
import type { Product } from '@/lib/store';

export function getCatalogProductText(t: TFunction, product: Product) {
  const key = product.id.replace(/-/g, '');
  return {
    name: t(`products.catalog.${key}.name`, { defaultValue: product.name }),
    description: t(`products.catalog.${key}.description`, { defaultValue: product.description }),
    badge: t(`products.catalog.${key}.badge`, { defaultValue: product.badge }),
    duration: t(`products.catalog.${key}.duration`, { defaultValue: product.duration }),
    features: product.features.map((feature, index) =>
      t(`products.catalog.${key}.features.${index}`, { defaultValue: feature })
    ),
  };
}

export function getWalletPanelText(t: TFunction, panelId: string) {
  return {
    name: t(`wallet.panels.${panelId}.name`),
    tagline: t(`wallet.panels.${panelId}.tagline`),
    description: t(`wallet.panels.${panelId}.description`),
    features: [0, 1, 2, 3].map((index) => t(`wallet.panels.${panelId}.features.${index}`)),
  };
}

export function getWalletPlanLabel(t: TFunction, label: string) {
  const normalized = label.trim().toLowerCase();
  if (normalized === '3 days') return t('wallet.planLabels.days3');
  if (normalized === '7 days') return t('wallet.planLabels.days7');
  if (normalized === '30 days') return t('wallet.planLabels.days30');
  if (normalized === 'weekly') return t('wallet.planLabels.weekly');
  if (normalized === 'monthly') return t('wallet.planLabels.monthly');
  return label;
}

export function getLicenseDisplayName(t: TFunction, productId?: string, productName?: string) {
  if (productId === 'keyauth-internal' || productName === 'Internal') return t('wallet.licenseNames.internal');
  if (productId === 'keyauth-lag' || productName === 'Fake Lag') return t('wallet.licenseNames.fakeLag');
  return productName || t('wallet.licenseNames.license');
}
