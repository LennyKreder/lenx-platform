import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { Sparkles, ChevronLeft, Check, Download } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BundleAddToCart } from '@/components/shop/BundleAddToCart';
import { getBundleDiscountedPrice } from '@/lib/discounts';
import { calculateBundlePrice, getBundleTotalProductValue } from '@/lib/bundle-pricing';
import { getCustomerSession, customerOwnsBundle } from '@/lib/customer-session';
import { createTranslator, type Locale } from '@/lib/i18n';
import { replaceTemplateVariables } from '@/lib/template-variables';
import { buildBundleUrl, buildDatedProductUrl, buildUndatedProductUrl, isDatedProductType, type DatedProductType, type UndatedProductType, type YearSegment } from '@/lib/routing';
import { getProductTypeUrlSegment } from '@/config/product-types';
import { themes } from '@/config/themes';
import { ProductJsonLd } from '@/components/shop/ProductJsonLd';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);

  // Find bundle by any slug (not just locale-specific) to support language switching
  const bundle = await prisma.bundle.findFirst({
    where: {
      siteId: site.id,
      isPublished: true,
      slugs: {
        some: { slug },
      },
    },
    include: {
      translations: {
        where: { languageCode: locale },
      },
    },
  });

  if (!bundle) {
    return { title: 'Bundle Not Found' };
  }

  const translation = bundle.translations[0];
  const name = translation?.name || 'Bundle';
  const description = (translation?.description || `Get the ${name} bundle`).replace(/<[^>]*>/g, '').slice(0, 160);
  const ogImage = (bundle.images as string[])?.[0];

  const canonicalUrl = `${baseUrl}/${locale}/shop/bundles/${slug}`;

  return {
    title: `${name} - Shop`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${name} - ${site.name}`,
      description,
      type: 'website',
      url: canonicalUrl,
      siteName: site.name,
      ...(ogImage && { images: [{ url: ogImage, alt: name }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} - ${site.name}`,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function BundleDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const t = createTranslator(locale as Locale);
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);

  if (!site.hasBundles) notFound();

  // Find bundle by any slug (not just locale-specific) to support language switching
  const bundle = await prisma.bundle.findFirst({
    where: {
      siteId: site.id,
      isPublished: true,
      slugs: {
        some: { slug },
      },
    },
    include: {
      translations: {
        where: { languageCode: locale },
      },
      slugs: {
        where: { isPrimary: true, languageCode: locale },
      },
      items: {
        include: {
          product: {
            include: {
              translations: {
                where: { languageCode: locale },
              },
              template: {
                include: {
                  translations: {
                    where: { languageCode: locale },
                  },
                },
              },
              slugs: {
                where: { isPrimary: true },
              },
            },
          },
        },
      },
    },
  });

  if (!bundle) {
    notFound();
  }

  // If the URL slug doesn't match the locale's primary slug, redirect to the correct one
  const localeSlug = bundle.slugs[0]?.slug;
  if (localeSlug && localeSlug !== slug) {
    redirect(buildBundleUrl(locale, localeSlug));
  }

  const translation = bundle.translations[0];
  const name = translation?.name || 'Bundle';
  const description = translation?.description || '';

  // Count included products (filtered by content language for this shop)
  let includedProductCount = 0;
  if (bundle.isAllAccess) {
    includedProductCount = await prisma.product.count({
      where: {
        siteId: site.id,
        isPublished: true,
        contentLanguage: locale,
      },
    });
  } else {
    // Bundle items are already filtered by locale in the query
    const productIds = new Set<number>();
    for (const item of bundle.items) {
      if (item.product) {
        productIds.add(item.product.id);
      }
    }
    includedProductCount = productIds.size;
  }

  // Collect included products for display
  interface IncludedProduct {
    id: number;
    name: string;
    href: string;
    images: string[];
    theme: string | null;
    priceInCents: number;
    currency: string;
  }
  const includedProducts: IncludedProduct[] = [];
  const seenIds = new Set<number>();

  if (!bundle.isAllAccess) {
    for (const item of bundle.items) {
      if (item.product && !seenIds.has(item.product.id)) {
        seenIds.add(item.product.id);
        const prodTranslation = item.product.translations[0];
        const templateTranslation = item.product.template?.translations[0];
        let prodSlug = item.product.slugs.find(s => s.languageCode === locale)
          || item.product.slugs[0];

        // If product has no direct slug, find a sibling product's slug
        // (year variants share the same slug text but only one has the record)
        if (!prodSlug && item.product.templateId && item.product.theme && item.product.device) {
          const siblingSlug = await prisma.slugRoute.findFirst({
            where: {
              languageCode: locale,
              isPrimary: true,
              product: {
                templateId: item.product.templateId,
                theme: item.product.theme,
                device: item.product.device,
                contentLanguage: item.product.contentLanguage,
              },
            },
          });
          if (siblingSlug) {
            prodSlug = siblingSlug;
          }
        }

        const prodVars = (item.product.templateVariables || {}) as Record<string, string>;
        const prodBuiltIn = { year: item.product.year, theme: item.product.theme, language: item.product.contentLanguage };
        const rawName = prodTranslation?.name || templateTranslation?.name || 'Product';
        const prodSlugStr = prodSlug?.slug || '';

        // Build proper product URL with type path and year
        let prodHref = '#';
        if (prodSlugStr) {
          const pType = item.product.productType;
          const urlSegment = pType ? getProductTypeUrlSegment(pType) : 'planners';
          if (item.product.year && pType && isDatedProductType(urlSegment)) {
            prodHref = buildDatedProductUrl(locale, urlSegment as DatedProductType, String(item.product.year) as YearSegment, prodSlugStr);
          } else if (pType && !isDatedProductType(urlSegment)) {
            prodHref = buildUndatedProductUrl(locale, urlSegment as UndatedProductType, prodSlugStr);
          } else {
            prodHref = `/${locale}/shop/${urlSegment}/${prodSlugStr}`;
          }
        }

        includedProducts.push({
          id: item.product.id,
          name: replaceTemplateVariables(rawName, prodVars, prodBuiltIn),
          href: prodHref,
          images: item.product.images as string[],
          theme: item.product.theme,
          priceInCents: item.product.priceInCents,
          currency: item.product.currency,
        });
      }
    }
  }

  // Get bundle price (from fixedPrice or calculated from products with discountPercent)
  const originalPrice = await calculateBundlePrice(
    bundle.id,
    bundle.fixedPriceInCents,
    bundle.discountPercent,
    bundle.isAllAccess
  );
  // Get any additional discount info (from Discount model)
  const discountResult = await getBundleDiscountedPrice(bundle.id, originalPrice, bundle.isAllAccess);
  const hasDiscount = discountResult.discountAmount > 0;
  const displayPrice = hasDiscount ? discountResult.discountedPriceInCents : originalPrice;

  // Get total value of products for cart display (not for all-access bundles)
  const totalProductValue = !bundle.isAllAccess
    ? await getBundleTotalProductValue(bundle.id, bundle.isAllAccess)
    : undefined;

  const formatter = new Intl.NumberFormat(locale === 'nl' ? 'nl-NL' : 'en-US', {
    style: 'currency',
    currency: bundle.currency,
  });
  const originalPriceFormatted = formatter.format(originalPrice / 100);
  const displayPriceFormatted = formatter.format(displayPrice / 100);

  // Check if logged-in customer owns this bundle
  let isOwned = false;
  const session = await getCustomerSession();
  if (session) {
    isOwned = await customerOwnsBundle(session.customerId, bundle.id);
  }

  const isNL = locale === 'nl';

  return (
    <>
      <ProductJsonLd
        product={{
          name,
          description,
          images: (bundle.images as string[]) || [],
          priceInCents: displayPrice,
          discountedPriceInCents: hasDiscount ? displayPrice : undefined,
          hasDiscount,
          currency: bundle.currency,
          productType: 'Bundle',
        }}
        siteName={site.name}
        baseUrl={baseUrl}
      />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Breadcrumbs
          locale={locale}
          baseUrl={baseUrl}
          items={[
            { label: isNL ? 'Winkel' : 'Shop', href: `/${locale}/shop` },
            { label: isNL ? 'Bundels' : 'Bundles', href: `/${locale}/shop/bundles` },
            { label: name },
          ]}
        />

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image/Visual Section */}
          <div className={`aspect-square rounded-xl flex items-center justify-center overflow-hidden ${
            bundle.isAllAccess
              ? 'bg-gradient-to-br from-amber-200 to-amber-300 dark:from-amber-700 dark:to-amber-800'
              : 'bg-gradient-to-br from-primary/10 to-primary/20'
          }`}>
            {bundle.images && (bundle.images as string[])[0] ? (
              <img
                src={(bundle.images as string[])[0]}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-8">
                <Sparkles className={`h-24 w-24 mx-auto mb-4 ${
                  bundle.isAllAccess ? 'text-white/80' : 'text-primary/40'
                }`} />
                <p className={`text-lg ${
                  bundle.isAllAccess ? 'text-white/90' : 'text-muted-foreground'
                }`}>
                  {t('shop.accessToProducts', { count: includedProductCount })}
                </p>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={bundle.isAllAccess
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white border-0 gap-1'
                  : 'bg-primary text-primary-foreground gap-1'
                }>
                  <Sparkles className="h-3 w-3" />
                  {t('shop.bundle')}
                </Badge>
                {bundle.isAllAccess && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700">
                    {t('shop.allAccess')}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold">{name}</h1>
              {description && (
                <div
                  className="prose prose-sm max-w-none text-muted-foreground mt-2 [&_p:empty]:min-h-[1.5em] [&_p:empty]:block [&_p:empty]:before:content-['\00a0']"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
            </div>

            {/* Price */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-4xl font-bold ${
                bundle.isAllAccess ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
              }`}>
                {displayPriceFormatted}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-2xl text-muted-foreground line-through">
                    {originalPriceFormatted}
                  </span>
                  <Badge variant="destructive" className="text-base">
                    -{discountResult.discountPercent}%
                  </Badge>
                </>
              )}
              {totalProductValue && totalProductValue > displayPrice && (
                <span className="text-2xl text-muted-foreground line-through">
                  {formatter.format(totalProductValue / 100)}
                </span>
              )}
            </div>

            {/* What's included */}
            <div className="border rounded-lg p-6 space-y-4">
              <h2 className="font-semibold text-lg">
                {t('shop.whatsIncluded')}
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>
                    {t('shop.accessToProducts', { count: includedProductCount })}
                  </span>
                </li>
                {bundle.isAllAccess && (
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span>
                      {t('shop.includesFutureProducts')}
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>
                    {t('shop.unlimitedDownloads')}
                  </span>
                </li>
              </ul>
            </div>

            {/* Add to Cart or Owned State */}
            {isOwned ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {t('shop.youOwnBundle')}
                  </span>
                </div>
                <Button size="lg" className="w-full text-lg py-6" asChild>
                  <Link href={`/${locale}/account/library`}>
                    <Download className="h-5 w-5 mr-2" />
                    {t('shop.goToLibrary')}
                  </Link>
                </Button>
              </div>
            ) : (
              <BundleAddToCart
                bundle={{
                  id: bundle.id,
                  name,
                  priceInCents: displayPrice,
                  originalPriceInCents: totalProductValue,
                  currency: bundle.currency,
                  images: bundle.images as string[],
                  isAllAccess: bundle.isAllAccess,
                  theme: bundle.theme,
                }}
                locale={locale}
              />
            )}
          </div>
        </div>

        {/* Included Products */}
        {includedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">
              {t('shop.includedProducts')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {includedProducts.map((product) => (
                <Link
                  key={product.id}
                  href={product.href}
                  className="group rounded-lg border overflow-hidden hover:border-primary/40 transition-all"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          backgroundColor: product.theme ? themes[product.theme]?.previewColor : undefined,
                        }}
                      >
                        <span className="text-sm font-medium text-white/90 drop-shadow-sm px-2 text-center">
                          {product.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </p>
                    {product.priceInCents > 0 && (
                      <p className="text-sm text-muted-foreground line-through mt-1">
                        {formatter.format(product.priceInCents / 100)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
      </div>
    </>
  );
}
