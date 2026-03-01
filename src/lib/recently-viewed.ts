const STORAGE_KEY = 'lbl_recently_viewed';
const MAX_ITEMS = 8;

export interface RecentlyViewedProduct {
  id: number;
  name: string;
  slug: string;
  priceInCents: number;
  currency: string;
  image: string | null;
  theme: string | null;
  productType: string | null;
  year: number | null;
}

export function getRecentlyViewed(): RecentlyViewedProduct[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(product: RecentlyViewedProduct): void {
  if (typeof window === 'undefined') return;

  try {
    const items = getRecentlyViewed();
    const filtered = items.filter((item) => item.id !== product.id);
    const updated = [product, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}
