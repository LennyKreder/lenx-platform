import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ id: string; listingId: string }>;
}

// PUT /api/admin/products/[id]/listings/[listingId] - Update a listing
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id, listingId } = await params;
  const productId = parseInt(id, 10);
  const listingIdNum = parseInt(listingId, 10);

  if (isNaN(productId) || isNaN(listingIdNum)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    // Verify product belongs to site
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify listing belongs to product
    const existing = await prisma.productListing.findFirst({
      where: { id: listingIdNum, productId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const body = await request.json();
    const { priceInCents, compareAtPriceInCents, currency, isPublished, isFeatured, externalId, deliveryCode } = body as {
      priceInCents?: number;
      compareAtPriceInCents?: number | null;
      currency?: string;
      isPublished?: boolean;
      isFeatured?: boolean;
      externalId?: string | null;
      deliveryCode?: string | null;
    };

    // Handle publish state change
    let publishedAt = existing.publishedAt;
    if (isPublished !== undefined && isPublished !== existing.isPublished) {
      publishedAt = isPublished ? new Date() : null;
    }

    const listing = await prisma.productListing.update({
      where: { id: listingIdNum },
      data: {
        ...(priceInCents !== undefined && { priceInCents }),
        ...(compareAtPriceInCents !== undefined && { compareAtPriceInCents: compareAtPriceInCents || null }),
        ...(currency !== undefined && { currency }),
        ...(isPublished !== undefined && { isPublished, publishedAt }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(externalId !== undefined && { externalId: externalId || null }),
        ...(deliveryCode !== undefined && { deliveryCode: deliveryCode || null }),
      },
      include: {
        channel: { select: { id: true, type: true, code: true, name: true, country: true } },
      },
    });

    return NextResponse.json(listing);
  } catch (error) {
    console.error('Error updating listing:', error);
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 });
  }
}

// DELETE /api/admin/products/[id]/listings/[listingId] - Delete a listing
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id, listingId } = await params;
  const productId = parseInt(id, 10);
  const listingIdNum = parseInt(listingId, 10);

  if (isNaN(productId) || isNaN(listingIdNum)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    // Verify product belongs to site
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify listing belongs to product and is not a webshop listing
    const existing = await prisma.productListing.findFirst({
      where: { id: listingIdNum, productId },
      include: { channel: { select: { type: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (existing.channel.type === 'webshop') {
      return NextResponse.json(
        { error: 'Cannot delete webshop listing. Use the product form to manage webshop pricing.' },
        { status: 400 }
      );
    }

    await prisma.productListing.delete({ where: { id: listingIdNum } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting listing:', error);
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 });
  }
}
