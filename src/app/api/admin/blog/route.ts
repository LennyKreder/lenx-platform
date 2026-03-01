import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

// GET /api/admin/blog - List all blog posts
export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const posts = await prisma.blogPost.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
    include: {
      translations: true,
      tags: { include: { tag: { include: { translations: true } } } },
    },
  });

  return NextResponse.json(posts);
}

// POST /api/admin/blog - Create a new blog post
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteId = await getAdminSiteId();
    const body = await request.json();
    const { slug, writer, isPublished, featuredImage, publishedAt, translations, tagIds } = body;

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const existing = await prisma.blogPost.findUnique({
      where: { siteId_slug: { siteId, slug } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 400 }
      );
    }

    const post = await prisma.blogPost.create({
      data: {
        siteId,
        slug,
        writer: writer || 'lenny',
        isPublished: isPublished ?? false,
        featuredImage: featuredImage || null,
        publishedAt: publishedAt ? new Date(publishedAt) : (isPublished ? new Date() : null),
        translations: {
          create: translations.map((t: { languageCode: string; title: string; metaDescription?: string; excerpt?: string; content: string; featuredImage?: string }) => ({
            languageCode: t.languageCode,
            title: t.title,
            metaDescription: t.metaDescription,
            excerpt: t.excerpt,
            content: t.content,
            featuredImage: t.featuredImage || null,
          })),
        },
        tags: tagIds?.length ? {
          create: tagIds.map((tagId: number) => ({ tagId })),
        } : undefined,
      },
      include: {
        translations: true,
        tags: { include: { tag: { include: { translations: true } } } },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
