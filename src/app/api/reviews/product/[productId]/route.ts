import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ productId: string }>;
}

// GET /api/reviews/product/[productId] - Get approved reviews for a product family
// Reviews are shared across all language variants of the same product
// (same template, theme, year, device)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { productId: productIdStr } = await params;
  const productId = parseInt(productIdStr, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const sortBy = searchParams.get('sortBy') || 'recent'; // 'recent', 'highest', 'lowest'

  // Get product and its family attributes
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      templateId: true,
      theme: true,
      year: true,
      device: true,
      productType: true,
      template: {
        select: {
          translations: {
            select: { languageCode: true, name: true },
          },
        },
      },
    },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Find all sibling products (same template, theme, year, device — any language)
  const siblingProducts = await prisma.product.findMany({
    where: {
      templateId: product.templateId,
      theme: product.theme,
      year: product.year,
      device: product.device,
    },
    select: { id: true },
  });
  const siblingIds = siblingProducts.map((p) => p.id);

  // Reviews for the whole product family
  const whereClause = { productId: { in: siblingIds }, approved: true };

  // Build order by clause
  let orderBy: { createdAt?: 'desc' | 'asc'; rating?: 'desc' | 'asc' } = { createdAt: 'desc' };
  if (sortBy === 'highest') {
    orderBy = { rating: 'desc' };
  } else if (sortBy === 'lowest') {
    orderBy = { rating: 'asc' };
  }

  // Fetch reviews and aggregate in parallel
  const [reviews, totalCount, aggregate, distribution] = await Promise.all([
    prisma.review.findMany({
      where: whereClause,
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
            year: true,
            theme: true,
            productType: true,
            template: {
              select: {
                translations: {
                  select: { languageCode: true, name: true },
                },
              },
            },
            slugs: {
              where: { isPrimary: true },
              select: { languageCode: true, slug: true },
            },
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where: whereClause }),
    prisma.review.aggregate({
      where: whereClause,
      _avg: { rating: true },
      _count: true,
    }),
    // Get distribution of ratings
    prisma.review.groupBy({
      by: ['rating'],
      where: whereClause,
      _count: true,
    }),
  ]);

  // Build distribution object
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of distribution) {
    ratingDistribution[d.rating as keyof typeof ratingDistribution] = d._count;
  }

  // Build language-neutral product name from template + theme + year
  const templateTranslations = product.template?.translations || [];
  const templateName = templateTranslations.find(t => t.languageCode === 'en')?.name
    || templateTranslations[0]?.name
    || null;
  const themeName = product.theme
    ? product.theme.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null;
  const nameParts = [templateName, themeName, product.year ? String(product.year) : null].filter(Boolean);
  const familyProductName = nameParts.length > 0 ? nameParts.join(' ') : null;

  return NextResponse.json({
    reviews: reviews.map((r) => {
      // Get product slug (prefer English)
      const productSlug = r.product.slugs.find(s => s.languageCode === 'en')?.slug
        || r.product.slugs[0]?.slug
        || null;

      // Build product URL path based on productType
      let productPath: string | null = null;
      const pType = r.product.productType;
      if (productSlug && pType) {
        const typePathMap: Record<string, string> = {
          planner: 'planners',
          printable: 'printables',
          notebook: 'notebooks',
          template: 'templates',
        };
        const typePath = typePathMap[pType] || pType;
        if (r.product.year && (pType === 'planner' || pType === 'printable')) {
          productPath = `/shop/${typePath}/${r.product.year}/${productSlug}`;
        } else {
          productPath = `/shop/${typePath}/${productSlug}`;
        }
      }

      // Build translations map
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
        productName: familyProductName,
        productPath,
      };
    }),
    aggregate: {
      average: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : 0,
      count: aggregate._count,
      distribution: ratingDistribution,
    },
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  });
}
