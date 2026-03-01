import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { scanFilesForProduct, linkFilesToProduct } from '@/lib/product-files';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/products/[id]/files - Get product files and scan for available files
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

  try {
    // Verify product belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get existing linked files
    const linkedFiles = await prisma.productFile.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    // Scan for available files on disk
    const scannedFiles = await scanFilesForProduct(productId);

    return NextResponse.json({
      linkedFiles,
      scannedFiles,
      summary: {
        linked: linkedFiles.length,
        available: scannedFiles.filter((f) => f.exists).length,
        total: scannedFiles.length,
      },
    });
  } catch (error) {
    console.error('Error getting product files:', error);
    return NextResponse.json(
      { error: 'Failed to get product files' },
      { status: 500 }
    );
  }
}

// POST /api/admin/products/[id]/files - Auto-link files from disk
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
    // Verify product belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Scan for files
    const scannedFiles = await scanFilesForProduct(productId);

    // Link all existing files
    const linkedCount = await linkFilesToProduct(productId, scannedFiles);

    // Get the updated file list
    const linkedFiles = await prisma.productFile.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      linkedCount,
      linkedFiles,
    });
  } catch (error) {
    console.error('Error linking product files:', error);
    return NextResponse.json(
      { error: 'Failed to link product files' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id]/files - Remove all file links
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    // Verify product belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.productFile.deleteMany({ where: { productId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing product files:', error);
    return NextResponse.json(
      { error: 'Failed to remove product files' },
      { status: 500 }
    );
  }
}
