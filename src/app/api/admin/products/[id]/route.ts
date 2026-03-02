import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface TranslationInput {
  languageCode: string;
  slug: string;
  name?: string;
  title?: string;
  seoTitle?: string;
  seoDescription?: string;
  description?: string;
}

// GET /api/admin/products/[id] - Get a single product
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, siteId },
    include: {
      template: {
        include: {
          translations: true,
          slugs: { where: { isPrimary: true } },
        },
      },
      translations: true,
      slugs: { where: { isPrimary: true } },
      files: { orderBy: { sortOrder: 'asc' } },
      tags: {
        include: {
          tag: {
            include: {
              translations: true,
              slugs: { where: { isPrimary: true } },
            },
          },
        },
      },
      _count: {
        select: {
          files: true,
          orderItems: true,
          access: true,
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json(product);
}

// PUT /api/admin/products/[id] - Update a product
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
      templateId,
      translations,
      year,
      theme,
      contentLanguage,
      productType,
      device,
      orientation,
      templateVariables,
      priceInCents,
      currency,
      etsyListingId,
      images,
      isPublished,
      isFeatured,
      // Physical product fields
      sku,
      ean,
      compareAtPriceInCents,
      costPriceInCents,
      vatRate,
      weightGrams,
      hsCode,
      countryOfOrigin,
      categoryId,
      familyId,
      familyValue,
    } = body as {
      templateId?: number;
      translations?: TranslationInput[];
      year?: number | null;
      theme?: string | null;
      contentLanguage?: string | null;
      productType?: string | null;
      device?: string | null;
      orientation?: string | null;
      templateVariables?: Record<string, string>;
      priceInCents?: number;
      currency?: string;
      etsyListingId?: string | null;
      images?: string[];
      isPublished?: boolean;
      isFeatured?: boolean;
      // Physical product fields
      sku?: string | null;
      ean?: string | null;
      compareAtPriceInCents?: number | null;
      costPriceInCents?: number | null;
      vatRate?: number;
      weightGrams?: number | null;
      hsCode?: string | null;
      countryOfOrigin?: string | null;
      categoryId?: number | null;
      familyId?: number | null;
      familyValue?: string | null;
    };

    // Check if product exists and belongs to store
    const existing = await prisma.product.findFirst({
      where: { id: productId, siteId },
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Validate translations if provided
    if (translations && Array.isArray(translations)) {
      for (const t of translations) {
        if (!t.languageCode || !t.slug) {
          return NextResponse.json(
            { error: 'Each translation must have languageCode and slug' },
            { status: 400 }
          );
        }

        // Check for duplicate slugs (excluding this product's own slugs)
        const existingSlug = await prisma.slugRoute.findFirst({
          where: {
            languageCode: t.languageCode,
            slug: t.slug,
            productId: { not: productId },
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

    // Handle publish state change
    let publishedAt = existing.publishedAt;
    if (isPublished !== undefined && isPublished !== existing.isPublished) {
      publishedAt = isPublished ? new Date() : null;
    }

    // Update product, translations, and slugs in a transaction
    const product = await prisma.$transaction(async (tx) => {
      // Update base product
      await tx.product.update({
        where: { id: productId },
        data: {
          ...(templateId !== undefined && { templateId }),
          ...(year !== undefined && { year: year || null }),
          ...(theme !== undefined && { theme: theme || null }),
          ...(contentLanguage !== undefined && { contentLanguage: contentLanguage || null }),
          ...(productType !== undefined && { productType: productType || null }),
          ...(device !== undefined && { device: device || null }),
          ...(orientation !== undefined && { orientation: orientation || null }),
          ...(templateVariables !== undefined && { templateVariables }),
          ...(priceInCents !== undefined && { priceInCents }),
          ...(currency !== undefined && { currency }),
          ...(etsyListingId !== undefined && { etsyListingId: etsyListingId || null }),
          ...(images !== undefined && { images }),
          ...(isPublished !== undefined && { isPublished, publishedAt }),
          ...(isFeatured !== undefined && { isFeatured }),
          // Physical product fields
          ...(sku !== undefined && { sku: sku || null }),
          ...(ean !== undefined && { ean: ean || null }),
          ...(compareAtPriceInCents !== undefined && { compareAtPriceInCents: compareAtPriceInCents || null }),
          ...(costPriceInCents !== undefined && { costPriceInCents: costPriceInCents || null }),
          ...(vatRate !== undefined && { vatRate }),
          ...(weightGrams !== undefined && { weightGrams: weightGrams || null }),
          ...(hsCode !== undefined && { hsCode: hsCode || null }),
          ...(countryOfOrigin !== undefined && { countryOfOrigin: countryOfOrigin || null }),
          ...(categoryId !== undefined && { categoryId: categoryId || null }),
          ...(familyId !== undefined && { familyId: familyId || null }),
          ...(familyValue !== undefined && { familyValue: familyValue || null }),
        },
      });

      // Update translations and slugs if provided
      if (translations && Array.isArray(translations)) {
        for (const t of translations) {
          // Upsert translation (only if name, title, seoTitle, seoDescription, or description provided)
          if (t.name || t.title || t.seoTitle || t.seoDescription || t.description) {
            await tx.productTranslation.upsert({
              where: {
                productId_languageCode: {
                  productId,
                  languageCode: t.languageCode,
                },
              },
              update: {
                name: t.name || null,
                title: t.title || null,
                seoTitle: t.seoTitle || null,
                seoDescription: t.seoDescription || null,
                description: t.description || null,
              },
              create: {
                productId,
                languageCode: t.languageCode,
                name: t.name || null,
                title: t.title || null,
                seoTitle: t.seoTitle || null,
                seoDescription: t.seoDescription || null,
                description: t.description || null,
              },
            });
          }

          // Find current primary slug for this language
          const currentSlug = await tx.slugRoute.findFirst({
            where: {
              entityType: 'product',
              productId,
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
                entityType: 'product',
                productId,
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
                entityType: 'product',
                productId,
                isPrimary: true,
              },
            });
          }
        }
      }

      // Sync webshop listing with product changes
      const listingUpdate: Record<string, unknown> = {};
      if (priceInCents !== undefined) listingUpdate.priceInCents = priceInCents;
      if (compareAtPriceInCents !== undefined) listingUpdate.compareAtPriceInCents = compareAtPriceInCents || null;
      if (currency !== undefined) listingUpdate.currency = currency;
      if (isPublished !== undefined) { listingUpdate.isPublished = isPublished; listingUpdate.publishedAt = publishedAt; }
      if (isFeatured !== undefined) listingUpdate.isFeatured = isFeatured;
      if (etsyListingId !== undefined) listingUpdate.externalId = etsyListingId || null;

      if (Object.keys(listingUpdate).length > 0) {
        const webshopChannel = await tx.salesChannel.findFirst({
          where: { siteId, type: 'webshop' },
        });
        if (webshopChannel) {
          await tx.productListing.updateMany({
            where: { productId, channelId: webshopChannel.id, variantId: null },
            data: listingUpdate,
          });
        }
      }

      // Fetch and return the updated product
      return tx.product.findUnique({
        where: { id: productId },
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
      });
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id] - Delete a product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    // Verify product belongs to store
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product has orders
    const ordersCount = await prisma.orderItem.count({
      where: { productId },
    });

    if (ordersCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete product with ${ordersCount} order(s). Consider unpublishing instead.`,
        },
        { status: 400 }
      );
    }

    // Delete related records first (cascade should handle most, but be explicit)
    await prisma.productFile.deleteMany({ where: { productId } });
    await prisma.productTag.deleteMany({ where: { productId } });
    await prisma.bundleItem.deleteMany({ where: { productId } });
    await prisma.customerAccess.deleteMany({ where: { productId } });
    // Slugs and translations will be deleted via cascade

    // Delete the product
    await prisma.product.delete({ where: { id: productId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
