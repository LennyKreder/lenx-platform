import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { generateDownloadCode } from '@/lib/download-code';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/admin/products/[id]/duplicate - Duplicate a product
export async function POST(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  const siteId = await getAdminSiteId();

  try {
    // Fetch the product to duplicate with all related data (verify store ownership)
    const original = await prisma.product.findFirst({
      where: { id: productId, siteId },
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
        tags: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Generate unique download code
    const generateUniqueDownloadCode = async (): Promise<string> => {
      let code = generateDownloadCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const existing = await prisma.product.findUnique({
          where: { downloadCode: code },
        });
        if (!existing) {
          // Also check bundles
          const existingBundle = await prisma.bundle.findUnique({
            where: { downloadCode: code },
          });
          if (!existingBundle) break;
        }
        code = generateDownloadCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique download code');
      }

      return code;
    };

    // Generate unique slugs by appending "-copy" (or "-copy-2", etc.)
    const generateUniqueSlug = async (baseSlug: string, languageCode: string): Promise<string> => {
      let slug = `${baseSlug}-copy`;
      let counter = 2;

      while (true) {
        const existing = await prisma.slugRoute.findFirst({
          where: { slug, languageCode },
        });
        if (!existing) break;
        slug = `${baseSlug}-copy-${counter}`;
        counter++;
      }

      return slug;
    };

    // Create duplicate in a transaction
    const duplicate = await prisma.$transaction(async (tx) => {
      const downloadCode = await generateUniqueDownloadCode();

      // Create new product
      const newProduct = await tx.product.create({
        data: {
          siteId,
          templateId: original.templateId,
          year: original.year,
          theme: original.theme,
          contentLanguage: original.contentLanguage,
          productType: original.productType,
          device: original.device,
          orientation: original.orientation,
          priceInCents: original.priceInCents,
          currency: original.currency,
          etsyListingId: null, // Don't copy Etsy listing ID
          downloadCode,
          images: original.images as string[],
          isPublished: false, // Start as unpublished
          publishedAt: null,
        },
      });

      // Duplicate translations with " (Copy)" appended to name
      for (const trans of original.translations) {
        await tx.productTranslation.create({
          data: {
            productId: newProduct.id,
            languageCode: trans.languageCode,
            name: trans.name ? `${trans.name} (Copy)` : null,
            description: trans.description,
          },
        });
      }

      // Duplicate slugs with unique values
      for (const slug of original.slugs) {
        const uniqueSlug = await generateUniqueSlug(slug.slug, slug.languageCode);
        await tx.slugRoute.create({
          data: {
            siteId,
            languageCode: slug.languageCode,
            slug: uniqueSlug,
            entityType: 'product',
            productId: newProduct.id,
            isPrimary: true,
          },
        });
      }

      // Duplicate tags (only for standalone products without templates)
      if (!original.templateId && original.tags.length > 0) {
        for (const tag of original.tags) {
          await tx.productTag.create({
            data: {
              productId: newProduct.id,
              tagId: tag.tagId,
            },
          });
        }
      }

      // Return the new product with all related data
      return tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          template: {
            include: {
              translations: true,
              slugs: { where: { isPrimary: true } },
            },
          },
          translations: true,
          slugs: { where: { isPrimary: true } },
          tags: true,
        },
      });
    });

    return NextResponse.json(duplicate);
  } catch (error) {
    console.error('Error duplicating product:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate product' },
      { status: 500 }
    );
  }
}
