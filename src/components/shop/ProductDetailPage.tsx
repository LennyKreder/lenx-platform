'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ShoppingCart, Check, Download, Expand, Package, Info, Sparkles, Play, FileDown } from 'lucide-react';
import { themes } from '@/config/themes';
import { useCart } from '@/contexts/CartContext';
import { useTranslation } from '@/contexts/I18nContext';
import { RelatedProducts } from './RelatedProducts';
import { ImageLightbox } from './ImageLightbox';
import { ReviewsSection } from './ReviewsSection';
import { addRecentlyViewed } from '@/lib/recently-viewed';
import { trackViewItem, trackAddToCart } from '@/lib/analytics';

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
  videoUrl?: string | null;
  tags: { id: number; name: string }[];
  template: {
    id: number;
    name: string;
  } | null;
  files: {
    id: number;
    templateSet: string | null;
    timeFormat: string | null;
    weekStart: string | null;
    calendar: string | null;
  }[];
  downloadCode: string;
}

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
  template: { id: number; name: string } | null;
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

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ProductDetailPageProps {
  product: Product;
  locale: string;
  isOwned?: boolean;
  isLoggedIn?: boolean;
  customerName?: string;
  relatedProducts?: RelatedProduct[];
  relatedBundles?: RelatedBundle[];
  breadcrumbItems?: BreadcrumbItem[];
}

const languageLabels: Record<string, string> = {
  en: 'English',
  nl: 'Nederlands',
};

export function ProductDetailPage({ product, locale, isOwned = false, isLoggedIn = false, customerName, relatedProducts = [], relatedBundles = [], breadcrumbItems }: ProductDetailPageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useCart();
  const t = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const themeConfig = product.theme
    ? themes[product.theme as keyof typeof themes]
    : null;

  const displayPrice = product.hasDiscount && product.discountedPriceInCents !== undefined
    ? product.discountedPriceInCents
    : product.priceInCents;

  useEffect(() => {
    addRecentlyViewed({
      id: product.id,
      name: product.name,
      slug: product.slug,
      priceInCents: displayPrice,
      currency: product.currency,
      image: product.images[0] || null,
      theme: product.theme,
      productType: product.productType,
      year: product.year,
    });
    trackViewItem({
      id: product.id,
      name: product.name,
      priceInCents: displayPrice,
      currency: product.currency,
      category: product.productType || undefined,
    });
  }, [product.id]);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      priceInCents: displayPrice,
      currency: product.currency,
      image: product.images[0] || '/placeholder-product.png',
      theme: product.theme,
      href: pathname,
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

  // Format prices
  const formatter = new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-US', {
    style: 'currency',
    currency: product.currency,
  });
  const originalPriceFormatted = formatter.format(product.priceInCents / 100);
  const displayPriceFormatted = formatter.format(displayPrice / 100);

  const hasImages = product.images.length > 0;
  const images = hasImages ? product.images : [];
  const themeColor = themeConfig?.previewColor;

  // Video is inserted as the second item in the gallery (index 1)
  const hasVideo = !!product.videoUrl;
  const videoIndex = hasVideo ? Math.min(1, images.length) : -1;
  const totalMediaCount = images.length + (hasVideo ? 1 : 0);
  const isShowingVideo = currentImageIndex === videoIndex;

  // Map gallery index to images array index (accounting for video slot)
  const getImageIndex = (galleryIndex: number, vidIdx: number) => {
    if (!hasVideo || galleryIndex < vidIdx) return galleryIndex;
    return galleryIndex - 1;
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % totalMediaCount);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + totalMediaCount) % totalMediaCount);
  };

  // Swipe handling for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Only handle horizontal swipes (not vertical scrolling or video control taps)
    if (Math.abs(deltaX) < 50 || Math.abs(deltaY) > Math.abs(deltaX)) return;
    if (deltaX < 0) nextImage();
    else prevImage();
  };

  const isNL = locale === 'nl';

  return (
    <div className="container mx-auto px-4 py-8 max-w-full overflow-hidden">
      <Breadcrumbs
        locale={locale}
        items={breadcrumbItems || [
          { label: locale === 'nl' ? 'Winkel' : 'Shop', href: `/${locale}/shop` },
          { label: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 min-w-0">
        {/* Media Gallery */}
        <div className="space-y-4 min-w-0">
          {/* Main Display - Image or Video */}
          <div
            className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted"
            style={!hasImages && !isShowingVideo && themeColor ? { backgroundColor: themeColor } : undefined}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {isShowingVideo && product.videoUrl ? (
              <video
                autoPlay
                muted
                loop
                playsInline
                controls
                className="w-full h-full object-contain bg-black"
                poster={product.images[0]}
                preload="metadata"
              >
                <source src={product.videoUrl} type={product.videoUrl.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
                Your browser does not support the video tag.
              </video>
            ) : hasImages ? (
              <div
                className="w-full h-full cursor-pointer group/image"
                onClick={() => setIsLightboxOpen(true)}
              >
                <img
                  src={images[getImageIndex(currentImageIndex, videoIndex)]}
                  alt={`${product.name} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center">
                  <Expand className="h-8 w-8 text-white opacity-0 group-hover/image:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
            ) : null}
            {totalMediaCount > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md z-10"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md z-10"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {totalMediaCount > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: totalMediaCount }, (_, galleryIdx) => {
                if (galleryIdx === videoIndex) {
                  return (
                    <button
                      key="video"
                      onClick={() => setCurrentImageIndex(videoIndex)}
                      className={`shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 relative ${
                        isShowingVideo
                          ? 'border-primary'
                          : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      <img
                        src={images[0] || ''}
                        alt="Video"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    </button>
                  );
                }
                const imgIdx = getImageIndex(galleryIdx, videoIndex);
                return (
                  <button
                    key={galleryIdx}
                    onClick={() => setCurrentImageIndex(galleryIdx)}
                    className={`shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 ${
                      galleryIdx === currentImageIndex
                        ? 'border-primary'
                        : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    <img
                      src={images[imgIdx]}
                      alt={`Thumbnail ${imgIdx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Info - Compact purchase section */}
        <div className="space-y-4 min-w-0">
          {/* Title */}
          <h1 className="text-3xl font-bold">{product.name}</h1>

          {/* Variant Info Pills */}
          <div className="flex flex-wrap gap-2">
            {product.year && (
              <Badge variant="secondary">{product.year}</Badge>
            )}
            {themeConfig && (
              <Badge variant="outline">
                <span
                  className="w-3 h-3 rounded-full mr-1.5"
                  style={{ backgroundColor: themeConfig.previewColor }}
                />
                {themeConfig.name}
              </Badge>
            )}
            {product.contentLanguage && (
              <Badge variant="outline">
                {languageLabels[product.contentLanguage] || product.contentLanguage}
              </Badge>
            )}
            {product.tags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-primary">{displayPriceFormatted}</p>
            {product.hasDiscount && (
              <>
                <p className="text-xl text-muted-foreground line-through">
                  {originalPriceFormatted}
                </p>
                <Badge variant="destructive" className="text-sm">
                  -{product.discountPercent}%
                </Badge>
              </>
            )}
          </div>

          {/* Add to Cart / Owned State */}
          {isOwned ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 py-3 px-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-400">
                  {t('shop.youOwnProduct')}
                </span>
              </div>
              <Button size="lg" className="w-full" asChild>
                <Link href={`/${locale}/account/library`}>
                  <Download className="h-5 w-5 mr-2" />
                  {t('shop.goToLibrary')}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={isAdded}
              >
                {isAdded ? (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    {t('shop.added')}
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    {t('shop.addToCart')}
                  </>
                )}
              </Button>
              {product.productType && (
                <p className="text-xs text-muted-foreground text-center">
                  {t('shop.instantDownload')}
                </p>
              )}
              {product.productType === 'planner' && product.theme && (
                <Link
                  href={`/${locale}/free-sample?theme=${product.theme}`}
                  className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline pt-1"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  {isNL ? 'Probeer een gratis voorbeeld' : 'Try a free sample'}
                </Link>
              )}
            </div>
          )}

          {/* File Info */}
          {product.files.length > 0 && (
            <div className="text-sm text-muted-foreground pt-2 border-t">
              <p className="font-medium mb-2">{t('shop.includes')}</p>
              <ul className="list-disc list-inside space-y-1">
                {product.contentLanguage === 'nl' && (
                  <li>Volledig Nederlandstalige planner</li>
                )}
                {product.files.some((f) => f.templateSet) && (
                  <li>{t('shop.multipleTemplateLayouts')}</li>
                )}
                {product.files.some((f) => f.timeFormat) && (
                  <li>{t('shop.timeFormats')}</li>
                )}
                {product.files.some((f) => f.calendar) && (
                  <li>{t('shop.calendarIntegration')}</li>
                )}
                {product.files.some((f) => f.weekStart) && (
                  <li>{t('shop.weekStartOptions')}</li>
                )}
              </ul>
              <Link
                href={`/${locale}/how-to-import`}
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary hover:underline"
              >
                <Info className="h-3.5 w-3.5" />
                {t('navigation.howToImport')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bundle Promo Section */}
      {relatedBundles.length > 0 && (
        <div className="mt-12 p-6 bg-muted/50 rounded-xl border">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              {isNL ? 'Ook verkrijgbaar in een voordeelbundel' : 'Also available in a bundle'}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedBundles.map((bundle) => {
              const bundlePrice = bundle.hasDiscount && bundle.discountedPriceInCents !== undefined
                ? bundle.discountedPriceInCents
                : bundle.priceInCents;
              const bundlePriceFormatted = formatter.format(bundlePrice / 100);
              const savingsPercent = bundle.totalProductValueInCents
                ? Math.round((1 - bundlePrice / bundle.totalProductValueInCents) * 100)
                : null;

              return (
                <Link
                  key={bundle.id}
                  href={`/${locale}/shop/bundles/${bundle.slug}`}
                  className="relative block p-4 bg-background rounded-lg border hover:border-primary hover:shadow-md transition-all"
                >
                  <Sparkles className="absolute top-2 right-2 h-4 w-4 text-primary" />
                  <div className="flex items-start gap-3">
                    {bundle.images[0] && (
                      <img
                        src={bundle.images[0]}
                        alt={bundle.name}
                        className="w-16 h-16 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold line-clamp-1">{bundle.name}</h3>
                      {bundle.shortDescription && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {bundle.shortDescription}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-bold text-primary">{bundlePriceFormatted}</span>
                        {savingsPercent && savingsPercent > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {isNL ? `Bespaar ${savingsPercent}%` : `Save ${savingsPercent}%`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Product Description */}
      {product.description && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">
            {isNL ? 'Beschrijving' : 'Description'}
          </h2>
          <div
            className="prose prose-sm max-w-none text-muted-foreground break-words overflow-hidden [&_p:empty]:min-h-[1.5em] [&_p:empty]:block [&_p:empty]:before:content-['\00a0']"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}

      {/* Related Products */}
      <RelatedProducts products={relatedProducts} bundles={[]} locale={locale} />

      {/* Customer Reviews */}
      <ReviewsSection
        productId={product.id}
        locale={locale}
        isLoggedIn={isLoggedIn}
        isOwned={isOwned}
        customerName={customerName}
        translations={{
          title: t('reviews.title'),
          writeReview: t('reviews.writeReview'),
          noReviews: t('reviews.noReviews'),
          basedOn: t('reviews.basedOn'),
          sortBy: t('reviews.sortBy'),
          sortRecent: t('reviews.sortRecent'),
          sortHighest: t('reviews.sortHighest'),
          sortLowest: t('reviews.sortLowest'),
          loginToReview: t('reviews.loginToReview'),
          alreadyReviewed: t('reviews.alreadyReviewed'),
          yourRating: t('reviews.yourRating'),
          yourName: t('reviews.yourName'),
          yourReview: t('reviews.yourReview'),
          submitReview: t('reviews.submitReview'),
          submitting: t('reviews.submitting'),
          thankYou: t('reviews.thankYou'),
          reviewPending: t('reviews.reviewPending'),
          errors: {
            ratingRequired: t('reviews.errors.ratingRequired'),
            nameRequired: t('reviews.errors.nameRequired'),
            reviewTooShort: t('reviews.errors.reviewTooShort'),
            submitFailed: t('reviews.errors.submitFailed'),
          },
        }}
      />

      {/* Lightbox */}
      {isLightboxOpen && (
        <ImageLightbox
          images={images}
          currentIndex={getImageIndex(currentImageIndex, videoIndex)}
          onClose={() => setIsLightboxOpen(false)}
          onNavigate={(imgIdx) => {
            // Map image array index back to gallery index
            if (hasVideo && imgIdx >= videoIndex) {
              setCurrentImageIndex(imgIdx + 1);
            } else {
              setCurrentImageIndex(imgIdx);
            }
          }}
          alt={product.name}
        />
      )}
    </div>
  );
}
