import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { generateDownloadCode } from '@/lib/download-code';

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

// GET /api/admin/bundles - List all bundles with optional filtering
export async function GET(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const isPublished = searchParams.get('isPublished');
  const isAllAccess = searchParams.get('isAllAccess');
  const isFeatured = searchParams.get('isFeatured');
  const contentLanguage = searchParams.get('contentLanguage');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  // Build where clause
  const where: {
    siteId: string;
    isPublished?: boolean;
    isAllAccess?: boolean;
    isFeatured?: boolean;
    contentLanguage?: string | null;
    OR?: { translations: { some: { name: { contains: string; mode: 'insensitive' } } } }[];
  } = { siteId };

  if (isPublished !== null && isPublished !== undefined) {
    where.isPublished = isPublished === 'true';
  }

  if (isAllAccess !== null && isAllAccess !== undefined) {
    where.isAllAccess = isAllAccess === 'true';
  }

  if (isFeatured !== null && isFeatured !== undefined) {
    where.isFeatured = isFeatured === 'true';
  }

  if (contentLanguage !== null && contentLanguage !== undefined) {
    where.contentLanguage = contentLanguage === 'all-shops' ? null : contentLanguage;
  }

  if (search) {
    where.OR = [
      { translations: { some: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const [allBundles, total] = await Promise.all([
    prisma.bundle.findMany({
      where,
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
        items: {
          select: { productId: true },
        },
        _count: { select: { orderItems: true, access: true } },
      },
    }),
    prisma.bundle.count({ where }),
  ]);

  // Sort by English translation name (or first available)
  const sortedBundles = allBundles.sort((a, b) => {
    const nameA = a.translations.find(t => t.languageCode === 'en')?.name || a.translations[0]?.name || '';
    const nameB = b.translations.find(t => t.languageCode === 'en')?.name || b.translations[0]?.name || '';
    return nameA.localeCompare(nameB);
  });

  // Paginate
  const bundles = sortedBundles.slice((page - 1) * pageSize, page * pageSize);

  return NextResponse.json({
    bundles,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

// POST /api/admin/bundles - Create a new bundle
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
      discountPercent,
      fixedPriceInCents,
      currency,
      contentLanguage,
      isAllAccess,
      etsyListingId,
      isPublished,
      isFeatured,
      productIds,
    } = body as {
      translations: TranslationInput[];
      discountPercent?: number;
      fixedPriceInCents?: number;
      currency?: string;
      contentLanguage?: string | null;
      isAllAccess?: boolean;
      etsyListingId?: string;
      isPublished?: boolean;
      isFeatured?: boolean;
      productIds?: number[];
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

    // Get the slug (same for all languages)
    const slug = translations[0].slug;

    // Determine which languages to create slugs for based on contentLanguage
    const slugLanguages = contentLanguage ? [contentLanguage] : ['en', 'nl', 'de', 'fr', 'es', 'it'];

    // Check for duplicate slugs - only conflict if content languages overlap
    for (const lang of slugLanguages) {
      const existingSlug = await prisma.slugRoute.findUnique({
        where: {
          siteId_languageCode_slug: {
            siteId,
            languageCode: lang,
            slug: slug,
          },
        },
        include: {
          bundle: { select: { contentLanguage: true } },
        },
      });

      if (existingSlug) {
        // Check if the existing slug's bundle has overlapping content language
        const existingContentLang = existingSlug.bundle?.contentLanguage;
        // Conflict if: both null, both same, or one is null (appears everywhere)
        const hasOverlap = !contentLanguage || !existingContentLang || contentLanguage === existingContentLang;

        if (hasOverlap) {
          return NextResponse.json(
            { error: `Slug "${slug}" is already in use` },
            { status: 400 }
          );
        }
      }
    }

    // Generate unique download code
    let downloadCode = generateDownloadCode();
    let attempts = 0;
    while (await prisma.bundle.findUnique({ where: { downloadCode } })) {
      downloadCode = generateDownloadCode();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json(
          { error: 'Failed to generate unique download code' },
          { status: 500 }
        );
      }
    }

    // Create bundle with translations and slugs in a transaction
    const bundle = await prisma.$transaction(async (tx) => {
      const newBundle = await tx.bundle.create({
        data: {
          siteId,
          discountPercent: discountPercent || null,
          fixedPriceInCents: fixedPriceInCents || null,
          currency: currency || 'EUR',
          contentLanguage: contentLanguage || null,
          isAllAccess: isAllAccess || false,
          etsyListingId: etsyListingId || null,
          downloadCode,
          isPublished: isPublished || false,
          isFeatured: isFeatured || false,
          publishedAt: isPublished ? new Date() : null,
          images: [],
          translations: {
            create: translations.map((t) => ({
              languageCode: t.languageCode,
              name: t.name,
              title: t.title || null,
              shortDescription: t.shortDescription || null,
              seoTitle: t.seoTitle || null,
              seoDescription: t.seoDescription || null,
              description: t.description || null,
            })),
          },
          items: {
            create: (productIds || []).map((productId: number) => ({ productId })),
          },
        },
      });

      // Create slugs only for relevant languages based on contentLanguage
      for (const lang of slugLanguages) {
        await tx.slugRoute.create({
          data: {
            siteId,
            languageCode: lang,
            slug: slug,
            entityType: 'bundle',
            bundleId: newBundle.id,
            isPrimary: true,
          },
        });
      }

      // Fetch with all relations included
      return tx.bundle.findUnique({
        where: { id: newBundle.id },
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

    return NextResponse.json(bundle, { status: 201 });
  } catch (error) {
    console.error('Error creating bundle:', error);
    return NextResponse.json(
      { error: 'Failed to create bundle' },
      { status: 500 }
    );
  }
}
