import { prisma } from '@/lib/prisma';
import { type Locale, isValidLocale } from '@/lib/i18n';
import { LBL_SITE_ID } from '@/lib/site-context';

export interface SiteSettings {
  showRecentlyViewed: boolean;
  showRelatedProducts: boolean;
  recentlyViewedMaxQty: number;
  relatedProductsMaxQty: number;
  showFilterYear: boolean;
  showFilterTheme: boolean;
  showFilterThemeMode: boolean;
  showFilterDevice: boolean;
  showFilterItemType: boolean;
  showFilterProductType: boolean;
  itemsPerPage: number;
  productDefaultSortBy: 'name' | 'createdAt' | 'year' | 'theme';
  productDefaultSortOrder: 'asc' | 'desc';
  activeLocales: Locale[];
}

const DEFAULTS: SiteSettings = {
  showRecentlyViewed: true,
  showRelatedProducts: true,
  recentlyViewedMaxQty: 4,
  relatedProductsMaxQty: 4,
  showFilterYear: true,
  showFilterTheme: true,
  showFilterThemeMode: true,
  showFilterDevice: true,
  showFilterItemType: true,
  showFilterProductType: true,
  itemsPerPage: 12,
  productDefaultSortBy: 'createdAt',
  productDefaultSortOrder: 'desc',
  activeLocales: ['en', 'nl'],
};

function parseActiveLocales(value: string | undefined): Locale[] {
  if (!value) return DEFAULTS.activeLocales;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((l): l is Locale => isValidLocale(l));
      return valid.length > 0 ? valid : DEFAULTS.activeLocales;
    }
  } catch {
    // Fall through to default
  }
  return DEFAULTS.activeLocales;
}

export async function getSettings(siteId?: string): Promise<SiteSettings> {
  const sid = siteId || LBL_SITE_ID;
  const rows = await prisma.siteSetting.findMany({ where: { siteId: sid } });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const sortBy = map.get('productDefaultSortBy');
  const sortOrder = map.get('productDefaultSortOrder');

  return {
    showRecentlyViewed: map.get('showRecentlyViewed') !== 'false',
    showRelatedProducts: map.get('showRelatedProducts') !== 'false',
    recentlyViewedMaxQty: parseInt(map.get('recentlyViewedMaxQty') || '4', 10) || 4,
    relatedProductsMaxQty: parseInt(map.get('relatedProductsMaxQty') || '4', 10) || 4,
    showFilterYear: map.get('showFilterYear') !== 'false',
    showFilterTheme: map.get('showFilterTheme') !== 'false',
    showFilterThemeMode: map.get('showFilterThemeMode') !== 'false',
    showFilterDevice: map.get('showFilterDevice') !== 'false',
    showFilterItemType: map.get('showFilterItemType') !== 'false',
    showFilterProductType: map.get('showFilterProductType') !== 'false',
    itemsPerPage: parseInt(map.get('itemsPerPage') || '12', 10) || 12,
    productDefaultSortBy: (sortBy === 'name' || sortBy === 'year' || sortBy === 'theme' ? sortBy : 'createdAt') as SiteSettings['productDefaultSortBy'],
    productDefaultSortOrder: (sortOrder === 'asc' ? 'asc' : 'desc') as SiteSettings['productDefaultSortOrder'],
    activeLocales: parseActiveLocales(map.get('activeLocales')),
  };
}

export async function getActiveLocales(siteId?: string): Promise<Locale[]> {
  const sid = siteId || LBL_SITE_ID;
  const row = await prisma.siteSetting.findUnique({
    where: { siteId_key: { siteId: sid, key: 'activeLocales' } },
  });
  return parseActiveLocales(row?.value);
}

export async function updateSettings(updates: Partial<SiteSettings>, siteId?: string): Promise<SiteSettings> {
  const sid = siteId || LBL_SITE_ID;
  const entries = Object.entries(updates) as [keyof SiteSettings, boolean | number | string | Locale[]][];

  for (const [key, value] of entries) {
    const stringValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
    await prisma.siteSetting.upsert({
      where: { siteId_key: { siteId: sid, key } },
      create: { siteId: sid, key, value: stringValue },
      update: { value: stringValue },
    });
  }

  return getSettings(sid);
}

export { DEFAULTS as SETTING_DEFAULTS };
