import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { batchGetProductDiscountedPrices } from '@/lib/discounts';
import { replaceTemplateVariables } from '@/lib/template-variables';
import { productTypes, type ProductTypeId } from '@/config/product-types';
import { getThemeName } from '@/config/themes';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';

export const dynamic = 'force-dynamic';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function toAbsoluteUrl(url: string, baseUrl: string): string {
  if (url.startsWith('http')) return url;
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

function buildProductUrl(
  baseUrl: string,
  locale: string,
  productType: string | null,
  year: number | null,
  slug: string,
): string {
  const typeConfig = productType
    ? productTypes[productType as ProductTypeId]
    : null;
  const urlSegment = typeConfig?.urlSegment || 'planners';
  const isDated = typeConfig?.dated ?? true;

  if (isDated) {
    const yearSegment = year ? String(year) : 'undated';
    return `${baseUrl}/${locale}/shop/${urlSegment}/${yearSegment}/${slug}`;
  }
  return `${baseUrl}/${locale}/shop/${urlSegment}/${slug}`;
}

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') || 'en';
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);

  // Fetch all published products for this locale
  const products = await prisma.product.findMany({
    where: {
      siteId: site.id,
      isPublished: true,
      OR: [
        { contentLanguage: locale },
        { contentLanguage: null },
      ],
    },
    include: {
      template: {
        include: {
          translations: { where: { languageCode: locale } },
          slugs: {
            where: { isPrimary: true, languageCode: locale },
          },
        },
      },
      translations: { where: { languageCode: locale } },
      slugs: {
        where: { isPrimary: true, languageCode: locale },
      },
    },
  });

  // Build sibling slug lookup for products without direct slugs
  // Slugs are shared across years (same template/theme/device/language combo)
  const slugLookup = new Map<string, string>();
  for (const product of products) {
    if (product.slugs[0]?.slug) {
      const key = `${product.templateId}-${product.theme}-${product.device}-${product.contentLanguage}`;
      if (!slugLookup.has(key)) {
        slugLookup.set(key, product.slugs[0].slug);
      }
    }
  }

  // Get discounted prices
  const discountResults = await batchGetProductDiscountedPrices(
    products.map((p) => ({
      id: p.id,
      priceInCents: p.priceInCents,
      year: p.year,
      device: p.device,
      templateId: p.templateId,
    })),
  );

  const items = products
    .map((product) => {
      const productTranslation = product.translations[0];
      const templateTranslation = product.template?.translations[0];

      // Resolve slug: product slug > sibling slug (same template/theme/device/language)
      const siblingKey = `${product.templateId}-${product.theme}-${product.device}-${product.contentLanguage}`;
      const slug =
        product.slugs[0]?.slug ||
        slugLookup.get(siblingKey);

      if (!slug) return null;

      // Resolve name and description with template variable replacement
      const productVars = (product.templateVariables as Record<string, string>) || {};
      const builtIn = {
        year: product.year,
        theme: product.theme ? getThemeName(product.theme, locale) : null,
        language: product.contentLanguage,
      };

      const rawName =
        productTranslation?.name ||
        templateTranslation?.name ||
        'Unnamed Product';
      const rawDescription =
        productTranslation?.description ||
        templateTranslation?.description ||
        '';

      const name = replaceTemplateVariables(rawName, productVars, builtIn);
      const description = stripHtml(
        replaceTemplateVariables(rawDescription, productVars, builtIn),
      ).slice(0, 5000);

      const images = (product.images as string[]) || [];
      const link = buildProductUrl(baseUrl, locale, product.productType, product.year, slug);

      // Pricing
      const discount = discountResults.get(product.id);
      const price = product.priceInCents;
      const salePrice =
        discount && discount.discountAmount > 0
          ? discount.discountedPriceInCents
          : null;

      return {
        id: product.id,
        name,
        description,
        link,
        images,
        price,
        salePrice,
        currency: product.currency,
        productType: product.productType,
        device: product.device,
        availability: 'in_stock',
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Build XML feed
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(site.name)} - ${locale.toUpperCase()}</title>
    <link>${baseUrl}/${locale}/shop</link>
    <description>Products by ${escapeXml(site.name)}</description>
${items
  .map((item) => {
    const imageLink = item.images[0] ? toAbsoluteUrl(item.images[0], baseUrl) : '';
    const additionalImages = item.images
      .slice(1, 11)
      .map((img) => `      <g:additional_image_link>${escapeXml(toAbsoluteUrl(img, baseUrl))}</g:additional_image_link>`)
      .join('\n');

    return `    <item>
      <g:id>${item.id}</g:id>
      <g:title>${escapeXml(item.name)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
${imageLink ? `      <g:image_link>${escapeXml(imageLink)}</g:image_link>` : ''}
${additionalImages}
      <g:price>${(item.price / 100).toFixed(2)} ${item.currency}</g:price>
${item.salePrice !== null ? `      <g:sale_price>${(item.salePrice / 100).toFixed(2)} ${item.currency}</g:sale_price>` : ''}
      <g:availability>${item.availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(site.name)}</g:brand>
${item.productType ? `      <g:product_type>${escapeXml(item.productType)}</g:product_type>` : ''}
      <g:identifier_exists>false</g:identifier_exists>
      <g:shipping>
        <g:country>NL</g:country>
        <g:price>0 ${item.currency}</g:price>
      </g:shipping>
      <g:shipping>
        <g:country>BE</g:country>
        <g:price>0 ${item.currency}</g:price>
      </g:shipping>
    </item>`;
  })
  .join('\n')}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
