import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface TranslationInput {
  languageCode: string;
  name: string;
  slug: string;
}

// GET /api/admin/tags - List all tags
export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tags = await prisma.tag.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json(tags);
}

// POST /api/admin/tags - Create a new tag
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteId = await getAdminSiteId();
    const body = await request.json();
    const { translations } = body as {
      translations: TranslationInput[];
    };

    // Validate translations
    if (!translations || !Array.isArray(translations) || translations.length === 0) {
      return NextResponse.json(
        { error: 'At least one translation is required' },
        { status: 400 }
      );
    }

    // Validate each translation has required fields
    for (const t of translations) {
      if (!t.languageCode || !t.name || !t.slug) {
        return NextResponse.json(
          { error: 'Each translation must have languageCode, name, and slug' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate slugs per language
    for (const t of translations) {
      const existingSlug = await prisma.slugRoute.findUnique({
        where: {
          siteId_languageCode_slug: {
            siteId,
            languageCode: t.languageCode,
            slug: t.slug,
          },
        },
      });
      if (existingSlug) {
        return NextResponse.json(
          { error: `Slug "${t.slug}" is already in use for language "${t.languageCode}"` },
          { status: 400 }
        );
      }
    }

    // Create tag with translations and slugs in a transaction
    const tag = await prisma.$transaction(async (tx) => {
      const newTag = await tx.tag.create({
        data: {
          siteId,
          translations: {
            create: translations.map((t) => ({
              languageCode: t.languageCode,
              name: t.name,
            })),
          },
        },
        include: {
          translations: true,
        },
      });

      // Create slugs
      for (const t of translations) {
        await tx.slugRoute.create({
          data: {
            siteId,
            languageCode: t.languageCode,
            slug: t.slug,
            entityType: 'tag',
            tagId: newTag.id,
            isPrimary: true,
          },
        });
      }

      // Fetch with slugs included
      return tx.tag.findUnique({
        where: { id: newTag.id },
        include: {
          translations: true,
          slugs: { where: { isPrimary: true } },
        },
      });
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
