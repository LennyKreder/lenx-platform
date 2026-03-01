'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { getRecentlyViewed, RecentlyViewedProduct } from '@/lib/recently-viewed';
import { formatPrice } from '@/lib/cart';
import { productTypes } from '@/config/product-types';
import { themes } from '@/config/themes';
import {
  buildDatedProductUrl,
  buildUndatedProductUrl,
  type DatedProductType,
  type UndatedProductType,
} from '@/lib/routing';

interface RecentlyViewedProps {
  locale: string;
  excludeProductId?: number;
  maxQty?: number;
}

function buildProductUrl(locale: string, item: RecentlyViewedProduct): string {
  const typeConfig = item.productType
    ? productTypes[item.productType as keyof typeof productTypes]
    : null;
  const urlSegment = typeConfig?.urlSegment || 'planners';
  const isDated = typeConfig?.dated ?? true;

  if (isDated) {
    const yearSegment = item.year ? String(item.year) : 'undated';
    return buildDatedProductUrl(
      locale,
      urlSegment as DatedProductType,
      yearSegment as 'undated' | '2025' | '2026' | '2027' | '2028' | '2029' | '2030',
      item.slug
    );
  } else {
    return buildUndatedProductUrl(
      locale,
      urlSegment as UndatedProductType,
      item.slug
    );
  }
}

export function RecentlyViewed({ locale, excludeProductId, maxQty }: RecentlyViewedProps) {
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);
  const isNL = locale === 'nl';

  useEffect(() => {
    let viewed = getRecentlyViewed().filter(
      (item) => item.id !== excludeProductId
    );
    if (maxQty && maxQty > 0) {
      viewed = viewed.slice(0, maxQty);
    }
    setItems(viewed);
  }, [excludeProductId, maxQty]);

  if (items.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
        <Clock className="h-5 w-5 text-muted-foreground" />
        {isNL ? 'Recent bekeken' : 'Recently Viewed'}
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => {
          const themeConfig = item.theme ? themes[item.theme as keyof typeof themes] : null;
          const themeColor = themeConfig?.previewColor;

          return (
            <Link
              key={item.id}
              href={buildProductUrl(locale, item)}
              className="shrink-0 w-40 group"
            >
              <div
                className="aspect-[4/3] rounded-md overflow-hidden bg-muted mb-2"
                style={!item.image && themeColor ? { backgroundColor: themeColor } : undefined}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : null}
              </div>
              <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                {item.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatPrice(item.priceInCents, item.currency, locale)}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
