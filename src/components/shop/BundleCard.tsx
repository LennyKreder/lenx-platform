'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ShoppingCart, Check, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { themes } from '@/config/themes';
import { useCart } from '@/contexts/CartContext';
import { useTranslation } from '@/contexts/I18nContext';
import { trackAddToCart } from '@/lib/analytics';
import { getThumbnailUrl } from '@/lib/image-utils';

interface BundleCardProps {
  bundle: {
    id: number;
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
    theme?: string | null;
  };
  locale: string;
}

export function BundleCard({ bundle, locale }: BundleCardProps) {
  const [isAdded, setIsAdded] = useState(false);
  const { addItem, setIsOpen } = useCart();
  const t = useTranslation();
  const isNL = locale === 'nl';

  const formatter = new Intl.NumberFormat(isNL ? 'nl-NL' : 'en-US', {
    style: 'currency',
    currency: bundle.currency,
  });

  const displayPrice = bundle.hasDiscount && bundle.discountedPriceInCents !== undefined
    ? bundle.discountedPriceInCents
    : bundle.priceInCents;
  const displayPriceFormatted = formatter.format(displayPrice / 100);

  // Show total product value as original price for non-all-access bundles
  const showOriginalPrice = bundle.totalProductValueInCents && bundle.totalProductValueInCents > displayPrice;
  const originalPriceFormatted = showOriginalPrice
    ? formatter.format(bundle.totalProductValueInCents! / 100)
    : null;

  // Get theme color if bundle has a theme
  const themeColor = bundle.theme && themes[bundle.theme]?.previewColor;

  // Use short description if available, otherwise fall back to description
  const cardDescription = bundle.shortDescription || bundle.description;

  // Different styling for all access bundles (gold theme)
  const cardClasses = bundle.isAllAccess
    ? 'group relative rounded-lg border-2 border-amber-400/40 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 overflow-hidden hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-200/20 transition-all'
    : 'group relative rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden hover:border-primary/40 transition-all';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      productId: bundle.id,
      bundleId: bundle.id,
      isAllAccessBundle: bundle.isAllAccess,
      name: bundle.name,
      priceInCents: displayPrice,
      originalPriceInCents: bundle.totalProductValueInCents,
      currency: bundle.currency,
      image: bundle.images[0] || '/placeholder-bundle.png',
      theme: bundle.theme,
    });
    trackAddToCart({
      id: bundle.id,
      name: bundle.name,
      priceInCents: displayPrice,
      currency: bundle.currency,
      category: 'bundle',
    });
    setIsAdded(true);
    setIsOpen(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className={cardClasses}>
      {/* Bundle Icon Badge - always visible */}
      <div className={`absolute ${bundle.isFeatured ? 'top-12' : 'top-3'} left-3 z-10`}>
        <div className={bundle.isAllAccess
          ? 'p-1.5 rounded-md bg-amber-500/90 text-white shadow-sm'
          : 'p-1.5 rounded-md bg-primary/90 text-primary-foreground shadow-sm'
        }>
          <Package className="h-4 w-4" />
        </div>
      </div>

      {/* Featured Badge */}
      {bundle.isFeatured && (
        <div className="absolute top-3 left-3 z-10">
          <Badge className={bundle.isAllAccess ? 'bg-amber-500 text-white gap-1' : 'bg-primary text-primary-foreground gap-1'}>
            <Sparkles className="h-3 w-3" />
            {isNL ? 'Aanbevolen' : 'Featured'}
          </Badge>
        </div>
      )}

      {/* All Access Badge */}
      {bundle.isAllAccess && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0">
            {isNL ? 'Volledige toegang' : 'All Access'}
          </Badge>
        </div>
      )}

      <Link href={`/${locale}/shop/bundles/${bundle.slug}`}>
        {/* Image or Icon */}
        <div
          className="aspect-[4/3] overflow-hidden flex items-center justify-center"
          style={!bundle.images[0] && !bundle.isAllAccess && themeColor ? { backgroundColor: themeColor } : undefined}
        >
          {bundle.images[0] ? (
            <img
              src={getThumbnailUrl(bundle.images[0])}
              alt={bundle.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : bundle.isAllAccess ? (
            <div className="w-full h-full bg-gradient-to-br from-amber-300 to-amber-400 dark:from-amber-600 dark:to-amber-700 flex items-center justify-center">
              <Sparkles className="h-16 w-16 text-white/80" />
            </div>
          ) : themeColor ? (
            <Sparkles className="h-16 w-16 text-white/60" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
              <Sparkles className="h-16 w-16 text-primary/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className={bundle.isAllAccess
            ? 'font-semibold text-lg group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1'
            : 'font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1'
          }>
            {bundle.name}
          </h3>
          {cardDescription && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {cardDescription.replace(/<[^>]*>/g, '')}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={bundle.isAllAccess ? 'text-xl font-bold text-amber-600 dark:text-amber-400' : 'text-xl font-bold text-primary'}>
                {displayPriceFormatted}
              </span>
              {showOriginalPrice && originalPriceFormatted && (
                <span className="text-sm text-muted-foreground line-through">
                  {originalPriceFormatted}
                </span>
              )}
            </div>
            <Button
              size="icon"
              className={bundle.isAllAccess
                ? "h-9 w-9 shrink-0 bg-amber-500 text-white hover:bg-amber-600"
                : "h-9 w-9 shrink-0 bg-foreground text-background hover:bg-foreground/90"
              }
              onClick={handleAddToCart}
              disabled={isAdded}
              title={isAdded ? t('shop.added') : t('shop.addToCart')}
            >
              {isAdded ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
}
