import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/product-families/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const familyId = parseInt(id, 10);

  if (isNaN(familyId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const family = await prisma.productFamily.findFirst({
    where: { id: familyId, siteId: siteId },
    include: {
      products: {
        include: {
          translations: true,
        },
        orderBy: { familyValue: 'asc' },
      },
    },
  });

  if (!family) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(family);
}

// PUT /api/admin/product-families/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const familyId = parseInt(id, 10);

  if (isNaN(familyId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const existing = await prisma.productFamily.findFirst({
    where: { id: familyId, siteId: siteId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, isActive } = body as {
    name?: string;
    description?: string | null;
    isActive?: boolean;
  };

  const family = await prisma.productFamily.update({
    where: { id: familyId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(family);
}

// DELETE /api/admin/product-families/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const familyId = parseInt(id, 10);

  if (isNaN(familyId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const existing = await prisma.productFamily.findFirst({
    where: { id: familyId, siteId: siteId },
    include: { _count: { select: { products: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (existing._count.products > 0) {
    return NextResponse.json(
      { error: `Cannot delete family with ${existing._count.products} product(s). Remove products first.` },
      { status: 400 }
    );
  }

  await prisma.productFamily.delete({ where: { id: familyId } });

  return NextResponse.json({ success: true });
}
