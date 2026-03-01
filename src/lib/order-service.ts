/**
 * Order Service
 *
 * Handles order creation with safe order number generation.
 * Uses a two-phase approach:
 * 1. Create order with temporary orderNumber
 * 2. Update with final orderNumber based on assigned ID
 *
 * This ensures sequential, readable order numbers while handling concurrency.
 */

import { prisma } from './prisma';
import { generateOrderNumber } from './order-number';

const MAX_RETRIES = 3;

interface CreateOrderData {
  siteId: string;
  customerId: number;
  customerEmail: string;
  source: string;
  externalId?: string | null;
  subtotalInCents: number;
  discountInCents?: number;
  totalInCents: number;
  currency?: string;
  status?: string;
  notes?: string | null;
  billingCountry?: string | null;
  discountCodeId?: number | null;
  discountCodeApplied?: string | null;
  items: {
    productId?: number | null;
    bundleId?: number | null;
    quantity?: number;
    priceInCents: number;
  }[];
}

/**
 * Create an order with a unique, customer-facing order number.
 *
 * Strategy:
 * - Use transaction to create order and immediately update with ID-based order number
 * - Retry with new suffix on the rare chance of collision
 */
export async function createOrderWithNumber(data: CreateOrderData) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Use a transaction to ensure atomicity
      const order = await prisma.$transaction(async (tx) => {
        // Step 1: Create order with a temporary placeholder
        // We use a UUID-ish temp value that will be immediately replaced
        const tempOrderNumber = `T-${Date.now().toString(36)}`;

        const createdOrder = await tx.order.create({
          data: {
            orderNumber: tempOrderNumber,
            siteId: data.siteId,
            customerId: data.customerId,
            customerEmail: data.customerEmail,
            source: data.source,
            externalId: data.externalId || null,
            subtotalInCents: data.subtotalInCents,
            discountInCents: data.discountInCents || 0,
            totalInCents: data.totalInCents,
            currency: data.currency || 'EUR',
            status: data.status || 'completed',
            notes: data.notes || null,
            billingCountry: data.billingCountry || null,
            discountCodeId: data.discountCodeId || null,
            discountCodeApplied: data.discountCodeApplied || null,
            items: {
              create: data.items.map((item) => ({
                productId: item.productId || null,
                bundleId: item.bundleId || null,
                quantity: item.quantity || 1,
                priceInCents: item.priceInCents,
              })),
            },
          },
          include: {
            items: true,
          },
        });

        // Step 2: Generate the real order number based on the assigned ID
        const orderNumber = generateOrderNumber(createdOrder.id);

        // Step 3: Update with the final order number
        const updatedOrder = await tx.order.update({
          where: { id: createdOrder.id },
          data: { orderNumber },
          include: {
            items: true,
            customer: true,
          },
        });

        return updatedOrder;
      });

      return order;
    } catch (error) {
      lastError = error as Error;

      // Check if it's a unique constraint violation on orderNumber
      const isUniqueViolation =
        error instanceof Error &&
        error.message.includes('Unique constraint') &&
        error.message.includes('orderNumber');

      if (isUniqueViolation && attempt < MAX_RETRIES - 1) {
        // Retry with a new suffix
        console.warn(`Order number collision on attempt ${attempt + 1}, retrying...`);
        continue;
      }

      // Re-throw other errors or if max retries exceeded
      throw error;
    }
  }

  throw lastError || new Error('Failed to create order after max retries');
}

/**
 * Backfill existing orders that don't have an order number.
 * Run this once after migration if you have existing orders.
 */
export async function backfillOrderNumbers() {
  const ordersWithoutNumber = await prisma.order.findMany({
    where: {
      OR: [
        { orderNumber: null },
        { orderNumber: '' },
        { orderNumber: { startsWith: 'TEMP-' } },
        { orderNumber: { startsWith: 'T-' } },
      ],
    },
    select: { id: true },
  });

  console.log(`Backfilling ${ordersWithoutNumber.length} orders...`);

  for (const order of ordersWithoutNumber) {
    const orderNumber = generateOrderNumber(order.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { orderNumber },
    });
  }

  console.log('Backfill complete.');
}
