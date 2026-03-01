const DEFAULT_BASE_URL = 'https://layoutsbylenny.com';

interface ProductJsonLdProps {
  product: {
    name: string;
    description: string;
    images: string[];
    priceInCents: number;
    discountedPriceInCents?: number;
    hasDiscount?: boolean;
    currency: string;
    productType?: string | null;
  };
  reviewData?: {
    averageRating: number;
    reviewCount: number;
  } | null;
  siteName?: string;
  baseUrl?: string;
}

function toAbsoluteUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http')) return url;
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function ProductJsonLd({ product, reviewData, siteName, baseUrl }: ProductJsonLdProps) {
  const resolvedBaseUrl = baseUrl || DEFAULT_BASE_URL;
  const resolvedSiteName = siteName || 'Layouts by Lenny';
  const images = product.images.map((img) => toAbsoluteUrl(img, resolvedBaseUrl));

  // Google requires the image field — skip JSON-LD entirely if no images
  if (images.length === 0) {
    return null;
  }

  const price = product.hasDiscount && product.discountedPriceInCents !== undefined
    ? product.discountedPriceInCents
    : product.priceInCents;

  const priceValidUntil = `${new Date().getFullYear()}-12-31`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description?.replace(/<[^>]*>/g, '').slice(0, 500) || '',
    image: images,
    brand: {
      '@type': 'Brand',
      name: resolvedSiteName,
    },
    ...(product.productType && {
      category: product.productType,
    }),
    offers: {
      '@type': 'Offer',
      price: (price / 100).toFixed(2),
      priceCurrency: product.currency,
      priceValidUntil,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: resolvedSiteName,
        url: resolvedBaseUrl,
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: 0,
          currency: product.currency,
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: ['NL', 'BE', 'US', 'GB', 'DE', 'FR', 'ES', 'IT'],
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 0,
            unitCode: 'DAY',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: ['NL', 'BE', 'US', 'GB', 'DE', 'FR', 'ES', 'IT'],
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
        merchantReturnDays: 0,
        returnFees: 'https://schema.org/FreeReturn',
        returnMethod: 'https://schema.org/ReturnByMail',
      },
    },
  };

  if (reviewData && reviewData.reviewCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviewData.averageRating,
      bestRating: 5,
      worstRating: 1,
      reviewCount: reviewData.reviewCount,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
