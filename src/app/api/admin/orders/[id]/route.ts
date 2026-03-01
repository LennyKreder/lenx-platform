import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { COOKIE_NAMES } from '@/lib/constants';
import { getAdminSiteId } from '@/lib/admin-site';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get(COOKIE_NAMES.ADMIN_AUTH)?.value === 'authenticated';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, siteId },
    include: {
      customer: true,
      items: {
        include: {
          product: {
            include: {
              slugs: { where: { isPrimary: true } },
              template: {
                include: {
                  translations: true,
                },
              },
            },
          },
          bundle: {
            include: {
              slugs: { where: { isPrimary: true } },
              translations: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get(COOKIE_NAMES.ADMIN_AUTH)?.value === 'authenticated';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status, notes } = body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, siteId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If changing status to completed, grant access
    if (status === 'completed' && order.status !== 'completed' && order.customerId) {
      for (const item of order.items) {
        if (item.productId) {
          const existingAccess = await prisma.customerAccess.findFirst({
            where: {
              customerId: order.customerId,
              productId: item.productId,
            },
          });

          if (!existingAccess) {
            await prisma.customerAccess.create({
              data: {
                customerId: order.customerId,
                productId: item.productId,
                grantedBy: 'purchase',
                orderId: order.id,
              },
            });
          }
        }

        if (item.bundleId) {
          const existingAccess = await prisma.customerAccess.findFirst({
            where: {
              customerId: order.customerId,
              bundleId: item.bundleId,
            },
          });

          if (!existingAccess) {
            await prisma.customerAccess.create({
              data: {
                customerId: order.customerId,
                bundleId: item.bundleId,
                grantedBy: 'purchase',
                orderId: order.id,
              },
            });
          }
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                slugs: { where: { isPrimary: true } },
                template: {
                  include: {
                    translations: true,
                  },
                },
              },
            },
            bundle: {
              include: {
                slugs: { where: { isPrimary: true } },
                translations: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get(COOKIE_NAMES.ADMIN_AUTH)?.value === 'authenticated';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  try {
    // Verify the order belongs to this store
    const order = await prisma.order.findFirst({
      where: { id: orderId, siteId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Delete order items first
    await prisma.orderItem.deleteMany({
      where: { orderId },
    });

    // Delete the order
    await prisma.order.delete({
      where: { id: orderId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
