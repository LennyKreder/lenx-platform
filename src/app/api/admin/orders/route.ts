import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/lib/prisma';
import { COOKIE_NAMES } from '@/lib/constants';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { createOrderWithNumber } from '@/lib/order-service';
import { getAdminSiteId, getAdminSiteCode, ALL_SITES_CODE } from '@/lib/admin-site';
import { getAdminUser } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get(COOKIE_NAMES.ADMIN_AUTH)?.value === 'authenticated';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteCode = await getAdminSiteCode();
  const isAllSites = siteCode === ALL_SITES_CODE;

  // Validate super_admin for cross-site access
  if (isAllSites) {
    const user = await getAdminUser();
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  const siteId = await getAdminSiteId();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const source = searchParams.get('source') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

  const where: Prisma.OrderWhereInput = isAllSites ? {} : { siteId };

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customerEmail: { contains: search, mode: 'insensitive' } },
      { externalId: { contains: search } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (source) {
    where.source = source;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, email: true } },
        site: { select: { code: true, name: true } },
        _count: { select: { items: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get(COOKIE_NAMES.ADMIN_AUTH)?.value === 'authenticated';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  try {
    const body = await request.json();
    const {
      customerEmail,
      customerId,
      source = 'admin',
      externalId,
      items,
      subtotalInCents,
      discountInCents = 0,
      totalInCents,
      currency = 'EUR',
      status = 'completed',
      notes,
      grantAccess = true,
      sendConfirmationEmail = false,
      emailLocale = 'en',
    } = body;

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { siteId_email: { siteId, email: customerEmail } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { email: customerEmail, siteId },
      });
    }

    // Create order with items and generate order number
    const order = await createOrderWithNumber({
      siteId,
      customerId: customer.id,
      customerEmail,
      source,
      externalId: externalId || null,
      subtotalInCents: subtotalInCents || totalInCents,
      discountInCents,
      totalInCents,
      currency,
      status,
      notes: notes || null,
      items: items.map((item: { productId?: number; bundleId?: number; quantity?: number; priceInCents: number }) => ({
        productId: item.productId || null,
        bundleId: item.bundleId || null,
        quantity: item.quantity || 1,
        priceInCents: item.priceInCents,
      })),
    });

    // Grant access if requested
    if (grantAccess && status === 'completed') {
      for (const item of order.items) {
        if (item.productId) {
          // Check if access already exists
          const existingAccess = await prisma.customerAccess.findFirst({
            where: {
              customerId: customer.id,
              productId: item.productId,
            },
          });

          if (!existingAccess) {
            await prisma.customerAccess.create({
              data: {
                customerId: customer.id,
                productId: item.productId,
                grantedBy: 'purchase',
                orderId: order.id,
              },
            });
          }
        }

        if (item.bundleId) {
          // Check if access already exists
          const existingAccess = await prisma.customerAccess.findFirst({
            where: {
              customerId: customer.id,
              bundleId: item.bundleId,
            },
          });

          if (!existingAccess) {
            await prisma.customerAccess.create({
              data: {
                customerId: customer.id,
                bundleId: item.bundleId,
                grantedBy: 'purchase',
                orderId: order.id,
              },
            });
          }
        }
      }
    }

    // Send confirmation email if requested
    if (sendConfirmationEmail && status === 'completed') {
      try {
        // Fetch product and bundle names for the email
        const emailItems: { name: string }[] = [];

        for (const item of order.items) {
          if (item.productId) {
            const product = await prisma.product.findUnique({
              where: { id: item.productId },
              include: {
                translations: { where: { languageCode: 'en' } },
                template: {
                  include: { translations: { where: { languageCode: 'en' } } },
                },
              },
            });
            if (product) {
              const name = product.translations[0]?.name ||
                product.template?.translations[0]?.name ||
                'Product';
              emailItems.push({ name });
            }
          }

          if (item.bundleId) {
            const bundle = await prisma.bundle.findUnique({
              where: { id: item.bundleId },
              include: { translations: { where: { languageCode: 'en' } } },
            });
            if (bundle) {
              const name = bundle.translations[0]?.name || 'Bundle';
              emailItems.push({ name });
            }
          }
        }

        await sendOrderConfirmationEmail({
          to: customerEmail,
          orderNumber: order.orderNumber || `#${order.id}`,
          items: emailItems,
          totalInCents: order.totalInCents,
          currency: order.currency,
          locale: emailLocale,
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
