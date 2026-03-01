import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

export interface CreateCheckoutSessionParams {
  orderId: number;
  items: {
    name: string;
    priceInCents: number;
    quantity: number;
  }[];
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  locale?: string;
  discountAmountInCents?: number;
  discountLabel?: string;
}

export async function createCheckoutSession({
  orderId,
  items,
  currency,
  customerEmail,
  successUrl,
  cancelUrl,
  locale = 'en',
  discountAmountInCents,
  discountLabel,
}: CreateCheckoutSessionParams) {
  const stripe = getStripeClient();

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: item.name,
      },
      unit_amount: item.priceInCents,
    },
    quantity: item.quantity,
  }));

  // Create a one-time Stripe coupon if there's a discount
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (discountAmountInCents && discountAmountInCents > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: discountAmountInCents,
      currency: currency.toLowerCase(),
      duration: 'once',
      name: discountLabel || 'Discount',
    });
    discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'ideal', 'bancontact'],
    line_items: lineItems,
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
    billing_address_collection: 'required',
    locale: locale === 'nl' ? 'nl' : 'en',
    automatic_tax: { enabled: false },
    ...(discounts ? { discounts } : {}),
    metadata: {
      orderId: String(orderId),
      locale,
    },
  });

  return session;
}

export async function getCheckoutSession(sessionId: string) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId);
}

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
