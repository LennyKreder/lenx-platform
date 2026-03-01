import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { ProductDetailPage } from '@/components/shop/ProductDetailPage';
import { ProductJsonLd } from '@/components/shop/ProductJsonLd';
import { getProductDiscountedPrice } from '@/lib/discounts';
import { getCustomerSession, customerOwnsProduct } from '@/lib/customer-session';
import { getSettings } from '@/lib/settings';
import { replaceTemplateVariables } from '@/lib/template-variables';
import { calculateBundlePrice, getBundleTotalProductValue } from '@/lib/bundle-pricing';
import { getBundleDiscountedPrice } from '@/lib/discounts';
import { isValidYearSegment, buildDatedProductUrl, type YearSegment } from '@/lib/routing';
import { getThemeName } from '@/config/themes';
import { getProductFamilyReviewAggregate } from '@/lib/review-aggregate';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string; year: string; slug: string }>;
}

// Helper to get translation for a specific language
function getTranslation<
  T extends { languageCode: string; name?: string | null; title?: string | null; description?: string | null },
>(translations: T[], langCode: string): T | undefined {
  return translations.find((t) => t.languageCode === langCode) || translations[0];
}

// Helper to get slug for a specific language
function getSlug(
  slugs: { languageCode: string; slug: string }[],
  langCode: string
): string {
  const s = slugs.find((sl) => sl.languageCode === langCode);
  return s?.slug || slugs[0]?.slug || '';
}

async function getProduct(siteId: string, slug: string, locale: string, year: number | null) {
  // Find product by slug and locale
  // First, find any product with this slug to get template/theme/device info
  const slugRoute = await prisma.slugRoute.findFirst({
    where: {
      slug,
      languageCode: locale,
      productId: { not: null },
      product: { siteId },
    },
    include: {
      product: {
        select: {
          templateId: true,
          theme: true,
          device: true,
          contentLanguage: true,
          productType: true,
        },
      },
    },
  });

  if (!slugRoute?.product) {
    return null;
  }

  // Now find the actual product for the requested year with matching characteristics
  const { templateId, theme, device, contentLanguage, productType } = slugRoute.product;

  const product = await prisma.product.findFirst({
    where: {
      siteId,
      isPublished: true,
      year,
      templateId,
      theme,
      device,
      contentLanguage,
      productType,
    },
    include: {
      template: {
        include: {
          translations: true,
          tags: {
            include: {
              tag: {
                include: {
                  translations: true,
                },
              },
            },
          },
        },
      },
      translations: true,
      slugs: { where: { isPrimary: true } },
      tags: {
        include: {
          tag: {
            include: {
              translations: true,
            },
          },
        },
      },
      files: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!product) {
    return null;
  }

  const productTranslation = getTranslation(product.translations, locale);
  const templateTranslation = product.template
    ? getTranslation(product.template.translations, locale)
    : null;

  const tagSource = product.template?.tags || product.tags || [];
  const tags = tagSource.map((t: { tag: { id: number; translations: { languageCode: string; name?: string | null }[] } }) => {
    const tagTranslation = getTranslation(t.tag.translations, locale);
    return {
      id: t.tag.id,
      name: tagTranslation?.name || '',
    };
  });

  const discountResult = await getProductDiscountedPrice(
    product.id,
    product.priceInCents,
    product.year,
    product.device,
    product.templateId
  );

  const productVars = (product.templateVariables || {}) as Record<string, string>;
  // Get the template's base name for {{name}} variable replacement
  const templateBaseName = templateTranslation?.name || '';
  // Get theme display name for {{theme}} variable replacement
  const themeDisplayName = product.theme ? getThemeName(product.theme, locale) : '';

  const builtIn = {
    year: product.year,
    theme: themeDisplayName,
    language: product.contentLanguage,
    name: templateBaseName,
  };
  // Use title field (h1 heading) if available, otherwise fall back to name
  const rawName =
    productTranslation?.title || templateTranslation?.title ||
    productTranslation?.name || templateTranslation?.name || 'Unnamed Product';
  const rawDescription =
    productTranslation?.description || templateTranslation?.description || '';

  return {
    id: product.id,
    name: replaceTemplateVariables(rawName, productVars, builtIn),
    description: replaceTemplateVariables(rawDescription, productVars, builtIn),
    slug: getSlug(product.slugs, locale),
    year: product.year,
    theme: product.theme,
    contentLanguage: product.contentLanguage,
    priceInCents: product.priceInCents,
    discountedPriceInCents: discountResult.discountedPriceInCents,
    hasDiscount: discountResult.discountAmount > 0,
    discountPercent: discountResult.discountPercent,
    currency: product.currency,
    images: product.images as string[],
    videoUrl: (product as { videoUrl?: string | null }).videoUrl ?? null,
    tags,
    productType: product.productType,
    device: product.device,
    template: product.template
      ? {
          id: product.template.id,
          name: templateTranslation?.name || '',
        }
      : null,
    files: product.files.map((f) => ({
      id: f.id,
      templateSet: f.templateSet,
      timeFormat: f.timeFormat,
      weekStart: f.weekStart,
      calendar: f.calendar,
    })),
    downloadCode: product.downloadCode,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, year, slug } = await params;

  if (!isValidYearSegment(year)) {
    return { title: 'Not Found' };
  }

  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const yearNum = year === 'undated' ? null : parseInt(year, 10);
  const product = await getProduct(site.id, slug, locale, yearNum);

  if (!product) {
    return { title: 'Product Not Found' };
  }

  // Build SEO title from seoTitle field with variable replacement, fallback to product name
  const rawProduct = await prisma.product.findUnique({
    where: { id: product.id },
    include: {
      translations: { where: { languageCode: locale } },
      template: {
        include: {
          translations: { where: { languageCode: locale } },
        },
      },
    },
  });

  const productTranslation = rawProduct?.translations[0];
  const templateTranslation = rawProduct?.template?.translations[0];
  const productVars = (rawProduct?.templateVariables || {}) as Record<string, string>;
  const templateBaseName = templateTranslation?.name || '';
  const themeDisplayName = product.theme ? getThemeName(product.theme, locale) : '';
  const builtIn = {
    year: product.year,
    theme: themeDisplayName,
    language: product.contentLanguage,
    name: templateBaseName,
  };

  // Use seoTitle if available, otherwise fall back to product name
  const rawSeoTitle = productTranslation?.seoTitle || templateTranslation?.seoTitle;
  const seoTitle = rawSeoTitle
    ? replaceTemplateVariables(rawSeoTitle, productVars, builtIn)
    : product.name;

  const description =
    product.description?.replace(/<[^>]*>/g, '').slice(0, 160) ||
    `Buy ${product.name}`;
  const ogImage = product.images[0];

  const canonicalUrl = `${baseUrl}/${locale}/shop/printables/${year}/${slug}`;

  return {
    title: `${seoTitle} - Shop`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${seoTitle} - ${site.name}`,
      description,
      type: 'website',
      url: canonicalUrl,
      siteName: site.name,
      ...(ogImage && { images: [{ url: ogImage, alt: seoTitle }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${seoTitle} - ${site.name}`,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

async function getRelatedProducts(
  siteId: string,
  productId: number,
  year: number | null,
  theme: string | null,
  locale: string,
  limit: number = 4
) {
  // Get related products with same year or theme, matching content language
  const products = await prisma.product.findMany({
    where: {
      siteId,
      isPublished: true,
      id: { not: productId },
      contentLanguage: locale,
      OR: [{ year }, { theme }],
    },
    include: {
      translations: true,
      template: { include: { translations: true } },
      slugs: { where: { isPrimary: true } },
      tags: { include: { tag: { include: { translations: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return products.map((product) => {
    const productTranslation = getTranslation(product.translations, locale);
    const templateTranslation = product.template
      ? getTranslation(product.template.translations, locale)
      : null;

    const tags = product.tags.map(
      (t: {
        tag: {
          id: number;
          translations: { languageCode: string; name?: string | null }[];
        };
      }) => ({
        id: t.tag.id,
        name: getTranslation(t.tag.translations, locale)?.name || '',
      })
    );

    const productVars = (product.templateVariables || {}) as Record<string, string>;
    const templateBaseName = templateTranslation?.name || '';
    const themeDisplayName = product.theme ? getThemeName(product.theme, locale) : '';

    const builtIn = {
      year: product.year,
      theme: themeDisplayName,
      language: product.contentLanguage,
      name: templateBaseName,
    };
    const rawName =
      productTranslation?.title || templateTranslation?.title ||
      productTranslation?.name || templateTranslation?.name || 'Unnamed Product';
    const rawDescription =
      productTranslation?.description || templateTranslation?.description || '';

    return {
      id: product.id,
      name: replaceTemplateVariables(rawName, productVars, builtIn),
      description: replaceTemplateVariables(rawDescription, productVars, builtIn),
      slug: getSlug(product.slugs, locale),
      year: product.year,
      theme: product.theme,
      contentLanguage: product.contentLanguage,
      priceInCents: product.priceInCents,
      currency: product.currency,
      images: product.images as string[],
      tags,
      productType: product.productType,
      device: product.device,
      template: product.template
        ? { id: product.template.id, name: templateTranslation?.name || '' }
        : null,
    } as const;
  });
}

async function getRelatedBundles(siteId: string, locale: string, productId: number, limit: number = 4) {
  const bundles = await prisma.bundle.findMany({
    where: {
      siteId,
      isPublished: true,
      items: {
        some: {
          productId: productId,
        },
      },
    },
    include: {
      translations: { where: { languageCode: locale } },
      slugs: { where: { isPrimary: true, languageCode: locale } },
    },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return Promise.all(
    bundles.map(async (bundle) => {
      const translation = bundle.translations[0];
      const slug = bundle.slugs[0];

      const originalPrice = await calculateBundlePrice(
        bundle.id,
        bundle.fixedPriceInCents,
        bundle.discountPercent,
        bundle.isAllAccess
      );

      const discountResult = await getBundleDiscountedPrice(
        bundle.id,
        originalPrice,
        bundle.isAllAccess
      );

      const totalProductValueInCents = !bundle.isAllAccess
        ? await getBundleTotalProductValue(bundle.id, bundle.isAllAccess)
        : undefined;

      return {
        id: bundle.id,
        type: 'bundle' as const,
        name: translation?.name || 'Bundle',
        description: translation?.description || '',
        shortDescription: translation?.shortDescription,
        slug: slug?.slug || '',
        priceInCents: originalPrice,
        discountedPriceInCents: discountResult.discountedPriceInCents,
        hasDiscount: discountResult.discountAmount > 0,
        discountPercent: discountResult.discountPercent,
        totalProductValueInCents,
        currency: bundle.currency,
        images: bundle.images as string[],
        isAllAccess: bundle.isAllAccess,
        isFeatured: bundle.isFeatured,
      };
    })
  );
}

export default async function PrintableProductPage({ params }: PageProps) {
  const { locale, year, slug } = await params;

  if (!isValidYearSegment(year)) {
    notFound();
  }

  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const yearNum = year === 'undated' ? null : parseInt(year, 10);
  const product = await getProduct(site.id, slug, locale, yearNum);

  if (!product) {
    notFound();
  }

  // Validate that the product type matches this route (printable)
  if (product.productType && product.productType !== 'printable') {
    notFound();
  }

  const customerSession = await getCustomerSession();
  const ownsProduct = customerSession
    ? await customerOwnsProduct(customerSession.customerId, product.id)
    : false;

  // Get settings first, then use them for related products
  const settings = await getSettings();

  // Get related products, bundles, and review data (family-based: cross-language)
  const [relatedProducts, relatedBundles, reviewData] = await Promise.all([
    getRelatedProducts(site.id, product.id, product.year, product.theme, locale, settings.relatedProductsMaxQty),
    getRelatedBundles(site.id, locale, product.id),
    getProductFamilyReviewAggregate(product.id).then(r => r.reviewCount > 0 ? r : null),
  ]);

  const isNL = locale === 'nl';
  const yearLabel = year === 'undated' ? (isNL ? 'Ongedateerd' : 'Undated') : year;

  return (
    <>
      <ProductJsonLd product={product} reviewData={reviewData} siteName={site.name} baseUrl={baseUrl} />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <ProductDetailPage
            product={product}
            locale={locale}
            isOwned={ownsProduct}
            relatedProducts={relatedProducts}
            relatedBundles={relatedBundles}
            breadcrumbItems={[
              { label: isNL ? 'Winkel' : 'Shop', href: `/${locale}/shop` },
              { label: 'Printables', href: `/${locale}/shop/printables` },
              { label: yearLabel, href: `/${locale}/shop/printables/${year}` },
              { label: product.name },
            ]}
          />
        </main>
        <Footer />
      </div>
    </>
  );
}
