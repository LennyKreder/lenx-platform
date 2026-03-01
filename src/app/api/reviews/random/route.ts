import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders } from '@/lib/site-context';

export const dynamic = 'force-dynamic';

// GET /api/reviews/random - Get random approved reviews for the reviews widget
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const qty = Math.min(parseInt(searchParams.get('qty') || '5', 10), 20);
  const locale = searchParams.get('locale') || 'en';

  const site = await getSiteFromHeaders();

  // Get total count of approved reviews
  const totalCount = await prisma.review.count({
    where: { siteId: site.id, approved: true },
  });

  if (totalCount === 0) {
    return NextResponse.json({ reviews: [] });
  }

  // Fetch more than needed, then shuffle and pick
  const allReviews = await prisma.review.findMany({
    where: { siteId: site.id, approved: true },
    select: {
      id: true,
      rating: true,
      reviewerName: true,
      reviewText: true,
      language: true,
      verifiedPurchase: true,
      createdAt: true,
      translations: {
        select: { languageCode: true, reviewText: true },
      },
      product: {
        select: {
          id: true,
          templateId: true,
          year: true,
          theme: true,
          device: true,
          productType: true,
          template: {
            select: {
              translations: {
                where: { languageCode: locale },
                select: { name: true },
              },
            },
          },
        },
      },
    },
    take: Math.min(totalCount, 100),
  });

  // Shuffle using Fisher-Yates
  for (let i = allReviews.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allReviews[i], allReviews[j]] = [allReviews[j], allReviews[i]];
  }

  const selected = allReviews.slice(0, qty);

  // Collect unique product families to find locale-appropriate products for links
  const familyKeys = new Map<string, { templateId: number | null; theme: string | null; year: number | null; device: string | null }>();
  for (const r of selected) {
    const key = `${r.product.templateId}-${r.product.theme}-${r.product.year}-${r.product.device}`;
    if (!familyKeys.has(key)) {
      familyKeys.set(key, {
        templateId: r.product.templateId,
        theme: r.product.theme,
        year: r.product.year,
        device: r.product.device,
      });
    }
  }

  // Find locale-appropriate products for each family (for slug/link resolution)
  const familyConditions = Array.from(familyKeys.values()).map((f) => ({
    templateId: f.templateId,
    theme: f.theme,
    year: f.year,
    device: f.device,
    contentLanguage: locale,
  }));

  const localeProducts = familyConditions.length > 0
    ? await prisma.product.findMany({
        where: { OR: familyConditions },
        select: {
          templateId: true,
          theme: true,
          year: true,
          device: true,
          productType: true,
          slugs: {
            where: { isPrimary: true, languageCode: locale },
            select: { slug: true },
          },
        },
      })
    : [];

  // Build lookup map: family key -> locale product
  const localeProductMap = new Map<string, (typeof localeProducts)[0]>();
  for (const p of localeProducts) {
    const key = `${p.templateId}-${p.theme}-${p.year}-${p.device}`;
    localeProductMap.set(key, p);
  }

  const reviews = selected.map((r) => {
    // Language-neutral product name: template name + theme + year
    const templateName = r.product.template?.translations[0]?.name || null;
    const themeName = r.product.theme
      ? r.product.theme.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      : null;
    const nameParts = [templateName, themeName, r.product.year ? String(r.product.year) : null].filter(Boolean);
    const productName = nameParts.length > 0 ? nameParts.join(' ') : null;

    // Resolve link to locale-appropriate product
    const familyKey = `${r.product.templateId}-${r.product.theme}-${r.product.year}-${r.product.device}`;
    const localeProduct = localeProductMap.get(familyKey);
    const productSlug = localeProduct?.slugs[0]?.slug || null;
    const productType = localeProduct?.productType || r.product.productType;

    let productPath: string | null = null;
    if (productSlug && productType) {
      const typePathMap: Record<string, string> = {
        planner: 'planners',
        printable: 'printables',
        notebook: 'notebooks',
        template: 'templates',
      };
      const typePath = typePathMap[productType] || productType;
      if (r.product.year && (productType === 'planner' || productType === 'printable')) {
        productPath = `/shop/${typePath}/${r.product.year}/${productSlug}`;
      } else {
        productPath = `/shop/${typePath}/${productSlug}`;
      }
    }

    const translations: Record<string, string> = {};
    for (const t of r.translations) {
      translations[t.languageCode] = t.reviewText;
    }

    return {
      id: r.id,
      rating: r.rating,
      reviewerName: r.reviewerName,
      reviewText: r.reviewText,
      language: r.language,
      translations,
      verifiedPurchase: r.verifiedPurchase,
      createdAt: r.createdAt.toISOString(),
      productName,
      productPath,
    };
  });

  return NextResponse.json(
    { reviews },
    {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
