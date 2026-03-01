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
  title?: string;
  seoTitle?: string;
  seoDescription?: string;
  description?: string;
}

// GET /api/admin/templates/[id] - Get a single template
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
  }

  const template = await prisma.productTemplate.findFirst({
    where: { id: templateId, siteId },
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
      tags: true,
      _count: { select: { products: true } },
    },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json(template);
}

// PUT /api/admin/templates/[id] - Update a template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
  }

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
      translations?: TranslationInput[];
      tagIds?: number[];
      fileProperties?: Record<string, boolean>;
      variables?: { key: string; label: string; defaultValue?: string }[];
      defaultPriceInCents?: number;
      device?: string | null;
      orientation?: string | null;
      productType?: string | null;
      isDated?: boolean;
      startYear?: number | null;
      contentLanguages?: string[];
      themeSelection?: string;
      selectedThemes?: string[];
      sortOrder?: number;
      isActive?: boolean;
    };

    // Check if template exists and belongs to store
    const existing = await prisma.productTemplate.findFirst({
      where: { id: templateId, siteId },
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
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

        // Check for duplicate slugs (excluding this template's own slugs)
        const existingSlug = await prisma.slugRoute.findFirst({
          where: {
            languageCode: t.languageCode,
            slug: t.slug,
            templateId: { not: templateId },
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

    // Update template, translations, and slugs in a transaction
    const template = await prisma.$transaction(async (tx) => {
      // Update base template
      await tx.productTemplate.update({
        where: { id: templateId },
        data: {
          ...(fileProperties !== undefined && { fileProperties }),
          ...(variables !== undefined && { variables }),
          ...(defaultPriceInCents !== undefined && { defaultPriceInCents }),
          ...(device !== undefined && { device: device || null }),
          ...(orientation !== undefined && { orientation: orientation || null }),
          ...(productType !== undefined && { productType: productType || null }),
          ...(isDated !== undefined && { isDated }),
          ...(startYear !== undefined && { startYear: startYear || null }),
          ...(contentLanguages !== undefined && { contentLanguages }),
          ...(themeSelection !== undefined && { themeSelection }),
          ...(selectedThemes !== undefined && { selectedThemes }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      // Update translations and slugs if provided
      if (translations && Array.isArray(translations)) {
        for (const t of translations) {
          // Upsert translation
          await tx.productTemplateTranslation.upsert({
            where: {
              templateId_languageCode: {
                templateId,
                languageCode: t.languageCode,
              },
            },
            update: {
              name: t.name,
              title: t.title || null,
              seoTitle: t.seoTitle || null,
              seoDescription: t.seoDescription || null,
              description: t.description || null,
            },
            create: {
              templateId,
              languageCode: t.languageCode,
              name: t.name,
              title: t.title || null,
              seoTitle: t.seoTitle || null,
              seoDescription: t.seoDescription || null,
              description: t.description || null,
            },
          });

          // Find current primary slug for this language
          const currentSlug = await tx.slugRoute.findFirst({
            where: {
              entityType: 'template',
              templateId,
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
                entityType: 'template',
                templateId,
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
                entityType: 'template',
                templateId,
                isPrimary: true,
              },
            });
          }
        }
      }

      // Update tags if provided
      if (tagIds !== undefined) {
        // Delete existing tags
        await tx.productTemplateTag.deleteMany({
          where: { templateId },
        });

        // Create new tags
        if (tagIds.length > 0) {
          await tx.productTemplateTag.createMany({
            data: tagIds.map((tagId) => ({ templateId, tagId })),
          });
        }
      }

      // Fetch and return the updated template
      return tx.productTemplate.findUnique({
        where: { id: templateId },
        include: {
          translations: true,
          slugs: { where: { isPrimary: true } },
          tags: true,
        },
      });
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/templates/[id] - Delete a template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const { id } = await params;
  const templateId = parseInt(id, 10);

  if (isNaN(templateId)) {
    return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
  }

  try {
    // Verify template belongs to store
    const template = await prisma.productTemplate.findFirst({
      where: { id: templateId, siteId },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if template has products
    const productsCount = await prisma.product.count({
      where: { templateId },
    });

    if (productsCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete template with ${productsCount} product(s). Remove products first.`,
        },
        { status: 400 }
      );
    }

    // Translations and slugs will be deleted automatically via cascade
    await prisma.productTemplate.delete({ where: { id: templateId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
