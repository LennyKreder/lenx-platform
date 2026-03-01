import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders } from '@/lib/site-context';
import { createCheckoutSession } from '@/lib/stripe';
import { getCustomerSession } from '@/lib/customer-session';
import {
  validateDiscountCode,
  applyDiscountCode,
  applyDiscountCodeWithExclusions,
  CartItemForDiscount,
} from '@/lib/discounts';
import { createOrderWithNumber } from '@/lib/order-service';

interface CartItem {
  productId: number;
  bundleId?: number;
  isAllAccessBundle?: boolean;
  name: string;
  priceInCents: number;
  quantity: number;
}

export async function POST(request: Request) {
  try {
    // Require authentication
    const customerSession = await getCustomerSession();
    if (!customerSession) {
      return NextResponse.json(
        { error: 'Authentication required', requiresLogin: true },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { locale = 'en', items, currency = 'EUR', discountCode: discountCodeInput } = body as {
      locale: string;
      items: CartItem[];
      currency: string;
      discountCode?: string;
    };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      );
    }

    // Calculate subtotal
    const subtotalInCents = items.reduce(
      (sum, item) => sum + item.priceInCents * item.quantity,
      0
    );

    // Validate and apply discount code if provided
    let discountInCents = 0;
    let discountCodeId: number | null = null;
    let discountCodeApplied: string | null = null;

    if (discountCodeInput) {
      const validation = await validateDiscountCode(
        discountCodeInput,
        subtotalInCents,
        customerSession.customerId
      );

      if (validation.valid && validation.discountCode) {
        const dc = validation.discountCode;
        const hasExclusions = dc.excludeBundles || dc.excludeAllAccessBundle || dc.excludeProducts;

        if (hasExclusions) {
          // Use exclusion-aware calculation
          const cartItemsForDiscount: CartItemForDiscount[] = items.map((item) => ({
            productId: item.productId,
            bundleId: item.bundleId,
            isAllAccessBundle: item.isAllAccessBundle,
            priceInCents: item.priceInCents * item.quantity,
          }));

          const result = applyDiscountCodeWithExclusions(cartItemsForDiscount, dc);
          discountInCents = result.discountAmount;
        } else {
          const result = applyDiscountCode(subtotalInCents, dc);
          discountInCents = result.discountAmount;
        }

        discountCodeId = dc.id;
        discountCodeApplied = dc.code;
      }
    }

    const totalInCents = subtotalInCents - discountInCents;
    const customerId = customerSession.customerId;
    const email = customerSession.email;

    // Create pending order with customer-facing order number
    const site = await getSiteFromHeaders();
    const order = await createOrderWithNumber({
      siteId: site.id,
      customerId,
      customerEmail: email,
      source: 'shop',
      subtotalInCents,
      discountInCents,
      totalInCents,
      currency,
      discountCodeId,
      discountCodeApplied,
      status: 'pending',
      items: items.map((item) => ({
        productId: item.productId,
        bundleId: item.bundleId,
        quantity: item.quantity,
        priceInCents: item.priceInCents,
      })),
    });

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    const successUrl = `${baseUrl}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/${locale}/checkout`;

    // Create Stripe checkout session
    const stripeSession = await createCheckoutSession({
      orderId: order.id,
      items: items.map((item) => ({
        name: item.name,
        priceInCents: item.priceInCents,
        quantity: item.quantity,
      })),
      currency,
      customerEmail: email,
      successUrl,
      cancelUrl,
      locale,
      discountAmountInCents: discountInCents > 0 ? discountInCents : undefined,
      discountLabel: discountCodeApplied ? `Discount: ${discountCodeApplied}` : undefined,
    });

    // Update order with Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: { externalId: stripeSession.id },
    });

    return NextResponse.json({
      success: true,
      url: stripeSession.url,
      sessionId: stripeSession.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
