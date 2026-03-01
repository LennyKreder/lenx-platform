import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/admin/content-pages/[slug] - Get a single content page
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { slug } = await params;

  const page = await prisma.contentPage.findUnique({
    where: { siteId_slug: { siteId, slug } },
    include: {
      translations: true,
    },
  });

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  return NextResponse.json(page);
}

// PUT /api/admin/content-pages/[slug] - Update a content page
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { slug } = await params;

  try {
    const body = await request.json();
    const { isPublished, bannerImage, mobileBannerImage, translations } = body;

    // Check if page exists for this store
    const existing = await prisma.contentPage.findUnique({
      where: { siteId_slug: { siteId, slug } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Update page and translations
    const page = await prisma.contentPage.update({
      where: { siteId_slug: { siteId, slug } },
      data: {
        isPublished: isPublished ?? existing.isPublished,
        bannerImage: bannerImage !== undefined ? bannerImage : existing.bannerImage,
        mobileBannerImage: mobileBannerImage !== undefined ? mobileBannerImage : (existing as { mobileBannerImage?: string | null }).mobileBannerImage,
        translations: {
          upsert: translations.map((t: { languageCode: string; title: string; metaDescription?: string; content: string; bannerImage?: string | null; mobileBannerImage?: string | null }) => ({
            where: {
              pageId_languageCode: {
                pageId: existing.id,
                languageCode: t.languageCode,
              },
            },
            create: {
              languageCode: t.languageCode,
              title: t.title,
              metaDescription: t.metaDescription,
              content: t.content,
              bannerImage: t.bannerImage,
              mobileBannerImage: t.mobileBannerImage,
            },
            update: {
              title: t.title,
              metaDescription: t.metaDescription,
              content: t.content,
              bannerImage: t.bannerImage,
              mobileBannerImage: t.mobileBannerImage,
            },
          })),
        },
      },
      include: {
        translations: true,
      },
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error('Error updating content page:', error);
    return NextResponse.json(
      { error: 'Failed to update content page' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/content-pages/[slug] - Delete a content page
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { slug } = await params;

  try {
    await prisma.contentPage.delete({
      where: { siteId_slug: { siteId, slug } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting content page:', error);
    return NextResponse.json(
      { error: 'Failed to delete content page' },
      { status: 500 }
    );
  }
}
