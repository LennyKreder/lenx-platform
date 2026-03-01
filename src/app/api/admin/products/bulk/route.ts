import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

// POST /api/admin/products/bulk
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  try {
    const body = await request.json();
    const { action, productIds } = body as {
      action: 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete';
      productIds: number[];
    };

    if (!action || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'action and productIds are required' },
        { status: 400 }
      );
    }

    let result: { success: boolean; count: number; error?: string };

    switch (action) {
      case 'publish':
        const publishCount = await prisma.product.updateMany({
          where: { id: { in: productIds }, siteId },
          data: { isPublished: true, publishedAt: new Date() },
        });
        result = { success: true, count: publishCount.count };
        break;

      case 'unpublish':
        const unpublishCount = await prisma.product.updateMany({
          where: { id: { in: productIds }, siteId },
          data: { isPublished: false },
        });
        result = { success: true, count: unpublishCount.count };
        break;

      case 'feature':
        const featureCount = await prisma.product.updateMany({
          where: { id: { in: productIds }, siteId },
          data: { isFeatured: true },
        });
        result = { success: true, count: featureCount.count };
        break;

      case 'unfeature':
        const unfeatureCount = await prisma.product.updateMany({
          where: { id: { in: productIds }, siteId },
          data: { isFeatured: false },
        });
        result = { success: true, count: unfeatureCount.count };
        break;

      case 'delete':
        // First filter to only products belonging to this store
        const storeProducts = await prisma.product.findMany({
          where: { id: { in: productIds }, siteId },
          select: { id: true },
        });
        const storeProductIds = storeProducts.map((p) => p.id);

        // Check if any products have orders
        const productsWithOrders = await prisma.orderItem.findMany({
          where: { productId: { in: storeProductIds } },
          select: { productId: true },
          distinct: ['productId'],
        });

        const productsWithOrderIds = new Set(productsWithOrders.map((p) => p.productId));
        const deletableIds = storeProductIds.filter((id) => !productsWithOrderIds.has(id));
        const nonDeletableIds = storeProductIds.filter((id) => productsWithOrderIds.has(id));

        if (deletableIds.length === 0) {
          return NextResponse.json({
            success: false,
            count: 0,
            error: `All ${nonDeletableIds.length} selected products have orders and cannot be deleted`,
            skipped: nonDeletableIds.length,
          });
        }

        // Delete in correct order: files -> tags -> bundle items -> slugs -> translations -> product
        await prisma.$transaction(async (tx) => {
          // Delete product files
          await tx.productFile.deleteMany({
            where: { productId: { in: deletableIds } },
          });

          // Delete product tags
          await tx.productTag.deleteMany({
            where: { productId: { in: deletableIds } },
          });

          // Delete bundle items
          await tx.bundleItem.deleteMany({
            where: { productId: { in: deletableIds } },
          });

          // Delete slug routes
          await tx.slugRoute.deleteMany({
            where: { productId: { in: deletableIds } },
          });

          // Delete translations
          await tx.productTranslation.deleteMany({
            where: { productId: { in: deletableIds } },
          });

          // Delete products
          await tx.product.deleteMany({
            where: { id: { in: deletableIds } },
          });
        });

        result = {
          success: true,
          count: deletableIds.length,
          ...(nonDeletableIds.length > 0 && {
            error: `${nonDeletableIds.length} products with orders were skipped`,
          }),
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}
