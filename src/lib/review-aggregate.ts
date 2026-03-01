import { prisma } from '@/lib/prisma';

/**
 * Get review aggregate (average rating + count) for a product family.
 * A product family shares the same template, theme, year, and device
 * across all language variants.
 */
export async function getProductFamilyReviewAggregate(productId: number) {
  // Get product's family attributes
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { templateId: true, theme: true, year: true, device: true },
  });

  if (!product) {
    return { averageRating: 0, reviewCount: 0 };
  }

  // Find all sibling product IDs (same family, any language)
  const siblings = await prisma.product.findMany({
    where: {
      templateId: product.templateId,
      theme: product.theme,
      year: product.year,
      device: product.device,
    },
    select: { id: true },
  });

  const siblingIds = siblings.map((s) => s.id);

  const aggregate = await prisma.review.aggregate({
    where: { productId: { in: siblingIds }, approved: true },
    _avg: { rating: true },
    _count: true,
  });

  return {
    averageRating: aggregate._avg.rating
      ? Math.round(aggregate._avg.rating * 10) / 10
      : 0,
    reviewCount: aggregate._count,
  };
}
