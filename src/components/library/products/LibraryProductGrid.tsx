'use client';

import { LibraryProductCard } from './LibraryProductCard';
import type { AccessibleProduct } from '@/lib/customer-access';
import { Package } from 'lucide-react';

interface LibraryProductGridProps {
  products: AccessibleProduct[];
  locale: string;
  accessCode: string;
}

export function LibraryProductGrid({ products, locale, accessCode }: LibraryProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
        <p className="text-muted-foreground">
          No products match your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <LibraryProductCard
          key={product.id}
          product={product}
          locale={locale}
          accessCode={accessCode}
        />
      ))}
    </div>
  );
}
