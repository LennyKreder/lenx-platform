import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';

// GET /api/admin/featured - Get all products and bundles with featured status
export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [products, bundles] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        year: true,
        theme: true,
        contentLanguage: true,
        isPublished: true,
        isFeatured: true,
        translations: {
          select: {
            languageCode: true,
            name: true,
          },
        },
        template: {
          select: {
            translations: {
              select: {
                languageCode: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.bundle.findMany({
      where: { isPublished: true },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        isPublished: true,
        isFeatured: true,
        isAllAccess: true,
        translations: {
          select: {
            languageCode: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ products, bundles });
}

// PATCH /api/admin/featured - Toggle featured status for a product or bundle
export async function PATCH(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, id, isFeatured } = body as {
      type: 'product' | 'bundle';
      id: number;
      isFeatured: boolean;
    };

    if (!type || !id || typeof isFeatured !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (type === 'product') {
      await prisma.product.update({
        where: { id },
        data: { isFeatured },
      });
    } else if (type === 'bundle') {
      await prisma.bundle.update({
        where: { id },
        data: { isFeatured },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating featured status:', error);
    return NextResponse.json(
      { error: 'Failed to update featured status' },
      { status: 500 }
    );
  }
}
