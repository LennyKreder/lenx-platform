import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId, getAdminSiteCode, ALL_SITES_CODE } from '@/lib/admin-site';
import { generateDownloadCode } from '@/lib/download-code';

interface TranslationInput {
  languageCode: string;
  slug: string;
  name?: string;
  title?: string;
  seoTitle?: string;
  seoDescription?: string;
  description?: string;
}

// GET /api/admin/products - List all products
export async function GET(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteCode = await getAdminSiteCode();
  const isAllSites = siteCode === ALL_SITES_CODE;

  const searchParams = request.nextUrl.searchParams;
  const templateId = searchParams.get('templateId');
  const year = searchParams.get('year');
  const isPublished = searchParams.get('isPublished');
  const device = searchParams.get('device');
  const theme = searchParams.get('theme');
  const contentLanguage = searchParams.get('contentLanguage');
  const productType = searchParams.get('productType');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  // In "All Sites" mode, show products from physical sites only
  let siteFilter: Record<string, unknown>;
  if (isAllSites) {
    const physicalSites = await prisma.site.findMany({
      where: { siteType: 'physical' },
      select: { id: true },
    });
    siteFilter = { siteId: { in: physicalSites.map((s) => s.id) } };
  } else {
    const siteId = await getAdminSiteId();
    siteFilter = { siteId };
  }

  const where: Record<string, unknown> = { ...siteFilter };

  if (templateId) {
    where.templateId = parseInt(templateId, 10);
  }
  if (year) {
    where.year = parseInt(year, 10);
  }
  if (isPublished !== null && isPublished !== undefined && isPublished !== '') {
    where.isPublished = isPublished === 'true';
  }
  if (device) {
    where.template = { ...where.template as object, device };
  }
  if (theme) {
    where.theme = theme;
  }
  if (contentLanguage) {
    where.contentLanguage = contentLanguage;
  }
  if (productType) {
    where.productType = productType;
  }
  if (search) {
    where.OR = [
      { downloadCode: { contains: search, mode: 'insensitive' } },
      { etsyListingId: { contains: search, mode: 'insensitive' } },
      { slugs: { some: { slug: { contains: search, mode: 'insensitive' } } } },
      { translations: { some: { name: { contains: search, mode: 'insensitive' } } } },
      { template: { translations: { some: { name: { contains: search, mode: 'insensitive' } } } } },
    ];
  }

  const [products, total, templates, yearsData] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        template: {
          include: {
            translations: true,
            slugs: { where: { isPrimary: true } },
          },
        },
        translations: true,
        slugs: { where: { isPrimary: true } },
        site: isAllSites ? { select: { code: true, name: true } } : false,
        _count: { select: { files: true, tags: true } },
      },
    }),
    prisma.product.count({ where }),
    isAllSites
      ? Promise.resolve([])
      : prisma.productTemplate.findMany({
          where: { siteId: (siteFilter as { siteId: string }).siteId, isActive: true },
          include: { translations: true },
          orderBy: { sortOrder: 'asc' },
        }),
    prisma.product.findMany({
      where: { ...siteFilter, year: { not: null } },
      select: { year: true },
      distinct: ['year'],
      orderBy: { year: 'asc' },
    }),
  ]);

  const availableYears = yearsData
    .map((p) => p.year)
    .filter((y): y is number => y !== null);

  const transformedProducts = products.map((p) => ({
    id: p.id,
    year: p.year,
    theme: p.theme,
    contentLanguage: p.contentLanguage,
    productType: p.productType,
    device: p.device,
    priceInCents: p.priceInCents,
    currency: p.currency,
    downloadCode: p.downloadCode,
    isPublished: p.isPublished,
    isFeatured: p.isFeatured,
    translations: p.translations,
    slugs: p.slugs,
    template: p.template ? { translations: p.template.translations, slugs: p.template.slugs } : null,
    _count: p._count,
    imageCount: (p.images as string[] | null)?.length ?? 0,
    hasVideo: !!(p as { videoUrl?: string | null }).videoUrl,
    ...(isAllSites && { site: (p as { site?: { code: string; name: string } }).site || null }),
  }));

  return NextResponse.json({
    products: transformedProducts,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    filters: {
      templates: templates.map((t) => ({
        id: t.id,
        name: t.translations.find((tr) => tr.languageCode === 'en')?.name || t.translations[0]?.name || '',
        device: t.device,
      })),
      years: availableYears,
    },
  });
}

// POST /api/admin/products - Create a new product
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  try {
    const body = await request.json();
    const {
      templateId,
      translations,
      tagIds,
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
      templateId?: number | null;
      translations: TranslationInput[];
      tagIds?: number[];
      year?: number;
      theme?: string;
      contentLanguage?: string;
      productType?: string;
      device?: string;
      orientation?: string;
      templateVariables?: Record<string, string>;
      priceInCents?: number;
      currency?: string;
      etsyListingId?: string;
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

    const isStandalone = !templateId;

    // Validate translations
    if (!translations || !Array.isArray(translations) || translations.length === 0) {
      return NextResponse.json(
        { error: 'At least one translation with a slug is required' },
        { status: 400 }
      );
    }

    for (const t of translations) {
      if (!t.languageCode || !t.slug) {
        return NextResponse.json(
          { error: 'Each translation must have languageCode and slug' },
          { status: 400 }
        );
      }
    }

    // Check if template exists (only if templateId is provided)
    if (templateId) {
      const template = await prisma.productTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 400 }
        );
      }
    }

    // Standalone products require name in at least one translation
    if (isStandalone) {
      const hasName = translations.some(t => t.name);
      if (!hasName) {
        return NextResponse.json(
          { error: 'Standalone products require a name in at least one translation' },
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

    // Generate unique download code
    let downloadCode = generateDownloadCode();
    let attempts = 0;
    while (await prisma.product.findUnique({ where: { downloadCode } })) {
      downloadCode = generateDownloadCode();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json(
          { error: 'Failed to generate unique download code' },
          { status: 500 }
        );
      }
    }

    // Create product with translations, slugs, and tags in a transaction
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          siteId,
          templateId: templateId || null,
          year: year || null,
          theme: theme || null,
          contentLanguage: contentLanguage || null,
          productType: productType || null,
          device: device || null,
          orientation: orientation || null,
          templateVariables: templateVariables || {},
          priceInCents: priceInCents ?? 0,
          currency: currency || 'EUR',
          etsyListingId: etsyListingId || null,
          downloadCode,
          isPublished: isPublished ?? false,
          isFeatured: isFeatured ?? false,
          publishedAt: isPublished ? new Date() : null,
          images: [],
          // Physical product fields
          sku: sku || null,
          ean: ean || null,
          compareAtPriceInCents: compareAtPriceInCents || null,
          costPriceInCents: costPriceInCents || null,
          vatRate: vatRate ?? 21,
          weightGrams: weightGrams || null,
          hsCode: hsCode || null,
          countryOfOrigin: countryOfOrigin || null,
          categoryId: categoryId || null,
          familyId: familyId || null,
          familyValue: familyValue || null,
          translations: {
            create: translations
              .filter((t) => t.name || t.description || t.title || t.seoTitle || t.seoDescription)
              .map((t) => ({
                languageCode: t.languageCode,
                name: t.name || null,
                title: t.title || null,
                seoTitle: t.seoTitle || null,
                seoDescription: t.seoDescription || null,
                description: t.description || null,
              })),
          },
          // Create tags for standalone products
          ...(isStandalone && tagIds && tagIds.length > 0 && {
            tags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }),
        },
      });

      // Create slugs
      for (const t of translations) {
        await tx.slugRoute.create({
          data: {
            siteId,
            languageCode: t.languageCode,
            slug: t.slug,
            entityType: 'product',
            productId: newProduct.id,
            isPrimary: true,
          },
        });
      }

      // Auto-create webshop listing
      const webshopChannel = await tx.salesChannel.findFirst({
        where: { siteId, type: 'webshop' },
      });
      if (webshopChannel) {
        await tx.productListing.create({
          data: {
            productId: newProduct.id,
            channelId: webshopChannel.id,
            priceInCents: newProduct.priceInCents,
            compareAtPriceInCents: newProduct.compareAtPriceInCents,
            currency: newProduct.currency,
            isPublished: newProduct.isPublished,
            isFeatured: newProduct.isFeatured,
            publishedAt: newProduct.publishedAt,
            externalId: newProduct.etsyListingId,
          },
        });
      }

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

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
