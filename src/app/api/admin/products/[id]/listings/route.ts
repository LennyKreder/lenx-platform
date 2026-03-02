import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/products/[id]/listings - List all listings for a product
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  // Verify product belongs to site
  const product = await prisma.product.findFirst({
    where: { id: productId, siteId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const listings = await prisma.productListing.findMany({
    where: { productId },
    include: {
      channel: { select: { id: true, type: true, code: true, name: true, country: true } },
    },
    orderBy: [{ channel: { type: 'asc' } }, { createdAt: 'asc' }],
  });

  // Also return available channels that don't have a listing yet
  const existingChannelIds = listings.map((l) => l.channelId);
  const availableChannels = await prisma.salesChannel.findMany({
    where: {
      siteId,
      isActive: true,
      id: { notIn: existingChannelIds },
    },
    select: { id: true, type: true, code: true, name: true, country: true },
  });

  return NextResponse.json({ listings, availableChannels });
}

// POST /api/admin/products/[id]/listings - Create a listing on a channel
export async function POST(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { channelId, priceInCents, compareAtPriceInCents, currency, isPublished, externalId, deliveryCode } = body as {
      channelId: number;
      priceInCents?: number;
      compareAtPriceInCents?: number | null;
      currency?: string;
      isPublished?: boolean;
      externalId?: string | null;
      deliveryCode?: string | null;
    };

    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    }

    // Verify product belongs to site
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify channel belongs to same site
    const channel = await prisma.salesChannel.findFirst({
      where: { id: channelId, siteId },
    });
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if listing already exists
    const existing = await prisma.productListing.findFirst({
      where: { productId, channelId, variantId: null },
    });
    if (existing) {
      return NextResponse.json({ error: 'Listing already exists for this channel' }, { status: 400 });
    }

    const listing = await prisma.productListing.create({
      data: {
        productId,
        channelId,
        priceInCents: priceInCents ?? product.priceInCents,
        compareAtPriceInCents: compareAtPriceInCents ?? product.compareAtPriceInCents,
        currency: currency || product.currency,
        isPublished: isPublished ?? false,
        publishedAt: isPublished ? new Date() : null,
        externalId: externalId || null,
        deliveryCode: deliveryCode || null,
      },
      include: {
        channel: { select: { id: true, type: true, code: true, name: true, country: true } },
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error('Error creating listing:', error);
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 });
  }
}
