import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

// GET /api/admin/content-pages - List all content pages
export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const pages = await prisma.contentPage.findMany({
    where: { siteId },
    orderBy: { slug: 'asc' },
    include: {
      translations: true,
    },
  });

  return NextResponse.json(pages);
}

// POST /api/admin/content-pages - Create a new content page
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteId = await getAdminSiteId();
    const body = await request.json();
    const { slug, isPublished, translations } = body;

    // Check if slug already exists for this store
    const existing = await prisma.contentPage.findUnique({
      where: { siteId_slug: { siteId, slug } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A page with this slug already exists' },
        { status: 400 }
      );
    }

    const page = await prisma.contentPage.create({
      data: {
        siteId,
        slug,
        isPublished: isPublished ?? true,
        translations: {
          create: translations.map((t: { languageCode: string; title: string; metaDescription?: string; content: string }) => ({
            languageCode: t.languageCode,
            title: t.title,
            metaDescription: t.metaDescription,
            content: t.content,
          })),
        },
      },
      include: {
        translations: true,
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error('Error creating content page:', error);
    return NextResponse.json(
      { error: 'Failed to create content page' },
      { status: 500 }
    );
  }
}
