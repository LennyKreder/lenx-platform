import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface TranslationInput {
  languageCode: string;
  name: string;
  slug: string;
}

// GET /api/admin/tags/[id] - Get a single tag
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const tagId = parseInt(id, 10);

  if (isNaN(tagId)) {
    return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
  }

  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
      _count: { select: { products: true } },
    },
  });

  if (!tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  return NextResponse.json(tag);
}

// PUT /api/admin/tags/[id] - Update a tag
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const tagId = parseInt(id, 10);

  if (isNaN(tagId)) {
    return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
  }

  try {
    const siteId = await getAdminSiteId();
    const body = await request.json();
    const { translations } = body as {
      translations?: TranslationInput[];
    };

    // Check if tag exists
    const existing = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Validate translations if provided
    if (translations && Array.isArray(translations)) {
      for (const t of translations) {
        if (!t.languageCode || !t.name || !t.slug) {
          return NextResponse.json(
            { error: 'Each translation must have languageCode, name, and slug' },
            { status: 400 }
          );
        }

        // Check for duplicate slugs (excluding this tag's own slugs)
        const existingSlug = await prisma.slugRoute.findFirst({
          where: {
            languageCode: t.languageCode,
            slug: t.slug,
            tagId: { not: tagId },
          },
        });
        if (existingSlug) {
          return NextResponse.json(
            { error: `Slug "${t.slug}" is already in use for language "${t.languageCode}"` },
            { status: 400 }
          );
        }
      }
    }

    // Update tag, translations, and slugs in a transaction
    const tag = await prisma.$transaction(async (tx) => {
      // Update translations and slugs if provided
      if (translations && Array.isArray(translations)) {
        for (const t of translations) {
          // Upsert translation
          await tx.tagTranslation.upsert({
            where: {
              tagId_languageCode: {
                tagId,
                languageCode: t.languageCode,
              },
            },
            update: { name: t.name },
            create: {
              tagId,
              languageCode: t.languageCode,
              name: t.name,
            },
          });

          // Find current primary slug for this language
          const currentSlug = await tx.slugRoute.findFirst({
            where: {
              entityType: 'tag',
              tagId,
              languageCode: t.languageCode,
              isPrimary: true,
            },
          });

          if (currentSlug && currentSlug.slug !== t.slug) {
            // Slug changed - mark old as non-primary redirect
            const newSlugRoute = await tx.slugRoute.upsert({
              where: {
                siteId_languageCode_slug: {
                  siteId,
                  languageCode: t.languageCode,
                  slug: t.slug,
                },
              },
              update: {
                isPrimary: true,
                redirectToId: null,
              },
              create: {
                siteId,
                languageCode: t.languageCode,
                slug: t.slug,
                entityType: 'tag',
                tagId,
                isPrimary: true,
              },
            });

            await tx.slugRoute.update({
              where: { id: currentSlug.id },
              data: {
                isPrimary: false,
                redirectToId: newSlugRoute.id,
              },
            });
          } else if (!currentSlug) {
            // No existing slug for this language - create new
            await tx.slugRoute.create({
              data: {
                siteId,
                languageCode: t.languageCode,
                slug: t.slug,
                entityType: 'tag',
                tagId,
                isPrimary: true,
              },
            });
          }
        }
      }

      // Fetch and return the updated tag
      return tx.tag.findUnique({
        where: { id: tagId },
        include: {
          translations: true,
          slugs: { where: { isPrimary: true } },
        },
      });
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tags/[id] - Delete a tag
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const tagId = parseInt(id, 10);

  if (isNaN(tagId)) {
    return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
  }

  try {
    // Delete related records first
    await prisma.productTag.deleteMany({ where: { tagId } });
    // Slugs and translations will be deleted via cascade

    // Delete the tag
    await prisma.tag.delete({ where: { id: tagId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
