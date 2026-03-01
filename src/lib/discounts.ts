import { prisma } from '@/lib/prisma';

export interface DiscountResult {
  originalPriceInCents: number;
  discountedPriceInCents: number;
  discountAmount: number;
  discountPercent: number;
  appliedDiscounts: AppliedDiscount[];
}

export interface AppliedDiscount {
  id: number;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  scope: string;
}

interface DiscountRecord {
  id: number;
  name: string;
  type: string;
  valueInCents: number | null;
  valuePercent: number | null;
  scope: string;
  productId: number | null;
  bundleId: number | null;
  excludeBundles: boolean;
  excludeAllAccessBundle: boolean;
  excludeProducts: boolean;
  targetYear: number | null;
  targetDevice: string | null;
  targetTemplateId: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  priority: number;
}

/**
 * Get all active discounts that apply to a product
 */
export async function getProductDiscounts(
  productId: number,
  productYear: number | null = null,
  productDevice: string | null = null,
  productTemplateId: number | null = null
): Promise<DiscountRecord[]> {
  const now = new Date();

  // Build scope conditions for product-level and all discounts
  const scopeConditions = [
    { scope: 'all' },
    { scope: 'product', productId },
  ];

  const discounts = await prisma.discount.findMany({
    where: {
      isActive: true,
      AND: [
        // Start date check
        {
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } },
          ],
        },
        // End date check
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: now } },
          ],
        },
        // Scope check
        {
          OR: scopeConditions,
        },
        // Year targeting check (null means applies to all years)
        {
          OR: [
            { targetYear: null },
            ...(productYear ? [{ targetYear: productYear }] : []),
          ],
        },
        // Device targeting check (null means applies to all devices)
        {
          OR: [
            { targetDevice: null },
            ...(productDevice ? [{ targetDevice: productDevice }] : []),
          ],
        },
        // Template targeting check (null means applies to all templates)
        {
          OR: [
            { targetTemplateId: null },
            ...(productTemplateId ? [{ targetTemplateId: productTemplateId }] : []),
          ],
        },
      ],
    },
    orderBy: { priority: 'desc' },
  });

  // Filter out discounts that exclude products (bundles-only discounts)
  const filtered = discounts.filter((d) => {
    if (d.scope === 'all' && d.excludeProducts) return false;
    return true;
  });

  return filtered as DiscountRecord[];
}

/**
 * Get all active discounts that apply to a bundle
 */
export async function getBundleDiscounts(
  bundleId: number,
  isAllAccess: boolean = false
): Promise<DiscountRecord[]> {
  const now = new Date();

  const discounts = await prisma.discount.findMany({
    where: {
      isActive: true,
      AND: [
        // Start date check
        {
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } },
          ],
        },
        // End date check
        {
          OR: [
            { endsAt: null },
            { endsAt: { gte: now } },
          ],
        },
        // Scope check
        {
          OR: [
            { scope: 'all' },
            { scope: 'bundle', bundleId },
          ],
        },
      ],
    },
    orderBy: { priority: 'desc' },
  });

  // Filter out discounts that exclude bundles
  const filteredDiscounts = discounts.filter((discount) => {
    // If this discount is specifically for this bundle, don't filter it out
    if (discount.scope === 'bundle' && discount.bundleId === bundleId) {
      return true;
    }

    // For "all" scope, check exclusions
    if (discount.scope === 'all') {
      // Exclude if excludeBundles is true
      if (discount.excludeBundles) {
        return false;
      }
      // Exclude if excludeAllAccessBundle is true and this is an all-access bundle
      if (discount.excludeAllAccessBundle && isAllAccess) {
        return false;
      }
    }

    return true;
  });

  return filteredDiscounts as DiscountRecord[];
}

/**
 * Calculate the final price after applying the most specific discount
 * Priority: product > bundle > all (more specific overrules less specific)
 * If multiple discounts have the same scope, the one with higher priority field wins
 */
export function calculateDiscountedPrice(
  originalPriceInCents: number,
  discounts: DiscountRecord[]
): DiscountResult {
  if (discounts.length === 0) {
    return {
      originalPriceInCents,
      discountedPriceInCents: originalPriceInCents,
      discountAmount: 0,
      discountPercent: 0,
      appliedDiscounts: [],
    };
  }

  // Scope priority: more specific scopes override less specific ones
  const scopePriority: Record<string, number> = {
    product: 3,
    bundle: 2,
    all: 1,
  };

  // Sort discounts by scope specificity (highest first), then by priority field
  const sortedDiscounts = [...discounts].sort((a, b) => {
    const scopeDiff = (scopePriority[b.scope] || 0) - (scopePriority[a.scope] || 0);
    if (scopeDiff !== 0) return scopeDiff;
    return b.priority - a.priority;
  });

  // Use the most specific discount (first after sorting)
  const selectedDiscount = sortedDiscounts[0];

  let discountAmount = 0;
  if (selectedDiscount.type === 'percentage' && selectedDiscount.valuePercent) {
    discountAmount = Math.round(originalPriceInCents * (selectedDiscount.valuePercent / 100));
  } else if (selectedDiscount.type === 'fixed' && selectedDiscount.valueInCents) {
    discountAmount = Math.min(selectedDiscount.valueInCents, originalPriceInCents);
  }

  const appliedDiscounts: AppliedDiscount[] = [];
  if (discountAmount > 0) {
    appliedDiscounts.push({
      id: selectedDiscount.id,
      name: selectedDiscount.name,
      type: selectedDiscount.type as 'percentage' | 'fixed',
      value: selectedDiscount.type === 'percentage' ? selectedDiscount.valuePercent! : selectedDiscount.valueInCents!,
      scope: selectedDiscount.scope,
    });
  }

  const finalPrice = Math.max(0, originalPriceInCents - discountAmount);
  const discountPercent = originalPriceInCents > 0
    ? Math.round((discountAmount / originalPriceInCents) * 100)
    : 0;

  return {
    originalPriceInCents,
    discountedPriceInCents: finalPrice,
    discountAmount,
    discountPercent,
    appliedDiscounts,
  };
}

/**
 * Get the discounted price for a product
 */
export async function getProductDiscountedPrice(
  productId: number,
  originalPriceInCents: number,
  productYear: number | null = null,
  productDevice: string | null = null,
  productTemplateId: number | null = null
): Promise<DiscountResult> {
  const discounts = await getProductDiscounts(productId, productYear, productDevice, productTemplateId);
  return calculateDiscountedPrice(originalPriceInCents, discounts);
}

/**
 * Get the discounted price for a bundle
 */
export async function getBundleDiscountedPrice(
  bundleId: number,
  originalPriceInCents: number,
  isAllAccess: boolean = false
): Promise<DiscountResult> {
  const discounts = await getBundleDiscounts(bundleId, isAllAccess);
  return calculateDiscountedPrice(originalPriceInCents, discounts);
}

/**
 * Batch get discounted prices for multiple products in fewer DB queries.
 * Fetches all active discounts once, then matches them to products locally.
 */
export async function batchGetProductDiscountedPrices(
  products: Array<{ id: number; priceInCents: number; year?: number | null; device?: string | null; templateId?: number | null }>
): Promise<Map<number, DiscountResult>> {
  const now = new Date();

  // Fetch ALL active discounts in a single query
  const allDiscounts = await prisma.discount.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { priority: 'desc' },
  }) as DiscountRecord[];

  // Match discounts to each product locally
  const results = new Map<number, DiscountResult>();
  for (const product of products) {
    const applicableDiscounts = allDiscounts.filter((d) => {
      // Check year targeting
      if (d.targetYear !== null && d.targetYear !== product.year) {
        return false;
      }

      // Check device targeting
      if (d.targetDevice !== null && d.targetDevice !== product.device) {
        return false;
      }

      // Check template targeting
      if (d.targetTemplateId !== null && d.targetTemplateId !== product.templateId) {
        return false;
      }

      // Skip bundles-only discounts for products
      if (d.scope === 'all' && d.excludeProducts) return false;

      if (d.scope === 'all') return true;
      if (d.scope === 'product' && d.productId === product.id) return true;
      return false;
    });

    results.set(product.id, calculateDiscountedPrice(product.priceInCents, applicableDiscounts));
  }

  return results;
}

/**
 * Get product IDs that have active discounts.
 * Used for "On Sale" filter in shop.
 */
export async function getDiscountedProductIds(): Promise<Set<number>> {
  const now = new Date();

  // Fetch all active discounts including targeting fields
  const activeDiscounts = await prisma.discount.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: {
      scope: true,
      productId: true,
      excludeProducts: true,
      targetYear: true,
      targetDevice: true,
      targetTemplateId: true,
    },
  });

  const productIds = new Set<number>();

  // Separate discounts by whether they have any targeting
  const noTargetingDiscounts = activeDiscounts.filter(
    (d) => d.targetYear === null && d.targetDevice === null && d.targetTemplateId === null
  );
  const targetedDiscounts = activeDiscounts.filter(
    (d) => d.targetYear !== null || d.targetDevice !== null || d.targetTemplateId !== null
  );

  // Check for 'all' scope with no targeting - means all products are discounted
  // (but not if excludeProducts is true — those are bundles-only)
  const hasAllScopeNoTargeting = noTargetingDiscounts.some((d) => d.scope === 'all' && !d.excludeProducts);
  if (hasAllScopeNoTargeting) {
    const allProducts = await prisma.product.findMany({
      where: { isPublished: true },
      select: { id: true },
    });
    allProducts.forEach((p) => productIds.add(p.id));
    return productIds;
  }

  // Handle discounts without targeting
  for (const discount of noTargetingDiscounts) {
    if (discount.scope === 'product' && discount.productId) {
      productIds.add(discount.productId);
    }
  }

  // Handle 'all' scope discounts with targeting (skip bundles-only)
  const allScopeTargeted = targetedDiscounts.filter((d) => d.scope === 'all' && !d.excludeProducts);
  for (const discount of allScopeTargeted) {
    // Build where clause based on targeting
    const whereClause: {
      isPublished: boolean;
      year?: number;
      device?: string;
      templateId?: number;
    } = { isPublished: true };

    if (discount.targetYear !== null) {
      whereClause.year = discount.targetYear;
    }
    if (discount.targetDevice !== null) {
      whereClause.device = discount.targetDevice;
    }
    if (discount.targetTemplateId !== null) {
      whereClause.templateId = discount.targetTemplateId;
    }

    const matchingProducts = await prisma.product.findMany({
      where: whereClause,
      select: { id: true },
    });
    matchingProducts.forEach((p) => productIds.add(p.id));
  }

  // Handle product-specific discounts with targeting
  for (const discount of targetedDiscounts) {
    if (discount.scope === 'product' && discount.productId) {
      // Verify the product matches the targeting criteria
      const product = await prisma.product.findUnique({
        where: { id: discount.productId },
        select: { id: true, year: true, device: true, templateId: true },
      });
      if (product) {
        const yearMatch = discount.targetYear === null || product.year === discount.targetYear;
        const deviceMatch = discount.targetDevice === null || product.device === discount.targetDevice;
        const templateMatch = discount.targetTemplateId === null || product.templateId === discount.targetTemplateId;
        if (yearMatch && deviceMatch && templateMatch) {
          productIds.add(product.id);
        }
      }
    }
  }

  return productIds;
}

// ============================================
// DISCOUNT CODE FUNCTIONS
// ============================================

export interface DiscountCodeValidation {
  valid: boolean;
  error?: string;
  discountCode?: {
    id: number;
    code: string;
    name: string;
    type: 'percentage' | 'fixed';
    valueInCents: number | null;
    valuePercent: number | null;
    excludeBundles: boolean;
    excludeAllAccessBundle: boolean;
    excludeProducts: boolean;
    targetYear: number | null;
    targetDevice: string | null;
    targetTemplateId: number | null;
  };
}

export interface CartItemForDiscount {
  productId?: number;
  bundleId?: number;
  isAllAccessBundle?: boolean;
  priceInCents: number;
  year?: number | null;
  device?: string | null;
  templateId?: number | null;
}

/**
 * Validate a discount code
 */
export async function validateDiscountCode(
  code: string,
  orderTotalInCents: number,
  customerId?: number
): Promise<DiscountCodeValidation> {
  const now = new Date();

  const discountCode = await prisma.discountCode.findFirst({
    where: { code: code.toUpperCase() },
  });

  if (!discountCode) {
    return { valid: false, error: 'Invalid discount code' };
  }

  if (!discountCode.isActive) {
    return { valid: false, error: 'This discount code is no longer active' };
  }

  // Check date validity
  if (discountCode.startsAt && discountCode.startsAt > now) {
    return { valid: false, error: 'This discount code is not yet active' };
  }

  if (discountCode.endsAt && discountCode.endsAt < now) {
    return { valid: false, error: 'This discount code has expired' };
  }

  // Check max uses
  if (discountCode.maxUses && discountCode.usedCount >= discountCode.maxUses) {
    return { valid: false, error: 'This discount code has reached its usage limit' };
  }

  // Check minimum order value
  if (discountCode.minOrderInCents && orderTotalInCents < discountCode.minOrderInCents) {
    const minOrder = (discountCode.minOrderInCents / 100).toFixed(2);
    return { valid: false, error: `Minimum order of €${minOrder} required for this code` };
  }

  // Check per-customer usage
  if (customerId && discountCode.maxUsesPerCustomer) {
    const customerUsageCount = await prisma.discountCodeUsage.count({
      where: {
        discountCodeId: discountCode.id,
        customerId,
      },
    });

    if (customerUsageCount >= discountCode.maxUsesPerCustomer) {
      return { valid: false, error: 'You have already used this discount code' };
    }
  }

  return {
    valid: true,
    discountCode: {
      id: discountCode.id,
      code: discountCode.code,
      name: discountCode.name,
      type: discountCode.type as 'percentage' | 'fixed',
      valueInCents: discountCode.valueInCents,
      valuePercent: discountCode.valuePercent,
      excludeBundles: discountCode.excludeBundles,
      excludeAllAccessBundle: discountCode.excludeAllAccessBundle,
      excludeProducts: discountCode.excludeProducts,
      targetYear: discountCode.targetYear,
      targetDevice: discountCode.targetDevice,
      targetTemplateId: discountCode.targetTemplateId,
    },
  };
}

/**
 * Apply a discount code to an order total
 */
export function applyDiscountCode(
  orderTotalInCents: number,
  discountCode: {
    type: 'percentage' | 'fixed';
    valueInCents: number | null;
    valuePercent: number | null;
  }
): { discountAmount: number; finalTotal: number } {
  let discountAmount = 0;

  if (discountCode.type === 'percentage' && discountCode.valuePercent) {
    discountAmount = Math.round(orderTotalInCents * (discountCode.valuePercent / 100));
  } else if (discountCode.type === 'fixed' && discountCode.valueInCents) {
    discountAmount = Math.min(discountCode.valueInCents, orderTotalInCents);
  }

  return {
    discountAmount,
    finalTotal: Math.max(0, orderTotalInCents - discountAmount),
  };
}

/**
 * Apply a discount code to cart items, respecting exclusions and targeting
 * Returns the eligible total (after excluding items) and the discount amount
 */
export function applyDiscountCodeWithExclusions(
  cartItems: CartItemForDiscount[],
  discountCode: {
    type: 'percentage' | 'fixed';
    valueInCents: number | null;
    valuePercent: number | null;
    excludeBundles: boolean;
    excludeAllAccessBundle: boolean;
    excludeProducts: boolean;
    targetYear: number | null;
    targetDevice: string | null;
    targetTemplateId: number | null;
  }
): {
  eligibleTotalInCents: number;
  excludedTotalInCents: number;
  discountAmount: number;
  finalTotal: number;
} {
  // Calculate eligible and excluded totals
  let eligibleTotalInCents = 0;
  let excludedTotalInCents = 0;

  for (const item of cartItems) {
    const isBundle = !!item.bundleId;
    const isAllAccessBundle = item.isAllAccessBundle === true;

    // Check if item should be excluded
    let isExcluded = false;
    if (discountCode.excludeProducts && !isBundle) {
      isExcluded = true;
    } else if (discountCode.excludeBundles && isBundle) {
      isExcluded = true;
    } else if (discountCode.excludeAllAccessBundle && isAllAccessBundle) {
      isExcluded = true;
    } else if (discountCode.targetYear !== null && item.year !== discountCode.targetYear) {
      // Exclude items that don't match the target year (bundles don't have year, so they're excluded if targetYear is set)
      isExcluded = true;
    } else if (discountCode.targetDevice !== null && item.device !== discountCode.targetDevice) {
      // Exclude items that don't match the target device
      isExcluded = true;
    } else if (discountCode.targetTemplateId !== null && item.templateId !== discountCode.targetTemplateId) {
      // Exclude items that don't match the target template
      isExcluded = true;
    }

    if (isExcluded) {
      excludedTotalInCents += item.priceInCents;
    } else {
      eligibleTotalInCents += item.priceInCents;
    }
  }

  // Apply discount only to eligible items
  let discountAmount = 0;
  if (discountCode.type === 'percentage' && discountCode.valuePercent) {
    discountAmount = Math.round(eligibleTotalInCents * (discountCode.valuePercent / 100));
  } else if (discountCode.type === 'fixed' && discountCode.valueInCents) {
    discountAmount = Math.min(discountCode.valueInCents, eligibleTotalInCents);
  }

  const totalBeforeDiscount = eligibleTotalInCents + excludedTotalInCents;
  const finalTotal = Math.max(0, totalBeforeDiscount - discountAmount);

  return {
    eligibleTotalInCents,
    excludedTotalInCents,
    discountAmount,
    finalTotal,
  };
}

/**
 * Record discount code usage after successful order
 */
export async function recordDiscountCodeUsage(
  discountCodeId: number,
  orderId: number,
  customerId?: number
): Promise<void> {
  await prisma.$transaction([
    prisma.discountCodeUsage.create({
      data: {
        discountCodeId,
        orderId,
        customerId,
      },
    }),
    prisma.discountCode.update({
      where: { id: discountCodeId },
      data: { usedCount: { increment: 1 } },
    }),
  ]);
}
