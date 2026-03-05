const CART_STORAGE_KEY = 'lbl_cart';

export interface CartItem {
  productId: number;
  bundleId?: number;
  isAllAccessBundle?: boolean;
  name: string;
  priceInCents: number;
  originalPriceInCents?: number; // For bundles: total value of products before discount
  currency: string;
  image: string;
  theme?: string | null; // For theme color display when no image
  href?: string; // Product detail page URL
  quantity: number;
}

export function loadCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading cart from storage:', error);
  }

  return [];
}

export function saveCartToStorage(items: CartItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving cart to storage:', error);
  }
}

export function clearCartStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing cart storage:', error);
  }
}

export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.priceInCents * item.quantity, 0);
}

export function calculateCartItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

export function formatPrice(priceInCents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-US', {
    style: 'currency',
    currency,
  }).format(priceInCents / 100);
}
