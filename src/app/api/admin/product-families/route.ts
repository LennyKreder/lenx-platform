import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

// GET /api/admin/product-families - List all product families
export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const families = await prisma.productFamily.findMany({
    where: { siteId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json({ families });
}

// POST /api/admin/product-families - Create a new product family
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const body = await request.json();
  const { name, description, isActive } = body as {
    name: string;
    description?: string;
    isActive?: boolean;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const family = await prisma.productFamily.create({
    data: {
      siteId,
      name: name.trim(),
      description: description?.trim() || null,
      isActive: isActive ?? true,
    },
  });

  return NextResponse.json(family, { status: 201 });
}
