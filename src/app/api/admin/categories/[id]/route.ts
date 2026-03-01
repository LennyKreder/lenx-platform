import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/categories/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const categoryId = parseInt(id, 10);

  if (isNaN(categoryId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, siteId },
    include: {
      translations: true,
      parent: { include: { translations: true } },
      children: {
        include: { translations: true },
        orderBy: { sortOrder: 'asc' },
      },
      products: {
        include: { translations: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      _count: { select: { children: true, products: true } },
    },
  });

  if (!category) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(category);
}

// PUT /api/admin/categories/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const categoryId = parseInt(id, 10);

  if (isNaN(categoryId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const existing = await prisma.category.findFirst({
    where: { id: categoryId, siteId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const { translations, parentId, sortOrder, isActive } = body as {
    translations?: { languageCode: string; name: string }[];
    parentId?: number | null;
    sortOrder?: number;
    isActive?: boolean;
  };

  // Prevent setting self as parent
  if (parentId === categoryId) {
    return NextResponse.json({ error: 'Category cannot be its own parent' }, { status: 400 });
  }

  // Validate parent belongs to same site
  if (parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: parentId, siteId },
    });
    if (!parent) {
      return NextResponse.json({ error: 'Parent category not found' }, { status: 400 });
    }
  }

  const category = await prisma.$transaction(async (tx) => {
    // Update translations if provided
    if (translations && translations.length > 0) {
      // Delete existing and recreate
      await tx.categoryTranslation.deleteMany({
        where: { categoryId },
      });
      await tx.categoryTranslation.createMany({
        data: translations
          .filter((t) => t.name?.trim())
          .map((t) => ({
            categoryId,
            languageCode: t.languageCode,
            name: t.name.trim(),
          })),
      });
    }

    return tx.category.update({
      where: { id: categoryId },
      data: {
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        translations: true,
        _count: { select: { children: true, products: true } },
      },
    });
  });

  return NextResponse.json(category);
}

// DELETE /api/admin/categories/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const categoryId = parseInt(id, 10);

  if (isNaN(categoryId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const existing = await prisma.category.findFirst({
    where: { id: categoryId, siteId },
    include: { _count: { select: { children: true, products: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (existing._count.children > 0) {
    return NextResponse.json(
      { error: `Cannot delete category with ${existing._count.children} subcategorie(s). Remove them first.` },
      { status: 400 }
    );
  }

  if (existing._count.products > 0) {
    return NextResponse.json(
      { error: `Cannot delete category with ${existing._count.products} product(s). Remove them first.` },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });

  return NextResponse.json({ success: true });
}
