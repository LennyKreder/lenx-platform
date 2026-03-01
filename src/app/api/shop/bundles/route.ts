import { NextRequest, NextResponse } from 'next/server';
import { prisma, Prisma } from '@/lib/prisma';
import { getBundleDiscountedPrice } from '@/lib/discounts';
import { calculateBundlePrice, getBundleTotalProductValue } from '@/lib/bundle-pricing';
import { themes } from '@/config/themes';
import { getSiteFromHeaders } from '@/lib/site-context';

// GET /api/shop/bundles - Get all published bundles
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'en';
  const themeFilter = searchParams.get('theme');
  const searchQuery = searchParams.get('search');
  const modeFilter = searchParams.get('mode'); // light or dark

  const site = await getSiteFromHeaders();

  try {
    // Build where clause
    const where: Prisma.BundleWhereInput = {
      siteId: site.id,
      isPublished: true,
      // Filter by content language: show bundles that match locale OR have no language set (all shops)
      OR: [
        { contentLanguage: locale },
        { contentLanguage: null },
      ],
    };

    // Theme filter
    if (themeFilter && themeFilter !== 'all') {
      where.theme = themeFilter;
    }

    // Search filter - search in translations
    if (searchQuery && searchQuery.trim()) {
      where.translations = {
        some: {
          languageCode: locale,
          name: { contains: searchQuery.trim(), mode: 'insensitive' },
        },
      };
    }

    const rawBundles = await prisma.bundle.findMany({
      where,
      include: {
        translations: {
          where: { languageCode: locale },
        },
        slugs: {
          where: { isPrimary: true, languageCode: locale },
        },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const allBundles = await Promise.all(rawBundles.map(async (bundle) => {
      const translation = bundle.translations[0];
      const slug = bundle.slugs[0];

      // Calculate the bundle's base price
      const originalPrice = await calculateBundlePrice(
        bundle.id,
        bundle.fixedPriceInCents,
        bundle.discountPercent,
        bundle.isAllAccess
      );

      // Get any additional discount info
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

    // Filter by theme mode if requested (light/dark based on theme config)
    let bundles = allBundles;
    if (modeFilter && modeFilter !== 'all') {
      bundles = allBundles.filter((b) => {
        if (!b.theme) return false;
        const themeConfig = themes[b.theme as keyof typeof themes];
        return themeConfig?.mode === modeFilter;
      });
    }

    // Get unique themes from all bundles for filter options
    const availableThemes = [...new Set(allBundles.map((b) => b.theme).filter(Boolean))] as string[];

    return NextResponse.json({ bundles, availableThemes });
  } catch (error) {
    console.error('Error fetching bundles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bundles' },
      { status: 500 }
    );
  }
}
