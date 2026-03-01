'use client';

import { ProductCard } from './ProductCard';
import { BundleCard } from './BundleCard';

interface RelatedProduct {
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

interface RelatedBundle {
  id: number;
  type: 'bundle';
  name: string;
  description: string;
  shortDescription?: string | null;
  slug: string;
  priceInCents: number;
  discountedPriceInCents?: number;
  hasDiscount?: boolean;
  discountPercent?: number;
  totalProductValueInCents?: number;
  currency: string;
  images: string[];
  isAllAccess: boolean;
  isFeatured?: boolean;
}

interface RelatedProductsProps {
  products: RelatedProduct[];
  bundles?: RelatedBundle[];
  locale: string;
}

export function RelatedProducts({ products, bundles = [], locale }: RelatedProductsProps) {
  if (products.length === 0 && bundles.length === 0) return null;

  const isNL = locale === 'nl';

  return (
    <div className="mt-16 border-t pt-12">
      <h2 className="text-2xl font-bold mb-6">
        {isNL ? 'Misschien vind je dit ook leuk' : 'You might also like'}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {bundles.map((bundle) => (
          <BundleCard key={`bundle-${bundle.id}`} bundle={bundle} locale={locale} />
        ))}
        {products.map((product) => (
          <ProductCard key={`product-${product.id}`} product={product} locale={locale} />
        ))}
      </div>
    </div>
  );
}
