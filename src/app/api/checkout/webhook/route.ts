import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { constructWebhookEvent, getCheckoutSession } from '@/lib/stripe';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { recordDiscountCodeUsage } from '@/lib/discounts';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event;
    try {
      event = await constructWebhookEvent(body, signature);
    } catch (err) {
      logger.error('Webhook signature verification failed', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;

        if (!orderId) {
          logger.error('No orderId in session metadata', undefined, { sessionId: session.id });
          break;
        }

        // Get full session details
        const fullSession = await getCheckoutSession(session.id);

        // Extract billing country from session
        const billingCountry = session.customer_details?.address?.country || null;

        // Update order status and billing country
        const order = await prisma.order.update({
          where: { id: parseInt(orderId, 10) },
          data: {
            status: 'completed',
            externalId: session.id,
            billingCountry,
          },
          include: {
            items: {
              include: {
                product: true,
                bundle: true,
              },
            },
          },
        });

        // Update customer billing country if available
        if (billingCountry && order.customerId) {
          await prisma.customer.update({
            where: { id: order.customerId },
            data: { billingCountry },
          });
        }

        // Grant customer access to purchased products/bundles
        for (const item of order.items) {
          if (item.productId) {
            await prisma.customerAccess.upsert({
              where: {
                customerId_productId: {
                  customerId: order.customerId!,
                  productId: item.productId,
                },
              },
              update: {},
              create: {
                customerId: order.customerId!,
                productId: item.productId,
                orderId: order.id,
                grantedBy: 'purchase',
              },
            });
          }

          if (item.bundleId) {
            await prisma.customerAccess.upsert({
              where: {
                customerId_bundleId: {
                  customerId: order.customerId!,
                  bundleId: item.bundleId,
                },
              },
              update: {},
              create: {
                customerId: order.customerId!,
                bundleId: item.bundleId,
                orderId: order.id,
                grantedBy: 'purchase',
              },
            });
          }
        }

        // Record discount code usage if applicable
        if (order.discountCodeId) {
          try {
            await recordDiscountCodeUsage(
              order.discountCodeId,
              order.id,
              order.customerId || undefined
            );
          } catch (discountError) {
            logger.error('Failed to record discount code usage', discountError, { orderId });
          }
        }

        // Send confirmation email using locale from Stripe session metadata
        const orderLocale = session.metadata?.locale || 'en';
        try {
          await sendOrderConfirmationEmail({
            to: order.customerEmail,
            orderNumber: order.orderNumber || String(order.id),
            items: order.items.map((item) => ({
              name: item.product?.downloadCode || item.bundle?.downloadCode || 'Product',
              downloadCode: item.product?.downloadCode || item.bundle?.downloadCode,
            })),
            totalInCents: order.totalInCents,
            currency: order.currency,
            locale: orderLocale,
          });
        } catch (emailError) {
          logger.error('Failed to send order confirmation email', emailError, { orderId });
        }

        logger.info('Order completed successfully', { orderId });
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          // Mark order as cancelled
          await prisma.order.update({
            where: { id: parseInt(orderId, 10) },
            data: { status: 'cancelled' },
          });
          logger.info('Order cancelled due to expired session', { orderId });
        }
        break;
      }

      default:
        logger.warn('Unhandled webhook event type', { eventType: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler failed', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
