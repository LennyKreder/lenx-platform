import { prisma } from '@/lib/prisma';

/**
 * Calculate the total value of all products in a bundle (sum of individual prices).
 * Used to show the "original" price before bundle discount.
 */
export async function getBundleTotalProductValue(
  bundleId: number,
  isAllAccess: boolean
): Promise<number> {
  if (isAllAccess) {
    // Sum all published products
    const result = await prisma.product.aggregate({
      where: { isPublished: true },
      _sum: { priceInCents: true },
    });
    return result._sum.priceInCents || 0;
  }

  // Get bundle items and sum their prices
  const bundleItems = await prisma.bundleItem.findMany({
    where: { bundleId },
    include: {
      product: { select: { id: true, priceInCents: true, isPublished: true } },
    },
  });

  let totalProductPrice = 0;
  const seenProductIds = new Set<number>();

  for (const item of bundleItems) {
    if (item.product && item.product.isPublished) {
      if (!seenProductIds.has(item.product.id)) {
        seenProductIds.add(item.product.id);
        totalProductPrice += item.product.priceInCents;
      }
    }
  }

  return totalProductPrice;
}

/**
 * Calculate a bundle's base price.
 * - If fixedPriceInCents is set, use that.
 * - Otherwise, if discountPercent is set, calculate from included products.
 */
export async function calculateBundlePrice(
  bundleId: number,
  fixedPriceInCents: number | null,
  discountPercent: number | null,
  isAllAccess: boolean
): Promise<number> {
  // If fixed price is set, use it
  if (fixedPriceInCents !== null && fixedPriceInCents > 0) {
    return fixedPriceInCents;
  }

  // Calculate from products if discountPercent is set
  if (discountPercent !== null) {
    let totalProductPrice = 0;

    if (isAllAccess) {
      // Sum all published products
      const result = await prisma.product.aggregate({
        where: { isPublished: true },
        _sum: { priceInCents: true },
      });
      totalProductPrice = result._sum.priceInCents || 0;
    } else {
      // Get bundle items and sum their prices
      const bundleItems = await prisma.bundleItem.findMany({
        where: { bundleId },
        include: {
          product: { select: { id: true, priceInCents: true, isPublished: true } },
        },
      });

      const seenProductIds = new Set<number>();
      for (const item of bundleItems) {
        if (item.product && item.product.isPublished) {
          if (!seenProductIds.has(item.product.id)) {
            seenProductIds.add(item.product.id);
            totalProductPrice += item.product.priceInCents;
          }
        }
      }
    }

    // Apply discount percentage (discountPercent means X% off, so we pay 100-X%)
    const discountAmount = Math.round(totalProductPrice * (discountPercent / 100));
    return totalProductPrice - discountAmount;
  }

  return 0;
}
