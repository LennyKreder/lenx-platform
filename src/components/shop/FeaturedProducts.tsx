'use client';

import { ProductCard } from './ProductCard';
import { Sparkles } from 'lucide-react';

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
  discountedPriceInCents?: number;
  hasDiscount?: boolean;
  discountPercent?: number;
  currency: string;
  images: string[];
  tags?: { id: number; name: string }[];
  template: {
    id: number;
    name: string;
  } | null;
}

interface FeaturedProductsProps {
  products: Product[];
  locale: string;
}

export function FeaturedProducts({ products, locale }: FeaturedProductsProps) {
  const isNL = locale === 'nl';

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">
          {isNL ? 'Uitgelicht' : 'Featured'}
        </h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} isFeatured />
        ))}
      </div>
    </div>
  );
}
