import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface TranslationInput {
  languageCode: string;
  name: string;
  slug: string;
  title?: string;
  seoTitle?: string;
  seoDescription?: string;
  description?: string;
}

// GET /api/admin/templates - List all product templates
export async function GET(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const searchParams = request.nextUrl.searchParams;
  const includeProducts = searchParams.get('includeProducts') === 'true';

  const templates = await prisma.productTemplate.findMany({
    where: { siteId },
    orderBy: [{ sortOrder: 'asc' }],
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
      tags: true,
      ...(includeProducts && { _count: { select: { products: true } } }),
    },
  });

  return NextResponse.json(templates);
}

// POST /api/admin/templates - Create a new product template
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  try {
    const body = await request.json();
    const {
      translations,
      tagIds,
      fileProperties,
      variables,
      defaultPriceInCents,
      device,
      orientation,
      productType,
      isDated,
      startYear,
      contentLanguages,
      themeSelection,
      selectedThemes,
      sortOrder,
      isActive,
    } = body as {
      translations: TranslationInput[];
      tagIds?: number[];
      fileProperties?: Record<string, boolean>;
      variables?: { key: string; label: string; defaultValue?: string }[];
      defaultPriceInCents?: number;
      device?: string;
      orientation?: string;
      productType?: string;
      isDated?: boolean;
      startYear?: number;
      contentLanguages?: string[];
      themeSelection?: string;
      selectedThemes?: string[];
      sortOrder?: number;
      isActive?: boolean;
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

    // Create template with translations, slugs, and tags in a transaction
    const template = await prisma.$transaction(async (tx) => {
      // Create the template
      const newTemplate = await tx.productTemplate.create({
        data: {
          siteId,
          fileProperties: fileProperties || {},
          variables: variables || [],
          defaultPriceInCents: defaultPriceInCents ?? 0,
          device: device || null,
          orientation: orientation || null,
          productType: productType || null,
          isDated: isDated ?? true,
          startYear: startYear || null,
          contentLanguages: contentLanguages || [],
          themeSelection: themeSelection || 'all',
          selectedThemes: selectedThemes || [],
          sortOrder: sortOrder ?? 0,
          isActive: isActive ?? true,
          translations: {
            create: translations.map((t) => ({
              languageCode: t.languageCode,
              name: t.name,
              title: t.title || null,
              seoTitle: t.seoTitle || null,
              seoDescription: t.seoDescription || null,
              description: t.description || null,
            })),
          },
          // Create tag associations
          ...(tagIds && tagIds.length > 0 && {
            tags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }),
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
            entityType: 'template',
            templateId: newTemplate.id,
            isPrimary: true,
          },
        });
      }

      // Fetch with slugs and tags included
      return tx.productTemplate.findUnique({
        where: { id: newTemplate.id },
        include: {
          translations: true,
          slugs: { where: { isPrimary: true } },
          tags: true,
        },
      });
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create template: ${errorMessage}` },
      { status: 500 }
    );
  }
}
