import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

// GET /api/admin/categories - List all categories
export async function GET(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const type = request.nextUrl.searchParams.get('type') || 'product';

  const categories = await prisma.category.findMany({
    where: { siteId, type },
    orderBy: { sortOrder: 'asc' },
    include: {
      translations: true,
      parent: { include: { translations: true } },
      _count: { select: { children: true, products: true } },
    },
  });

  return NextResponse.json({ categories });
}

// POST /api/admin/categories - Create a new category
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const body = await request.json();
  const { translations, parentId, type, sortOrder, isActive } = body as {
    translations: { languageCode: string; name: string }[];
    parentId?: number | null;
    type?: string;
    sortOrder?: number;
    isActive?: boolean;
  };

  if (!translations || translations.length === 0 || !translations.some((t) => t.name?.trim())) {
    return NextResponse.json({ error: 'At least one translation with a name is required' }, { status: 400 });
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

  const category = await prisma.category.create({
    data: {
      siteId,
      type: type || 'product',
      parentId: parentId || null,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
      translations: {
        create: translations
          .filter((t) => t.name?.trim())
          .map((t) => ({
            languageCode: t.languageCode,
            name: t.name.trim(),
          })),
      },
    },
    include: {
      translations: true,
      _count: { select: { children: true, products: true } },
    },
  });

  return NextResponse.json(category, { status: 201 });
}
