import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/customers/[id] - Get a single customer with their access and orders
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const customerId = parseInt(id, 10);

  if (isNaN(customerId)) {
    return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, siteId },
    include: {
      access: {
        include: {
          product: {
            select: {
              id: true,
              year: true,
              theme: true,
              contentLanguage: true,
              downloadCode: true,
              slugs: { where: { isPrimary: true } },
              template: {
                select: {
                  translations: true,
                },
              },
            },
          },
          bundle: {
            select: {
              id: true,
              isAllAccess: true,
              downloadCode: true,
              slugs: { where: { isPrimary: true } },
              translations: true,
            },
          },
        },
        orderBy: { grantedAt: 'desc' },
      },
      orders: {
        include: {
          items: {
            include: {
              product: {
                select: {
                  slugs: { where: { isPrimary: true } },
                  template: {
                    select: {
                      translations: true,
                    },
                  },
                },
              },
              bundle: {
                select: {
                  slugs: { where: { isPrimary: true } },
                  translations: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: { access: true, orders: true },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Also fetch all products and bundles for the access manager
  const [products, bundles] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        year: true,
        theme: true,
        contentLanguage: true,
        downloadCode: true,
        slugs: { where: { isPrimary: true } },
        template: {
          select: {
            translations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bundle.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        isAllAccess: true,
        downloadCode: true,
        slugs: { where: { isPrimary: true } },
        translations: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({ customer, products, bundles });
}

// DELETE /api/admin/customers/[id] - Delete a customer
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const customerId = parseInt(id, 10);

  if (isNaN(customerId)) {
    return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
  }

  try {
    // Verify customer belongs to this store
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, siteId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if customer has orders
    const ordersCount = await prisma.order.count({
      where: { customerId },
    });

    if (ordersCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete customer with ${ordersCount} order(s)` },
        { status: 400 }
      );
    }

    // Delete access and sessions first
    await prisma.customerAccess.deleteMany({ where: { customerId } });
    await prisma.customerSession.deleteMany({ where: { customerId } });

    // Delete the customer
    await prisma.customer.delete({ where: { id: customerId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
