import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ReviewsPageClient } from './ReviewsPageClient';

export const metadata: Metadata = {
  title: 'Reviews - Admin',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    productId?: string;
    search?: string;
  }>;
}

export default async function ReviewsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const pageSize = 20;
  const status = params.status;
  const productId = params.productId;
  const search = params.search;

  // Build where clause
  const where: {
    approved?: boolean;
    productId?: number;
    OR?: Array<{ reviewerName?: { contains: string; mode: 'insensitive' }; reviewText?: { contains: string; mode: 'insensitive' } }>;
  } = {};

  if (status === 'pending') {
    where.approved = false;
  } else if (status === 'approved') {
    where.approved = true;
  }

  if (productId) {
    where.productId = parseInt(productId, 10);
  }

  if (search && search.trim()) {
    where.OR = [
      { reviewerName: { contains: search.trim(), mode: 'insensitive' } },
      { reviewText: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  const [reviews, totalCount, products, stats] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        product: {
          include: {
            translations: { where: { languageCode: 'en' } },
            template: {
              include: {
                translations: { where: { languageCode: 'en' } },
              },
            },
          },
        },
        customer: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
    prisma.product.findMany({
      where: { isPublished: true },
      include: {
        translations: { where: { languageCode: 'en' } },
        template: {
          include: {
            translations: { where: { languageCode: 'en' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { approved: false } }),
      prisma.review.count({ where: { approved: true } }),
    ]),
  ]);

  // Transform reviews with product names and template info
  const transformedReviews = reviews.map((review) => {
    const template = review.product.template;
    const templateName = template?.translations[0]?.name || null;
    const productName = review.product.translations[0]?.name || templateName || 'Unknown Product';

    // Build variant info string (year, theme, language)
    const variantParts: string[] = [];
    if (review.product.year) variantParts.push(String(review.product.year));
    if (review.product.theme) variantParts.push(review.product.theme);
    if (review.product.contentLanguage) variantParts.push(review.product.contentLanguage.toUpperCase());
    const variantInfo = variantParts.length > 0 ? variantParts.join(' · ') : null;

    return {
      id: review.id,
      productId: review.productId,
      productName,
      templateId: template?.id || null,
      templateName,
      variantInfo,
      customerId: review.customerId,
      customerEmail: review.customer?.email || null,
      rating: review.rating,
      reviewerName: review.reviewerName,
      reviewText: review.reviewText,
      language: review.language,
      verifiedPurchase: review.verifiedPurchase,
      approved: review.approved,
      createdAt: review.createdAt.toISOString(),
    };
  });

  // Transform products for filter dropdown
  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.translations[0]?.name || p.template?.translations[0]?.name || 'Unknown',
  }));

  return (
    <ReviewsPageClient
      initialReviews={transformedReviews}
      initialPagination={{
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      }}
      products={productOptions}
      stats={{
        total: stats[0],
        pending: stats[1],
        approved: stats[2],
      }}
    />
  );
}
