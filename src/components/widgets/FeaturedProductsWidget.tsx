'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/shop/ProductCard';
import { Sparkles, Loader2 } from 'lucide-react';

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

interface FeaturedProductsWidgetProps {
  qty?: number;
  locale: string;
  title?: string;
}

export function FeaturedProductsWidget({ qty = 4, locale, title }: FeaturedProductsWidgetProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isNL = locale === 'nl';

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch(`/api/shop/products?locale=${locale}&pageSize=50`);
        if (response.ok) {
          const data = await response.json();
          // Get featured products from the API response
          const featured = (data.featuredProducts || []).slice(0, qty);
          setProducts(featured);
        }
      } catch (error) {
        console.error('Failed to fetch featured products:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, [locale, qty]);

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="my-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">
          {title || (isNL ? 'Uitgelicht' : 'Featured')}
        </h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
    </div>
  );
}
