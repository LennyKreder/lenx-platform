declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

interface ProductItem {
  id: number;
  name: string;
  priceInCents: number;
  currency: string;
  category?: string;
}

function pushEvent(event: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('event', event, params);
  } else if (window.dataLayer) {
    window.dataLayer.push({ event, ...params });
  }
}

export function trackViewItem(product: ProductItem) {
  pushEvent('view_item', {
    currency: product.currency,
    value: product.priceInCents / 100,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.priceInCents / 100,
      },
    ],
  });
}

export function trackAddToCart(product: ProductItem, quantity = 1) {
  pushEvent('add_to_cart', {
    currency: product.currency,
    value: (product.priceInCents / 100) * quantity,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.priceInCents / 100,
        quantity,
      },
    ],
  });
}

export function trackBeginCheckout(items: ProductItem[], totalInCents: number, currency: string) {
  pushEvent('begin_checkout', {
    currency,
    value: totalInCents / 100,
    items: items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.priceInCents / 100,
    })),
  });
}

export function trackPurchase(
  transactionId: string,
  items: ProductItem[],
  totalInCents: number,
  currency: string
) {
  pushEvent('purchase', {
    transaction_id: transactionId,
    currency,
    value: totalInCents / 100,
    items: items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category,
      price: item.priceInCents / 100,
    })),
  });
}
