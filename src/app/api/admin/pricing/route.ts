import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';

// GET /api/admin/pricing - Get products and bundles for price preview
export async function GET(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'products'; // 'products', 'bundles'
  const scope = searchParams.get('scope') || 'all'; // 'all', 'individual'
  const ids = searchParams.get('ids'); // comma-separated

  const where: Record<string, unknown> = {};

  if (scope === 'individual' && ids) {
    where.id = { in: ids.split(',').map((id) => parseInt(id, 10)) };
  }

  if (type === 'bundles') {
    const bundles = await prisma.bundle.findMany({
      where,
      select: {
        id: true,
        fixedPriceInCents: true,
        discountPercent: true,
        currency: true,
        contentLanguage: true,
        isAllAccess: true,
        translations: {
          select: {
            languageCode: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      bundles: bundles.map((b) => ({
        id: b.id,
        name:
          b.translations.find((t) => t.languageCode === 'en')?.name ||
          b.translations[0]?.name ||
          `Bundle #${b.id}`,
        fixedPriceInCents: b.fixedPriceInCents,
        discountPercent: b.discountPercent,
        currency: b.currency,
        contentLanguage: b.contentLanguage,
        isAllAccess: b.isAllAccess,
      })),
    });
  }

  // Default: products
  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      priceInCents: true,
      currency: true,
      year: true,
      theme: true,
      contentLanguage: true,
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
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name:
        p.translations.find((t) => t.languageCode === 'en')?.name ||
        p.template?.translations.find((t) => t.languageCode === 'en')?.name ||
        `Product #${p.id}`,
      priceInCents: p.priceInCents,
      currency: p.currency,
      year: p.year,
      theme: p.theme,
      contentLanguage: p.contentLanguage,
    })),
  });
}

// POST /api/admin/pricing - Apply price changes to products or bundles
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, scope, ids, operation, value } = body as {
      type?: 'products' | 'bundles';
      scope: 'all' | 'individual';
      ids?: number[]; // productIds or bundleIds
      operation: 'set' | 'increase_percent' | 'decrease_percent' | 'increase_amount' | 'decrease_amount' | 'set_discount';
      value: number; // cents for amount operations, percentage for percent/discount operations
    };

    if (!operation || value === undefined || value === null) {
      return NextResponse.json(
        { error: 'Operation and value are required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {};
    if (scope === 'individual' && ids && ids.length > 0) {
      where.id = { in: ids };
    }

    // Handle bundles
    if (type === 'bundles') {
      const bundles = await prisma.bundle.findMany({
        where,
        select: { id: true, fixedPriceInCents: true, discountPercent: true },
      });

      if (bundles.length === 0) {
        return NextResponse.json(
          { error: 'No bundles found to update' },
          { status: 400 }
        );
      }

      let updatedCount = 0;

      for (const bundle of bundles) {
        const updateData: { fixedPriceInCents?: number | null; discountPercent?: number | null } = {};

        if (operation === 'set_discount') {
          // Set discount percentage (clear fixed price)
          updateData.discountPercent = Math.max(0, Math.min(100, value));
          updateData.fixedPriceInCents = null;
        } else {
          // Price operations - work with fixedPriceInCents
          const currentPrice = bundle.fixedPriceInCents || 0;
          let newPrice: number;

          switch (operation) {
            case 'set':
              newPrice = value;
              break;
            case 'increase_percent':
              newPrice = Math.round(currentPrice * (1 + value / 100));
              break;
            case 'decrease_percent':
              newPrice = Math.round(currentPrice * (1 - value / 100));
              break;
            case 'increase_amount':
              newPrice = currentPrice + value;
              break;
            case 'decrease_amount':
              newPrice = currentPrice - value;
              break;
            default:
              continue;
          }

          updateData.fixedPriceInCents = Math.max(0, newPrice);
          updateData.discountPercent = null; // Clear discount when setting fixed price
        }

        await prisma.bundle.update({
          where: { id: bundle.id },
          data: updateData,
        });
        updatedCount++;
      }

      return NextResponse.json({
        success: true,
        updatedCount,
        message: `Updated ${updatedCount} bundle(s)`,
      });
    }

    // Default: products (backward compatible)
    const products = await prisma.product.findMany({
      where,
      select: { id: true, priceInCents: true },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found to update' },
        { status: 400 }
      );
    }

    let updatedCount = 0;

    for (const product of products) {
      let newPrice: number;

      switch (operation) {
        case 'set':
          newPrice = value;
          break;
        case 'increase_percent':
          newPrice = Math.round(product.priceInCents * (1 + value / 100));
          break;
        case 'decrease_percent':
          newPrice = Math.round(product.priceInCents * (1 - value / 100));
          break;
        case 'increase_amount':
          newPrice = product.priceInCents + value;
          break;
        case 'decrease_amount':
          newPrice = product.priceInCents - value;
          break;
        default:
          continue;
      }

      newPrice = Math.max(0, newPrice);

      await prisma.product.update({
        where: { id: product.id },
        data: { priceInCents: newPrice },
      });
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} product(s)`,
    });
  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json(
      { error: 'Failed to update prices' },
      { status: 500 }
    );
  }
}
