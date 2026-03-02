import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/lib/prisma';
import { prisma } from '@/lib/prisma';
import { batchGetProductDiscountedPrices, getBundleDiscountedPrice, getDiscountedProductIds } from '@/lib/discounts';
import { replaceTemplateVariables } from '@/lib/template-variables';
import { calculateBundlePrice, getBundleTotalProductValue } from '@/lib/bundle-pricing';
import { themes } from '@/config/themes';
import { languages } from '@/config/languages';
import { logger } from '@/lib/logger';
import { getSettings } from '@/lib/settings';
import { getSiteFromHeaders } from '@/lib/site-context';

// Strip language suffix from product name (since it's shown as a badge)
function stripLanguageSuffix(name: string): string {
  const languageNames = Object.values(languages).flatMap((l) => [l.name, l.nativeName]);
  for (const langName of languageNames) {
    // Match patterns like " - English", " (English)", " | English"
    const patterns = [
      new RegExp(`\\s*[-|]\\s*${langName}$`, 'i'),
      new RegExp(`\\s*\\(${langName}\\)$`, 'i'),
    ];
    for (const pattern of patterns) {
      if (pattern.test(name)) {
        return name.replace(pattern, '').trim();
      }
    }
  }
  return name;
}

// GET /api/shop/products - Get published products for the shop
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Filter parameters
  const year = searchParams.get('year');
  const theme = searchParams.get('theme');
  const search = searchParams.get('search');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const themeMode = searchParams.get('themeMode'); // 'light', 'dark', or 'all'
  const device = searchParams.get('device'); // product device: 'tablet', 'remarkable', or 'all'
  const itemType = searchParams.get('type'); // 'all', 'products', or 'bundles'
  const productType = searchParams.get('productType'); // 'planner', 'printable', 'notebook', 'template'
  const onSale = searchParams.get('onSale') === 'true'; // Filter for discounted products only
  const locale = searchParams.get('locale') || 'en'; // UI language for translations

  // Resolve site from request headers
  const site = await getSiteFromHeaders();

  // Pagination - get default page size from settings
  const settings = await getSettings(site.id);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSizeParam = searchParams.get('pageSize');
  const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : settings.itemsPerPage;

  // Build where clause — filter via webshop listing's published status
  const where: Prisma.ProductWhereInput = {
    siteId: site.id,
    listings: {
      some: {
        isPublished: true,
        channel: { type: 'webshop', siteId: site.id },
      },
    },
  };

  if (year) {
    where.year = parseInt(year, 10);
  }

  if (theme && theme !== 'all') {
    where.theme = theme;
  } else if (themeMode && themeMode !== 'all') {
    const modeThemes = Object.keys(themes).filter((id) => themes[id].mode === themeMode);
    where.theme = { in: modeThemes };
  }

  // Auto-filter by locale: products are visible if contentLanguage matches locale OR is null (language-agnostic)
  // Use AND to combine with other conditions
  where.AND = [
    {
      OR: [
        { contentLanguage: locale },
        { contentLanguage: null },
      ],
    },
  ];

  if (search && search.trim()) {
    (where.AND as Prisma.ProductWhereInput[]).push({
      OR: [
        { translations: { some: { name: { contains: search.trim() } } } },
        { template: { translations: { some: { name: { contains: search.trim() } } } } },
      ],
    });
  }

  if (minPrice || maxPrice) {
    const priceFilter: { gte?: number; lte?: number } = {};
    if (minPrice) priceFilter.gte = parseInt(minPrice, 10);
    if (maxPrice) priceFilter.lte = parseInt(maxPrice, 10);
    // Filter via listing price
    where.listings = {
      some: {
        ...((where.listings as { some: object })?.some || {}),
        priceInCents: priceFilter,
      },
    };
  }

  if (device && device !== 'all') {
    where.device = device;
  }

  if (productType && productType !== 'all') {
    where.productType = productType;
  }

  // Filter for discounted products only
  if (onSale) {
    const discountedIds = await getDiscountedProductIds();
    if (discountedIds.size > 0) {
      where.id = { in: Array.from(discountedIds) };
    } else {
      // No discounted products - return empty result
      where.id = { in: [] };
    }
  }

  try {
    // Get total count for pagination
    const totalCount = itemType !== 'bundles' ? await prisma.product.count({ where }) : 0;

    // Build orderBy based on settings
    const sortOrder = settings.productDefaultSortOrder;
    let orderBy: { [key: string]: 'asc' | 'desc' }[] = [];

    switch (settings.productDefaultSortBy) {
      case 'name':
        // For name sorting, we need to sort after fetching since name comes from translations
        // Fall back to createdAt for DB query, then sort in memory
        orderBy = [{ createdAt: sortOrder }];
        break;
      case 'year':
        orderBy = [{ year: sortOrder }, { createdAt: 'desc' }];
        break;
      case 'theme':
        orderBy = [{ theme: sortOrder }, { createdAt: 'desc' }];
        break;
      case 'createdAt':
      default:
        orderBy = [{ createdAt: sortOrder }];
        break;
    }

    // Get products with translations and tags
    const products = itemType !== 'bundles' ? await prisma.product.findMany({
      where,
      include: {
        template: {
          include: {
            translations: {
              where: { languageCode: locale },
            },
            slugs: {
              where: { isPrimary: true },
            },
            tags: {
              include: {
                tag: {
                  include: {
                    translations: {
                      where: { languageCode: locale },
                    },
                  },
                },
              },
            },
          },
        },
        translations: {
          where: { languageCode: locale },
        },
        slugs: {
          where: { isPrimary: true },
        },
        // Standalone products have tags directly
        tags: {
          include: {
            tag: {
              include: {
                translations: {
                  where: { languageCode: locale },
                },
              },
            },
          },
        },
        // Include webshop listing for pricing
        listings: {
          where: { channel: { type: 'webshop' } },
          take: 1,
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }) : [];

    // Batch-load discounts for all products (use listing price)
    const discountResults = await batchGetProductDiscountedPrices(
      products.map((p) => ({
        id: p.id,
        priceInCents: p.listings[0]?.priceInCents ?? p.priceInCents,
        year: p.year,
        device: p.device,
        templateId: p.templateId,
      }))
    );

    // For products without slugs, find a sibling product (same template/theme/device/contentLanguage) that has a slug
    const productIdsWithoutSlugs = products
      .filter((p) => p.slugs.length === 0 && p.templateId && p.theme && p.device)
      .map((p) => ({ id: p.id, templateId: p.templateId, theme: p.theme, device: p.device, contentLanguage: p.contentLanguage }));

    const siblingSlugMap = new Map<number, string>();
    if (productIdsWithoutSlugs.length > 0) {
      // Find sibling products that have slugs
      for (const p of productIdsWithoutSlugs) {
        const siblingWithSlug = await prisma.product.findFirst({
          where: {
            templateId: p.templateId,
            theme: p.theme,
            device: p.device,
            contentLanguage: p.contentLanguage,
            slugs: { some: { languageCode: locale, isPrimary: true } },
          },
          include: {
            slugs: { where: { languageCode: locale, isPrimary: true } },
          },
        });
        if (siblingWithSlug?.slugs[0]?.slug) {
          siblingSlugMap.set(p.id, siblingWithSlug.slugs[0].slug);
        }
      }
    }

    // Transform products for frontend
    const transformedProducts = products.map((product) => {
      const productTranslation = product.translations[0];
      const templateTranslation = product.template?.translations[0];
      // Prefer product slug, then sibling slug, then template slug
      const productSlugMatch = product.slugs.find((s) => s.languageCode === locale) || product.slugs[0];
      const siblingSlug = siblingSlugMap.get(product.id);
      const templateSlugMatch = product.template?.slugs?.find((s) => s.languageCode === locale) || product.template?.slugs?.[0];
      const productSlug = productSlugMatch?.slug || siblingSlug || templateSlugMatch?.slug || '';

      // Use product name if set, otherwise fall back to template name
      const productVars = (product.templateVariables || {}) as Record<string, string>;
      const builtIn = { year: product.year, theme: product.theme, language: product.contentLanguage };
      const rawName = productTranslation?.name || templateTranslation?.name || 'Unnamed Product';
      const rawDescription = productTranslation?.description || templateTranslation?.description || '';
      const nameWithVars = replaceTemplateVariables(rawName, productVars, builtIn);
      const name = stripLanguageSuffix(nameWithVars);
      const description = replaceTemplateVariables(rawDescription, productVars, builtIn);

      // Get tags from template (for templated products) or from product (for standalone)
      const tagSource = product.template?.tags || product.tags || [];
      const tags = tagSource.map((t) => ({
        id: t.tag.id,
        name: t.tag.translations[0]?.name || '',
      }));

      // Use listing price (fall back to product price for safety)
      const listingPrice = product.listings[0]?.priceInCents ?? product.priceInCents;
      const listingCurrency = product.listings[0]?.currency ?? product.currency;

      // Get pre-fetched discount info
      const discountResult = discountResults.get(product.id) || {
        discountedPriceInCents: listingPrice,
        discountAmount: 0,
        discountPercent: 0,
      };

      return {
        id: product.id,
        name,
        description,
        slug: productSlug,
        year: product.year,
        theme: product.theme,
        contentLanguage: product.contentLanguage,
        productType: product.productType,
        device: product.device,
        priceInCents: listingPrice,
        discountedPriceInCents: discountResult.discountedPriceInCents,
        hasDiscount: discountResult.discountAmount > 0,
        discountPercent: discountResult.discountPercent,
        currency: listingCurrency,
        images: product.images as string[],
        tags,
        template: product.template ? {
          id: product.template.id,
          name: templateTranslation?.name || '',
        } : null,
      };
    }).filter((p) => p.slug); // Filter out products without valid slugs

    // Sort by name in memory if that's the selected sort option
    if (settings.productDefaultSortBy === 'name') {
      transformedProducts.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    // Determine whether to show bundles based on item type filter
    const showBundles = itemType === 'bundles' ||
      (itemType !== 'products' && page === 1 && !year && (!theme || theme === 'all') && !search);

    let bundles: Array<{
      id: number;
      type: 'bundle';
      name: string;
      description: string;
      shortDescription?: string | null;
      slug: string;
      priceInCents: number;
      discountedPriceInCents: number;
      hasDiscount: boolean;
      discountPercent: number;
      totalProductValueInCents?: number;
      currency: string;
      images: string[];
      isAllAccess: boolean;
      isFeatured: boolean;
      theme: string | null;
    }> = [];

    if (showBundles) {
      const rawBundles = await prisma.bundle.findMany({
        where: {
          siteId: site.id,
          isPublished: true,
          // Filter by content language: show bundles that match locale OR have no language set
          OR: [
            { contentLanguage: locale },
            { contentLanguage: null },
          ],
        },
        include: {
          translations: {
            where: { languageCode: locale },
          },
          slugs: {
            where: { isPrimary: true },
          },
        },
      });

      bundles = await Promise.all(rawBundles.map(async (bundle) => {
        const translation = bundle.translations[0];
        // Prefer locale-specific slug, fall back to any primary slug
        const slug = bundle.slugs.find((s) => s.languageCode === locale) || bundle.slugs[0];

        // Calculate the bundle's base price (from fixedPrice or products with discountPercent)
        const originalPrice = await calculateBundlePrice(
          bundle.id,
          bundle.fixedPriceInCents,
          bundle.discountPercent,
          bundle.isAllAccess
        );

        // Get any additional discount info (from Discount model)
        const discountResult = await getBundleDiscountedPrice(bundle.id, originalPrice, bundle.isAllAccess);

        // Get total value of products for non-all-access bundles
        const totalProductValueInCents = !bundle.isAllAccess
          ? await getBundleTotalProductValue(bundle.id, bundle.isAllAccess)
          : undefined;

        return {
          id: bundle.id,
          type: 'bundle' as const,
          name: translation?.name || 'Bundle',
          description: translation?.description || '',
          shortDescription: translation?.shortDescription,
          slug: slug?.slug || '',
          priceInCents: originalPrice,
          discountedPriceInCents: discountResult.discountedPriceInCents,
          hasDiscount: discountResult.discountAmount > 0,
          discountPercent: discountResult.discountPercent,
          totalProductValueInCents,
          currency: bundle.currency,
          images: bundle.images as string[],
          isAllAccess: bundle.isAllAccess,
          isFeatured: bundle.isFeatured,
          theme: bundle.theme,
        };
      }));
    }

    // Get total bundle count for the promo card (filtered by locale)
    const totalBundleCount = await prisma.bundle.count({
      where: {
        siteId: site.id,
        isPublished: true,
        OR: [
          { contentLanguage: locale },
          { contentLanguage: null },
        ],
      },
    });

    // Get featured products for the main shop page (only on page 1 with no filters)
    const showFeatured = page === 1 && !year && (!theme || theme === 'all') &&
      !search && !onSale && !minPrice && !maxPrice;

    let featuredProducts: typeof transformedProducts = [];
    if (showFeatured && itemType !== 'bundles') {
      const rawFeaturedProducts = await prisma.product.findMany({
        where: {
          siteId: site.id,
          // Filter via listing published+featured status
          listings: {
            some: {
              isPublished: true,
              isFeatured: true,
              channel: { type: 'webshop', siteId: site.id },
            },
          },
          // Apply same locale filter to featured products
          OR: [
            { contentLanguage: locale },
            { contentLanguage: null },
          ],
        },
        include: {
          template: {
            include: {
              translations: {
                where: { languageCode: locale },
              },
              slugs: {
                where: { isPrimary: true },
              },
              tags: {
                include: {
                  tag: {
                    include: {
                      translations: {
                        where: { languageCode: locale },
                      },
                    },
                  },
                },
              },
            },
          },
          translations: {
            where: { languageCode: locale },
          },
          slugs: {
            where: { isPrimary: true },
          },
          tags: {
            include: {
              tag: {
                include: {
                  translations: {
                    where: { languageCode: locale },
                  },
                },
              },
            },
          },
          listings: {
            where: { channel: { type: 'webshop' } },
            take: 1,
          },
        },
        orderBy,
        take: 4, // Limit to 4 featured products
      });

      // Transform featured products
      const featuredDiscountResults = await batchGetProductDiscountedPrices(
        rawFeaturedProducts.map((p) => ({
          id: p.id,
          priceInCents: p.listings[0]?.priceInCents ?? p.priceInCents,
          year: p.year,
          device: p.device,
          templateId: p.templateId,
        }))
      );

      // For featured products without slugs, find sibling product slugs
      const featuredIdsWithoutSlugs = rawFeaturedProducts
        .filter((p) => p.slugs.length === 0 && p.templateId && p.theme && p.device)
        .map((p) => ({ id: p.id, templateId: p.templateId, theme: p.theme, device: p.device, contentLanguage: p.contentLanguage }));

      const featuredSiblingSlugMap = new Map<number, string>();
      for (const p of featuredIdsWithoutSlugs) {
        const siblingWithSlug = await prisma.product.findFirst({
          where: {
            templateId: p.templateId,
            theme: p.theme,
            device: p.device,
            contentLanguage: p.contentLanguage,
            slugs: { some: { languageCode: locale, isPrimary: true } },
          },
          include: {
            slugs: { where: { languageCode: locale, isPrimary: true } },
          },
        });
        if (siblingWithSlug?.slugs[0]?.slug) {
          featuredSiblingSlugMap.set(p.id, siblingWithSlug.slugs[0].slug);
        }
      }

      featuredProducts = rawFeaturedProducts.map((product) => {
        const productTranslation = product.translations[0];
        const templateTranslation = product.template?.translations[0];
        // Prefer product slug, then sibling slug, then template slug
        const productSlugMatch = product.slugs.find((s) => s.languageCode === locale) || product.slugs[0];
        const siblingSlug = featuredSiblingSlugMap.get(product.id);
        const templateSlugMatch = product.template?.slugs?.find((s) => s.languageCode === locale) || product.template?.slugs?.[0];
        const productSlug = productSlugMatch?.slug || siblingSlug || templateSlugMatch?.slug || '';

        const productVars = (product.templateVariables || {}) as Record<string, string>;
        const builtIn = { year: product.year, theme: product.theme, language: product.contentLanguage };
        const rawName = productTranslation?.name || templateTranslation?.name || 'Unnamed Product';
        const rawDescription = productTranslation?.description || templateTranslation?.description || '';
        const nameWithVars = replaceTemplateVariables(rawName, productVars, builtIn);
        const name = stripLanguageSuffix(nameWithVars);
        const description = replaceTemplateVariables(rawDescription, productVars, builtIn);

        const tagSource = product.template?.tags || product.tags || [];
        const tags = tagSource.map((t) => ({
          id: t.tag.id,
          name: t.tag.translations[0]?.name || '',
        }));

        const featuredListingPrice = product.listings[0]?.priceInCents ?? product.priceInCents;
        const featuredListingCurrency = product.listings[0]?.currency ?? product.currency;

        const discountResult = featuredDiscountResults.get(product.id) || {
          discountedPriceInCents: featuredListingPrice,
          discountAmount: 0,
          discountPercent: 0,
        };

        return {
          id: product.id,
          name,
          description,
          slug: productSlug,
          year: product.year,
          theme: product.theme,
          contentLanguage: product.contentLanguage,
          productType: product.productType,
          device: product.device,
          priceInCents: featuredListingPrice,
          discountedPriceInCents: discountResult.discountedPriceInCents,
          hasDiscount: discountResult.discountAmount > 0,
          discountPercent: discountResult.discountPercent,
          currency: featuredListingCurrency,
          images: product.images as string[],
          tags,
          template: product.template ? {
            id: product.template.id,
            name: templateTranslation?.name || '',
          } : null,
        };
      }).filter((p) => p.slug); // Filter out products without valid slugs

      // Sort featured products by name in memory if that's the selected sort option
      if (settings.productDefaultSortBy === 'name') {
        featuredProducts.sort((a, b) => {
          const comparison = a.name.localeCompare(b.name);
          return sortOrder === 'asc' ? comparison : -comparison;
        });
      }
    }

    // Get available filter options (years, themes, devices, productTypes) - filtered by locale
    const publishedListingFilter = {
      listings: { some: { isPublished: true, channel: { type: 'webshop', siteId: site.id } } },
    };
    const localeFilter = {
      siteId: site.id,
      ...publishedListingFilter,
      OR: [
        { contentLanguage: locale },
        { contentLanguage: null },
      ],
    };

    const [years, themes, availableDevices, availableProductTypes, priceRange] = await Promise.all([
      prisma.product.findMany({
        where: { ...localeFilter, year: { not: null } },
        select: { year: true },
        distinct: ['year'],
        orderBy: { year: 'asc' },
      }),
      prisma.product.findMany({
        where: { ...localeFilter, theme: { not: null } },
        select: { theme: true },
        distinct: ['theme'],
      }),
      prisma.product.findMany({
        where: { ...localeFilter, device: { not: null } },
        select: { device: true },
        distinct: ['device'],
      }),
      prisma.product.findMany({
        where: { ...localeFilter, productType: { not: null } },
        select: { productType: true },
        distinct: ['productType'],
      }),
      prisma.productListing.aggregate({
        where: {
          isPublished: true,
          channel: { type: 'webshop', siteId: site.id },
          product: {
            OR: [
              { contentLanguage: locale },
              { contentLanguage: null },
            ],
          },
        },
        _min: { priceInCents: true },
        _max: { priceInCents: true },
      }),
    ]);

    // For the main shop page, only show All Access bundles
    // Other bundles are accessible via the dedicated bundles page
    // When explicitly filtering by type=bundles, show all bundles
    const featuredBundles = itemType === 'bundles' ? bundles : bundles.filter((b) => b.isAllAccess);

    // When type=bundles, use bundle count for pagination instead of product count
    const actualTotalCount = itemType === 'bundles' ? bundles.length : totalCount;

    return NextResponse.json({
      products: transformedProducts,
      featuredProducts,
      bundles: featuredBundles,
      totalBundleCount,
      pagination: {
        page,
        pageSize,
        totalCount: actualTotalCount,
        totalPages: Math.ceil(actualTotalCount / pageSize),
      },
      filters: {
        years: years.map((y) => y.year).filter((y): y is number => y !== null),
        themes: themes.map((t) => t.theme).filter((t): t is string => t !== null && t !== 'premium_gold'),
        devices: availableDevices.map((d) => d.device).filter((d): d is string => d !== null),
        productTypes: availableProductTypes.map((p) => p.productType).filter((p): p is string => p !== null),
        priceRange: {
          min: priceRange._min.priceInCents || 0,
          max: priceRange._max.priceInCents || 0,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching shop products', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
