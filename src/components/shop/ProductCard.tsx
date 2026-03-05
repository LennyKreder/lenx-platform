'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Check, Sparkles } from 'lucide-react';
import { themes } from '@/config/themes';
import { productTypes } from '@/config/product-types';
import { useCart } from '@/contexts/CartContext';
import { useTranslation } from '@/contexts/I18nContext';
import { trackAddToCart } from '@/lib/analytics';
import { getThumbnailUrl } from '@/lib/image-utils';
import {
  buildDatedProductUrl,
  buildUndatedProductUrl,
  buildProductUrl,
  type DatedProductType,
  type UndatedProductType,
} from '@/lib/routing';

interface ProductCardProps {
  product: {
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
  };
  locale: string;
  isFeatured?: boolean;
}

const languageLabels: Record<string, string> = {
  en: 'English',
  nl: 'Nederlands',
};

export function ProductCard({ product, locale, isFeatured }: ProductCardProps) {
  const isNL = locale === 'nl';
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useCart();
  const t = useTranslation();
  const router = useRouter();

  const themeConfig = product.theme
    ? themes[product.theme as keyof typeof themes]
    : null;

  const formatter = new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-US', {
    style: 'currency',
    currency: product.currency,
  });

  // Format prices
  const originalPriceFormatted = formatter.format(product.priceInCents / 100);
  const displayPrice = product.hasDiscount && product.discountedPriceInCents !== undefined
    ? product.discountedPriceInCents
    : product.priceInCents;
  const displayPriceFormatted = formatter.format(displayPrice / 100);

  // Build product URL based on productType
  const typeConfig = product.productType
    ? productTypes[product.productType as keyof typeof productTypes]
    : null;

  let productUrl: string;
  if (!typeConfig) {
    // Physical products or products without a type: simple /shop/product/slug
    productUrl = buildProductUrl(locale, product.slug);
  } else if (typeConfig.dated) {
    // For dated products (planners, printables): include year or 'undated'
    const yearSegment = product.year ? String(product.year) : 'undated';
    productUrl = buildDatedProductUrl(
      locale,
      typeConfig.urlSegment as DatedProductType,
      yearSegment as 'undated' | '2025' | '2026' | '2027' | '2028' | '2029' | '2030',
      product.slug
    );
  } else {
    // For undated products (notebooks, templates): no year segment
    productUrl = buildUndatedProductUrl(
      locale,
      typeConfig.urlSegment as UndatedProductType,
      product.slug
    );
  }

  // Get first image thumbnail (null if none)
  const hasImage = product.images.length > 0;
  const imageUrl = hasImage ? getThumbnailUrl(product.images[0]) : undefined;
  const themeColor = themeConfig?.previewColor;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      productId: product.id,
      name: product.name,
      priceInCents: displayPrice,
      currency: product.currency,
      image: product.images[0] || '/placeholder-product.png',
      theme: product.theme,
      href: productUrl,
    });
    trackAddToCart({
      id: product.id,
      name: product.name,
      priceInCents: displayPrice,
      currency: product.currency,
      category: product.productType || undefined,
    });
    setIsAdded(true);
    router.push(`/${locale}/cart`);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <Link href={productUrl}>
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow group relative">
        {/* Featured Badge */}
        {isFeatured && (
          <div className="absolute top-3 left-3 z-10">
            <div className="p-1.5 rounded-md bg-primary/90 text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
        )}

        {/* Product Image */}
        <div
          className="aspect-[4/3] relative bg-muted overflow-hidden"
          style={!hasImage && themeColor ? { backgroundColor: themeColor } : undefined}
        >
          {hasImage && (
            <div
              className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          )}
        </div>

        <CardContent className="p-4">
          {/* Product Name */}
          <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Variant Info */}
          <div className="flex flex-wrap gap-1 mb-3">
            {product.year && (
              <Badge variant="outline" className="text-xs">
                {product.year}
              </Badge>
            )}
            {themeConfig && (
              <Badge variant="outline" className="text-xs">
                <span
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: themeConfig.previewColor }}
                />
                {themeConfig.name}
              </Badge>
            )}
            {product.contentLanguage && (
              <Badge variant="outline" className="text-xs">
                {languageLabels[product.contentLanguage] || product.contentLanguage}
              </Badge>
            )}
          </div>

          {/* Price & Add to Cart */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-lg text-primary">{displayPriceFormatted}</p>
              {product.hasDiscount && (
                <>
                  <p className="text-sm text-muted-foreground line-through">
                    {originalPriceFormatted}
                  </p>
                  <Badge variant="destructive" className="text-xs">
                    -{product.discountPercent}%
                  </Badge>
                </>
              )}
            </div>
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 bg-foreground text-background hover:bg-foreground/90"
              onClick={handleAddToCart}
              disabled={isAdded}
              title={isAdded ? t('shop.added') : t('shop.addToCart')}
            >
              {isAdded ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
