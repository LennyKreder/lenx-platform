'use client';

import { ProductCard } from './ProductCard';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Product {
  id: number;
  name: string;
  description: string;
  slug: string;
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
  productType: string | null;
  device: string | null;
  priceInCents: number;
  currency: string;
  images: string[];
  tags?: { id: number; name: string }[];
  template: {
    id: number;
    name: string;
  } | null;
}

interface ProductGridProps {
  products: Product[];
  locale: string;
  isLoading?: boolean;
  onClearFilters?: () => void;
}

export function ProductGrid({ products, locale, isLoading, onClearFilters }: ProductGridProps) {
  const isNL = locale === 'nl';

  if (products.length === 0 && !isLoading) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">
          {isNL ? 'Geen producten gevonden' : 'No products found'}
        </h3>
        <p className="text-muted-foreground mb-4">
          {isNL
            ? 'Probeer je filters aan te passen of kom later terug.'
            : 'Try adjusting your filters or check back later for new products.'}
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            {isNL ? 'Filters wissen' : 'Clear filters'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      {isLoading && products.length === 0
        ? Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border bg-card overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="flex gap-2">
                  <div className="h-5 bg-muted rounded w-16" />
                  <div className="h-5 bg-muted rounded w-16" />
                </div>
                <div className="h-6 bg-muted rounded w-20" />
              </div>
            </div>
          ))
        : products.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
    </div>
  );
}
