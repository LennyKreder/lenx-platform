import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// GET /api/admin/blog/[slug] - Get a single blog post
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { siteId_slug: { siteId, slug } },
    include: {
      translations: true,
      tags: { include: { tag: { include: { translations: true } } } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json(post);
}

// PUT /api/admin/blog/[slug] - Update a blog post
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { slug } = await params;

  try {
    const body = await request.json();
    const { writer, isPublished, featuredImage, publishedAt, translations, tagIds } = body;

    const existing = await prisma.blogPost.findUnique({
      where: { siteId_slug: { siteId, slug } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Auto-set publishedAt when first published
    let resolvedPublishedAt = existing.publishedAt;
    if (publishedAt !== undefined) {
      resolvedPublishedAt = publishedAt ? new Date(publishedAt) : null;
    } else if (isPublished && !existing.publishedAt) {
      resolvedPublishedAt = new Date();
    }

    // Replace tags if tagIds provided
    if (tagIds !== undefined) {
      await prisma.blogPostTag.deleteMany({ where: { postId: existing.id } });
      if (tagIds.length > 0) {
        await prisma.blogPostTag.createMany({
          data: tagIds.map((tagId: number) => ({ postId: existing.id, tagId })),
        });
      }
    }

    const post = await prisma.blogPost.update({
      where: { siteId_slug: { siteId, slug } },
      data: {
        writer: writer !== undefined ? writer : existing.writer,
        isPublished: isPublished ?? existing.isPublished,
        featuredImage: featuredImage !== undefined ? featuredImage : existing.featuredImage,
        publishedAt: resolvedPublishedAt,
        translations: {
          upsert: translations.map((t: { languageCode: string; title: string; metaDescription?: string; excerpt?: string; content: string; featuredImage?: string }) => ({
            where: {
              postId_languageCode: {
                postId: existing.id,
                languageCode: t.languageCode,
              },
            },
            create: {
              languageCode: t.languageCode,
              title: t.title,
              metaDescription: t.metaDescription,
              excerpt: t.excerpt,
              content: t.content,
              featuredImage: t.featuredImage || null,
            },
            update: {
              title: t.title,
              metaDescription: t.metaDescription,
              excerpt: t.excerpt,
              content: t.content,
              featuredImage: t.featuredImage !== undefined ? (t.featuredImage || null) : undefined,
            },
          })),
        },
      },
      include: {
        translations: true,
        tags: { include: { tag: { include: { translations: true } } } },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error updating blog post:', error);
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/blog/[slug] - Delete a blog post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { slug } = await params;

  try {
    await prisma.blogPost.delete({
      where: { siteId_slug: { siteId, slug } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
}
