import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

// POST /api/admin/cleanup - Run cleanup operations
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteId = await getAdminSiteId();
    const body = await request.json();
    const { operation } = body as { operation: string };

    const results: Record<string, number> = {};

    switch (operation) {
      case 'orphaned-slugs': {
        // Clean up orphaned bundle slugs
        const bundleSlugs = await prisma.$executeRaw`
          DELETE FROM "slugroute"
          WHERE "siteId" = ${siteId}
          AND "entityType" = 'bundle'
          AND "bundleId" IS NOT NULL
          AND "bundleId" NOT IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId})
        `;
        results.bundleSlugs = bundleSlugs;

        // Clean up orphaned product slugs
        const productSlugs = await prisma.$executeRaw`
          DELETE FROM "slugroute"
          WHERE "siteId" = ${siteId}
          AND "entityType" = 'product'
          AND "productId" IS NOT NULL
          AND "productId" NOT IN (SELECT id FROM "product" WHERE "siteId" = ${siteId})
        `;
        results.productSlugs = productSlugs;

        // Clean up orphaned category slugs
        const categorySlugs = await prisma.$executeRaw`
          DELETE FROM "slugroute"
          WHERE "siteId" = ${siteId}
          AND "entityType" = 'category'
          AND "categoryId" IS NOT NULL
          AND "categoryId" NOT IN (SELECT id FROM "category")
        `;
        results.categorySlugs = categorySlugs;

        // Clean up orphaned template slugs
        const templateSlugs = await prisma.$executeRaw`
          DELETE FROM "slugroute"
          WHERE "siteId" = ${siteId}
          AND "entityType" = 'template'
          AND "templateId" IS NOT NULL
          AND "templateId" NOT IN (SELECT id FROM "product_template")
        `;
        results.templateSlugs = templateSlugs;
        break;
      }

      case 'orphaned-translations': {
        // Clean up orphaned bundle translations
        const bundleTranslations = await prisma.$executeRaw`
          DELETE FROM "bundle_translation"
          WHERE "bundleId" NOT IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId})
          AND "bundleId" IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId} UNION SELECT "bundleId" FROM "bundle_translation" bt JOIN "bundle" b ON bt."bundleId" = b.id WHERE b."siteId" = ${siteId})
        `;
        results.bundleTranslations = bundleTranslations;

        // Clean up orphaned product translations
        const productTranslations = await prisma.$executeRaw`
          DELETE FROM "product_translation"
          WHERE "productId" NOT IN (SELECT id FROM "product" WHERE "siteId" = ${siteId})
          AND "productId" IN (SELECT id FROM "product" WHERE "siteId" = ${siteId} UNION SELECT "productId" FROM "product_translation" pt JOIN "product" p ON pt."productId" = p.id WHERE p."siteId" = ${siteId})
        `;
        results.productTranslations = productTranslations;

        // Clean up orphaned category translations
        const categoryTranslations = await prisma.$executeRaw`
          DELETE FROM "category_translation"
          WHERE "categoryId" NOT IN (SELECT id FROM "category")
        `;
        results.categoryTranslations = categoryTranslations;

        // Clean up orphaned template translations
        const templateTranslations = await prisma.$executeRaw`
          DELETE FROM "product_template_translation"
          WHERE "templateId" NOT IN (SELECT id FROM "product_template")
        `;
        results.templateTranslations = templateTranslations;
        break;
      }

      case 'orphaned-bundle-items': {
        // Clean up bundle items pointing to deleted products (scoped to store's bundles)
        const bundleItems = await prisma.$executeRaw`
          DELETE FROM "bundle_item"
          WHERE "bundleId" IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId})
          AND "productId" NOT IN (SELECT id FROM "product")
        `;
        results.bundleItems = bundleItems;
        break;
      }

      case 'orphaned-access': {
        // Clean up customer access for deleted products (scoped to store's products)
        const productAccess = await prisma.$executeRaw`
          DELETE FROM "customer_access"
          WHERE "productId" IS NOT NULL
          AND "productId" NOT IN (SELECT id FROM "product")
          AND "productId" IN (SELECT id FROM "product" WHERE "siteId" = ${siteId} UNION SELECT ca."productId" FROM "customer_access" ca JOIN "product" p ON ca."productId" = p.id WHERE p."siteId" = ${siteId})
        `;
        results.productAccess = productAccess;

        // Clean up customer access for deleted bundles (scoped to store's bundles)
        const bundleAccess = await prisma.$executeRaw`
          DELETE FROM "customer_access"
          WHERE "bundleId" IS NOT NULL
          AND "bundleId" NOT IN (SELECT id FROM "bundle")
          AND "bundleId" IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId} UNION SELECT ca."bundleId" FROM "customer_access" ca JOIN "bundle" b ON ca."bundleId" = b.id WHERE b."siteId" = ${siteId})
        `;
        results.bundleAccess = bundleAccess;
        break;
      }

      case 'all': {
        // Run all cleanup operations
        const allResults = await Promise.all([
          prisma.$executeRaw`DELETE FROM "slugroute" WHERE "siteId" = ${siteId} AND "entityType" = 'bundle' AND "bundleId" IS NOT NULL AND "bundleId" NOT IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId})`,
          prisma.$executeRaw`DELETE FROM "slugroute" WHERE "siteId" = ${siteId} AND "entityType" = 'product' AND "productId" IS NOT NULL AND "productId" NOT IN (SELECT id FROM "product" WHERE "siteId" = ${siteId})`,
          prisma.$executeRaw`DELETE FROM "slugroute" WHERE "siteId" = ${siteId} AND "entityType" = 'category' AND "categoryId" IS NOT NULL AND "categoryId" NOT IN (SELECT id FROM "category")`,
          prisma.$executeRaw`DELETE FROM "slugroute" WHERE "siteId" = ${siteId} AND "entityType" = 'template' AND "templateId" IS NOT NULL AND "templateId" NOT IN (SELECT id FROM "product_template")`,
          prisma.$executeRaw`DELETE FROM "bundle_translation" WHERE "bundleId" IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId}) AND "bundleId" NOT IN (SELECT id FROM "bundle")`,
          prisma.$executeRaw`DELETE FROM "product_translation" WHERE "productId" IN (SELECT id FROM "product" WHERE "siteId" = ${siteId}) AND "productId" NOT IN (SELECT id FROM "product")`,
          prisma.$executeRaw`DELETE FROM "category_translation" WHERE "categoryId" NOT IN (SELECT id FROM "category")`,
          prisma.$executeRaw`DELETE FROM "product_template_translation" WHERE "templateId" NOT IN (SELECT id FROM "product_template")`,
          prisma.$executeRaw`DELETE FROM "bundle_item" WHERE "bundleId" IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId}) AND "productId" NOT IN (SELECT id FROM "product")`,
          prisma.$executeRaw`DELETE FROM "customer_access" WHERE "productId" IS NOT NULL AND "productId" NOT IN (SELECT id FROM "product")`,
          prisma.$executeRaw`DELETE FROM "customer_access" WHERE "bundleId" IS NOT NULL AND "bundleId" NOT IN (SELECT id FROM "bundle")`,
        ]);

        results.bundleSlugs = allResults[0];
        results.productSlugs = allResults[1];
        results.categorySlugs = allResults[2];
        results.templateSlugs = allResults[3];
        results.bundleTranslations = allResults[4];
        results.productTranslations = allResults[5];
        results.categoryTranslations = allResults[6];
        results.templateTranslations = allResults[7];
        results.bundleItems = allResults[8];
        results.productAccess = allResults[9];
        results.bundleAccess = allResults[10];
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      success: true,
      operation,
      results,
      totalDeleted,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup operation failed' },
      { status: 500 }
    );
  }
}

// GET /api/admin/cleanup - Get orphan counts
export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteId = await getAdminSiteId();

    const [
      orphanedBundleSlugs,
      orphanedProductSlugs,
      orphanedCategorySlugs,
      orphanedTemplateSlugs,
      orphanedBundleTranslations,
      orphanedProductTranslations,
      orphanedCategoryTranslations,
      orphanedTemplateTranslations,
      orphanedBundleItems,
      orphanedProductAccess,
      orphanedBundleAccess,
    ] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "slugroute" WHERE "siteId" = ${siteId} AND "entityType" = 'bundle' AND "bundleId" IS NOT NULL AND "bundleId" NOT IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId})`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "slugroute" WHERE "siteId" = ${siteId} AND "entityType" = 'product' AND "productId" IS NOT NULL AND "productId" NOT IN (SELECT id FROM "product" WHERE "siteId" = ${siteId})`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "slugroute" WHERE "siteId" = ${siteId} AND "entityType" = 'category' AND "categoryId" IS NOT NULL AND "categoryId" NOT IN (SELECT id FROM "category")`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "slugroute" WHERE "siteId" = ${siteId} AND "entityType" = 'template' AND "templateId" IS NOT NULL AND "templateId" NOT IN (SELECT id FROM "product_template")`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "bundle_translation" WHERE "bundleId" IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId}) AND "bundleId" NOT IN (SELECT id FROM "bundle")`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "product_translation" WHERE "productId" IN (SELECT id FROM "product" WHERE "siteId" = ${siteId}) AND "productId" NOT IN (SELECT id FROM "product")`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "category_translation" WHERE "categoryId" NOT IN (SELECT id FROM "category")`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "product_template_translation" WHERE "templateId" NOT IN (SELECT id FROM "product_template")`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "bundle_item" WHERE "bundleId" IN (SELECT id FROM "bundle" WHERE "siteId" = ${siteId}) AND "productId" NOT IN (SELECT id FROM "product")`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "customer_access" WHERE "productId" IS NOT NULL AND "productId" NOT IN (SELECT id FROM "product")`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM "customer_access" WHERE "bundleId" IS NOT NULL AND "bundleId" NOT IN (SELECT id FROM "bundle")`,
    ]);

    const counts = {
      slugs: {
        bundles: Number(orphanedBundleSlugs[0].count),
        products: Number(orphanedProductSlugs[0].count),
        categories: Number(orphanedCategorySlugs[0].count),
        templates: Number(orphanedTemplateSlugs[0].count),
      },
      translations: {
        bundles: Number(orphanedBundleTranslations[0].count),
        products: Number(orphanedProductTranslations[0].count),
        categories: Number(orphanedCategoryTranslations[0].count),
        templates: Number(orphanedTemplateTranslations[0].count),
      },
      bundleItems: Number(orphanedBundleItems[0].count),
      customerAccess: {
        products: Number(orphanedProductAccess[0].count),
        bundles: Number(orphanedBundleAccess[0].count),
      },
    };

    const totalOrphans =
      counts.slugs.bundles + counts.slugs.products + counts.slugs.categories + counts.slugs.templates +
      counts.translations.bundles + counts.translations.products + counts.translations.categories + counts.translations.templates +
      counts.bundleItems +
      counts.customerAccess.products + counts.customerAccess.bundles;

    return NextResponse.json({
      counts,
      totalOrphans,
    });
  } catch (error) {
    console.error('Error getting orphan counts:', error);
    return NextResponse.json(
      { error: 'Failed to get orphan counts' },
      { status: 500 }
    );
  }
}
