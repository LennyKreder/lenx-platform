'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/shop/ProductCard';
import { Loader2 } from 'lucide-react';
import { productTypes, type ProductTypeId, getProductTypeName } from '@/config/product-types';

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

interface ProductsByCategoryWidgetProps {
  category: string;
  qty?: number;
  locale: string;
  title?: string;
}

export function ProductsByCategoryWidget({ category, qty = 4, locale, title }: ProductsByCategoryWidgetProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Map category to productType - support both url segments and type ids
  const productType = Object.entries(productTypes).find(
    ([id, config]) => id === category || config.urlSegment === category
  )?.[0] as ProductTypeId | undefined;

  useEffect(() => {
    async function fetchProducts() {
      if (!productType) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/shop/products?locale=${locale}&productType=${productType}&pageSize=${qty}`
        );
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products.slice(0, qty));
        }
      } catch (error) {
        console.error('Failed to fetch products by category:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, [locale, productType, qty]);

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!productType || products.length === 0) {
    return null;
  }

  const categoryName = title || getProductTypeName(productType, locale);

  return (
    <div className="my-8">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">{categoryName}</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
    </div>
  );
}
