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
  shortDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  description?: string;
}

// GET /api/admin/bundles/[id] - Get a single bundle
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const { id } = await params;
  const bundleId = parseInt(id, 10);

  if (isNaN(bundleId)) {
    return NextResponse.json({ error: 'Invalid bundle ID' }, { status: 400 });
  }

  const bundle = await prisma.bundle.findFirst({
    where: { id: bundleId, siteId },
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
      items: {
        include: {
          product: {
            include: {
              template: {
                include: {
                  translations: true,
                  slugs: { where: { isPrimary: true } },
                },
              },
              translations: true,
              slugs: { where: { isPrimary: true } },
            },
          },
        },
      },
      _count: { select: { orderItems: true, access: true } },
    },
  });

  if (!bundle) {
    return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
  }

  return NextResponse.json(bundle);
}

// PUT /api/admin/bundles/[id] - Update a bundle
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const { id } = await params;
  const bundleId = parseInt(id, 10);

  if (isNaN(bundleId)) {
    return NextResponse.json({ error: 'Invalid bundle ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
      translations,
      discountPercent,
      fixedPriceInCents,
      currency,
      contentLanguage,
      isAllAccess,
      etsyListingId,
      images,
      isPublished,
      isFeatured,
      productIds,
    } = body as {
      translations?: TranslationInput[];
      discountPercent?: number | null;
      fixedPriceInCents?: number | null;
      currency?: string;
      contentLanguage?: string | null;
      isAllAccess?: boolean;
      etsyListingId?: string | null;
      images?: string[];
      isPublished?: boolean;
      isFeatured?: boolean;
      productIds?: number[];
    };

    // Check if bundle exists and belongs to store
    const existing = await prisma.bundle.findFirst({
      where: { id: bundleId, siteId },
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    // Get the effective content language (use provided or existing)
    const effectiveContentLanguage = contentLanguage !== undefined ? contentLanguage : existing.contentLanguage;

    // Determine which languages to create slugs for based on contentLanguage
    const slugLanguages = effectiveContentLanguage ? [effectiveContentLanguage] : ['en', 'nl', 'de', 'fr', 'es', 'it'];

    // Validate translations if provided
    if (translations && Array.isArray(translations)) {
      for (const t of translations) {
        if (!t.languageCode || !t.name || !t.slug) {
          return NextResponse.json(
            { error: 'Each translation must have languageCode, name, and slug' },
            { status: 400 }
          );
        }
      }

      // Get the slug (same for all languages)
      const slug = translations[0].slug;

      // Check for duplicate slugs - only conflict if content languages overlap
      for (const lang of slugLanguages) {
        const existingSlug = await prisma.slugRoute.findFirst({
          where: {
            languageCode: lang,
            slug: slug,
            bundleId: { not: bundleId },
          },
          include: {
            bundle: { select: { contentLanguage: true } },
          },
        });

        if (existingSlug) {
          // Check if the existing slug's bundle has overlapping content language
          const existingContentLang = existingSlug.bundle?.contentLanguage;
          // Conflict if: both null, both same, or one is null (appears everywhere)
          const hasOverlap = !effectiveContentLanguage || !existingContentLang || effectiveContentLanguage === existingContentLang;

          if (hasOverlap) {
            return NextResponse.json(
              { error: `Slug "${slug}" is already in use` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Handle publish state change
    let publishedAt = existing.publishedAt;
    if (isPublished !== undefined && isPublished !== existing.isPublished) {
      publishedAt = isPublished ? new Date() : null;
    }

    // Update bundle, translations, and slugs in a transaction
    const bundle = await prisma.$transaction(async (tx) => {
      // Update bundle items if provided
      if (productIds !== undefined) {
        // Delete existing items
        await tx.bundleItem.deleteMany({ where: { bundleId } });

        // Create new items
        const newItems = (productIds || []).map((productId: number) => ({
          bundleId,
          productId,
        }));

        if (newItems.length > 0) {
          await tx.bundleItem.createMany({ data: newItems });
        }
      }

      // Update base bundle
      await tx.bundle.update({
        where: { id: bundleId },
        data: {
          ...(discountPercent !== undefined && { discountPercent }),
          ...(fixedPriceInCents !== undefined && { fixedPriceInCents }),
          ...(currency !== undefined && { currency }),
          ...(contentLanguage !== undefined && { contentLanguage: contentLanguage || null }),
          ...(isAllAccess !== undefined && { isAllAccess }),
          ...(etsyListingId !== undefined && { etsyListingId: etsyListingId || null }),
          ...(images !== undefined && { images }),
          ...(isPublished !== undefined && { isPublished, publishedAt }),
          ...(isFeatured !== undefined && { isFeatured }),
        },
      });

      // Update translations and slugs if provided
      if (translations && Array.isArray(translations)) {
        const slug = translations[0].slug;

        // Upsert all translations
        for (const t of translations) {
          await tx.bundleTranslation.upsert({
            where: {
              bundleId_languageCode: {
                bundleId,
                languageCode: t.languageCode,
              },
            },
            update: {
              name: t.name,
              title: t.title || null,
              shortDescription: t.shortDescription || null,
              seoTitle: t.seoTitle || null,
              seoDescription: t.seoDescription || null,
              description: t.description || null,
            },
            create: {
              bundleId,
              languageCode: t.languageCode,
              name: t.name,
              title: t.title || null,
              shortDescription: t.shortDescription || null,
              seoTitle: t.seoTitle || null,
              seoDescription: t.seoDescription || null,
              description: t.description || null,
            },
          });
        }

        // Delete all existing slugs for this bundle and recreate for relevant languages
        await tx.slugRoute.deleteMany({
          where: { bundleId },
        });

        // Create slugs only for relevant languages based on contentLanguage
        for (const lang of slugLanguages) {
          await tx.slugRoute.create({
            data: {
              siteId,
              languageCode: lang,
              slug: slug,
              entityType: 'bundle',
              bundleId,
              isPrimary: true,
            },
          });
        }
      }

      // Fetch and return the updated bundle
      return tx.bundle.findUnique({
        where: { id: bundleId },
        include: {
          translations: true,
          slugs: { where: { isPrimary: true } },
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                  slugs: { where: { isPrimary: true } },
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(bundle);
  } catch (error) {
    console.error('Error updating bundle:', error);
    return NextResponse.json(
      { error: 'Failed to update bundle' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/bundles/[id] - Delete a bundle
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const { id } = await params;
  const bundleId = parseInt(id, 10);

  if (isNaN(bundleId)) {
    return NextResponse.json({ error: 'Invalid bundle ID' }, { status: 400 });
  }

  try {
    // Verify bundle belongs to store
    const bundle = await prisma.bundle.findFirst({
      where: { id: bundleId, siteId },
    });
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    // Check if bundle has orders
    const ordersCount = await prisma.orderItem.count({
      where: { bundleId },
    });

    if (ordersCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete bundle with ${ordersCount} order(s). Consider unpublishing instead.`,
        },
        { status: 400 }
      );
    }

    // Delete related records
    await prisma.bundleItem.deleteMany({ where: { bundleId } });
    await prisma.customerAccess.deleteMany({ where: { bundleId } });
    // Slugs and translations will be deleted via cascade

    // Delete the bundle
    await prisma.bundle.delete({ where: { id: bundleId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bundle:', error);
    return NextResponse.json(
      { error: 'Failed to delete bundle' },
      { status: 500 }
    );
  }
}
