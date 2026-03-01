import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/customers/[id]/access - Get customer's product access
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

  // Verify customer belongs to this store
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, siteId },
  });

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const access = await prisma.customerAccess.findMany({
    where: { customerId },
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
          downloadCode: true,
          isAllAccess: true,
          slugs: { where: { isPrimary: true } },
          translations: true,
        },
      },
      order: {
        select: { id: true, source: true, createdAt: true },
      },
    },
    orderBy: { grantedAt: 'desc' },
  });

  return NextResponse.json(access);
}

// POST /api/admin/customers/[id]/access - Grant product/bundle access
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json();
    const { productId, bundleId, orderId, grantedBy = 'admin' } = body;

    if (!productId && !bundleId) {
      return NextResponse.json(
        { error: 'Either productId or bundleId is required' },
        { status: 400 }
      );
    }

    // Check if customer exists and belongs to this store
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, siteId },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if access already exists
    const existingAccess = await prisma.customerAccess.findFirst({
      where: {
        customerId,
        ...(productId ? { productId } : { bundleId }),
      },
    });

    if (existingAccess) {
      return NextResponse.json(
        { error: 'Customer already has access to this item' },
        { status: 400 }
      );
    }

    const access = await prisma.customerAccess.create({
      data: {
        customerId,
        productId: productId || null,
        bundleId: bundleId || null,
        grantedBy,
        ...(orderId ? { orderId } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
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
            slugs: { where: { isPrimary: true } },
            translations: true,
          },
        },
      },
    });

    return NextResponse.json(access, { status: 201 });
  } catch (error) {
    console.error('Error granting access:', error);
    return NextResponse.json(
      { error: 'Failed to grant access' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/customers/[id]/access - Revoke access
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

  // Verify customer belongs to this store
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, siteId },
  });

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const accessId = searchParams.get('accessId');

  if (!accessId) {
    return NextResponse.json(
      { error: 'accessId query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const access = await prisma.customerAccess.findFirst({
      where: {
        id: parseInt(accessId, 10),
        customerId,
      },
    });

    if (!access) {
      return NextResponse.json({ error: 'Access not found' }, { status: 404 });
    }

    await prisma.customerAccess.delete({
      where: { id: access.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking access:', error);
    return NextResponse.json(
      { error: 'Failed to revoke access' },
      { status: 500 }
    );
  }
}
