import { notFound } from 'next/navigation';
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
import { getProductFamilyReviewAggregate } from '@/lib/review-aggregate';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Pick the best translation for a locale, falling back to any available
function pickTranslation<
  T extends { languageCode: string; name?: string | null; description?: string | null },
>(translations: T[], langCode: string): T | undefined {
  return translations.find((t) => t.languageCode === langCode) || translations[0];
}

function getSlug(
  slugs: { languageCode: string; slug: string }[],
  langCode: string
): string {
  const s = slugs.find((sl) => sl.languageCode === langCode);
  return s?.slug || slugs[0]?.slug || '';
}

async function getProduct(siteId: string, slug: string, locale: string) {
  // Try locale-specific slug first, then fall back to any language
  let slugRoute = await prisma.slugRoute.findFirst({
    where: {
      slug,
      languageCode: locale,
      productId: { not: null },
      product: { siteId },
    },
    include: {
      product: {
        include: {
          translations: true,
          slugs: { where: { isPrimary: true } },
          tags: { include: { tag: { include: { translations: true } } } },
          listings: {
            where: { channel: { type: 'webshop' } },
            take: 1,
          },
          category: {
            include: {
              translations: true,
            },
          },
        },
      },
    },
  });

  // Fallback: try any language for the slug
  if (!slugRoute) {
    slugRoute = await prisma.slugRoute.findFirst({
      where: {
        slug,
        productId: { not: null },
        product: { siteId },
      },
      include: {
        product: {
          include: {
            translations: true,
            slugs: { where: { isPrimary: true } },
            tags: { include: { tag: { include: { translations: true } } } },
            listings: {
              where: { channel: { type: 'webshop' } },
              take: 1,
            },
            category: {
              include: {
                translations: true,
              },
            },
          },
        },
      },
    });
  }

  if (!slugRoute?.product) {
    return null;
  }

  const product = slugRoute.product;

  // Check if published via listing
  const listing = product.listings[0];
  if (!listing?.isPublished) {
    return null;
  }

  const productTranslation = pickTranslation(product.translations, locale);
  const tagSource = product.tags || [];
  const tags = tagSource.map((t: { tag: { id: number; translations: { languageCode: string; name?: string | null }[] } }) => {
    const tagTranslation = pickTranslation(t.tag.translations, locale);
    return {
      id: t.tag.id,
      name: tagTranslation?.name || '',
    };
  });

  const discountResult = await getProductDiscountedPrice(
    product.id,
    listing.priceInCents,
    product.year,
    product.device,
    product.templateId
  );

  const categoryTranslation = product.category
    ? pickTranslation(product.category.translations, locale)
    : null;

  return {
    id: product.id,
    name: productTranslation?.name || 'Product',
    description: productTranslation?.description || '',
    slug: getSlug(product.slugs, locale),
    year: product.year,
    theme: product.theme,
    contentLanguage: product.contentLanguage,
    priceInCents: listing.priceInCents,
    discountedPriceInCents: discountResult.discountedPriceInCents,
    hasDiscount: discountResult.discountAmount > 0,
    discountPercent: discountResult.discountPercent,
    currency: listing.currency,
    images: (Array.isArray(product.images) ? product.images : []) as string[],
    videoUrl: (product as { videoUrl?: string | null }).videoUrl ?? null,
    tags,
    productType: product.productType,
    device: product.device,
    template: null,
    files: [],
    downloadCode: '',
    category: product.category && categoryTranslation ? { id: product.category.id, name: categoryTranslation.name || '' } : null,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);

  const product = await getProduct(site.id, slug, locale);

  if (!product) {
    return { title: 'Product Not Found' };
  }

  const description =
    product.description?.replace(/<[^>]*>/g, '').slice(0, 160) ||
    `${product.name} - ${site.name}`;
  const ogImage = product.images[0];
  const canonicalUrl = `${baseUrl}/${locale}/shop/product/${slug}`;

  return {
    title: `${product.name} - Shop`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${product.name} - ${site.name}`,
      description,
      type: 'website',
      url: canonicalUrl,
      siteName: site.name,
      ...(ogImage && { images: [{ url: ogImage, alt: product.name }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} - ${site.name}`,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

async function getRelatedProducts(
  siteId: string,
  productId: number,
  categoryId: number | null,
  locale: string,
  limit: number = 4
) {
  const products = await prisma.product.findMany({
    where: {
      siteId,
      id: { not: productId },
      listings: {
        some: {
          isPublished: true,
          channel: { type: 'webshop', siteId },
        },
      },
      ...(categoryId && { categoryId }),
    },
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
      listings: {
        where: { channel: { type: 'webshop' } },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return products.map((product) => {
    const translation = pickTranslation(product.translations, locale);

    return {
      id: product.id,
      name: translation?.name || 'Product',
      description: translation?.description || '',
      slug: getSlug(product.slugs, locale),
      year: product.year,
      theme: product.theme,
      contentLanguage: product.contentLanguage,
      priceInCents: product.listings[0]?.priceInCents ?? product.priceInCents,
      currency: product.listings[0]?.currency ?? product.currency,
      images: (Array.isArray(product.images) ? product.images : []) as string[],
      tags: [],
      productType: product.productType,
      device: product.device,
      template: null,
    };
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);

  const product = await getProduct(site.id, slug, locale);

  if (!product) {
    notFound();
  }

  const customerSession = await getCustomerSession();
  const ownsProduct = customerSession
    ? await customerOwnsProduct(customerSession.customerId, product.id)
    : false;

  const settings = await getSettings(site.id, site.siteType ?? undefined);

  // Get related products and review data
  const rawProduct = await prisma.product.findUnique({
    where: { id: product.id },
    select: { categoryId: true },
  });

  const [relatedProducts, reviewData] = await Promise.all([
    getRelatedProducts(site.id, product.id, rawProduct?.categoryId ?? null, locale, settings.relatedProductsMaxQty),
    getProductFamilyReviewAggregate(product.id).then(r => r.reviewCount > 0 ? r : null),
  ]);

  const isNL = locale === 'nl';

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
            relatedBundles={[]}
            breadcrumbItems={[
              { label: isNL ? 'Winkel' : 'Shop', href: `/${locale}/shop` },
              ...(product.category ? [{ label: product.category.name, href: `/${locale}/shop?category=${product.category.id}` }] : []),
              { label: product.name },
            ]}
          />
        </main>
        <Footer />
      </div>
    </>
  );
}
