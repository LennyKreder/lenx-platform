import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { generateSlug } from '@/lib/slug-utils';
import { getThemeName } from '@/config/themes';

// POST /api/admin/rebuild-slugs - Rebuild all slugs from translations
export async function POST() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const results = {
    templates: { created: 0, skipped: 0, errors: [] as string[] },
    products: { created: 0, skipped: 0, errors: [] as string[] },
    bundles: { created: 0, skipped: 0, errors: [] as string[] },
    tags: { created: 0, skipped: 0, errors: [] as string[] },
  };

  try {
    // Get all active languages
    const languages = await prisma.language.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const languageCodes = languages.map((l) => l.id);

    // 1. Rebuild template slugs
    const templates = await prisma.productTemplate.findMany({
      include: { translations: true },
    });

    for (const template of templates) {
      for (const translation of template.translations) {
        if (!languageCodes.includes(translation.languageCode)) continue;

        const baseSlug = generateSlug(translation.name);
        const slug = await findUniqueSlug(baseSlug, translation.languageCode, 'template', template.id, siteId);

        try {
          await prisma.slugRoute.upsert({
            where: {
              siteId_languageCode_slug: { siteId, languageCode: translation.languageCode, slug },
            },
            update: {
              templateId: template.id,
              entityType: 'template',
              isPrimary: true,
            },
            create: {
              siteId,
              languageCode: translation.languageCode,
              slug,
              entityType: 'template',
              templateId: template.id,
              isPrimary: true,
            },
          });
          results.templates.created++;
        } catch (e) {
          results.templates.errors.push(`Template ${template.id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    }

    // 3. Rebuild product slugs
    // Format: {template-name}-{theme}-{device}
    // Example: clarity-planner-soft-rose-ipad
    // Each product gets ONE slug with languageCode = contentLanguage
    // The same slug text can exist for different languageCodes (unique constraint is on languageCode + slug)
    const products = await prisma.product.findMany({
      include: {
        translations: true,
        template: { include: { translations: true, slugs: { where: { isPrimary: true } } } },
      },
    });

    for (const product of products) {
      // Use the product's content language for the slug's languageCode
      const langCode = product.contentLanguage || 'en';

      // Skip if this language is not active
      if (!languageCodes.includes(langCode)) {
        results.products.skipped++;
        continue;
      }

      let baseSlug: string;

      if (product.template) {
        // Products with template: use {template-slug}-{theme}-{device}
        const templateSlug = product.template.slugs.find(s => s.languageCode === langCode)?.slug
          || product.template.slugs[0]?.slug
          || generateSlug(product.template.translations.find(t => t.languageCode === langCode)?.name || 'product');
        const themeName = product.theme ? getThemeName(product.theme, 'en') : '';
        const devicePart = product.device || '';
        baseSlug = [templateSlug, themeName, devicePart].filter(Boolean).join('-');
        baseSlug = generateSlug(baseSlug);
      } else {
        // Standalone products: use product name
        const name = product.translations.find((t) => t.languageCode === langCode)?.name;
        if (!name) {
          results.products.skipped++;
          continue;
        }
        baseSlug = generateSlug(name);
      }

      const slug = await findUniqueSlug(baseSlug, langCode, 'product', product.id, siteId);

      try {
        await prisma.slugRoute.upsert({
          where: {
            siteId_languageCode_slug: { siteId, languageCode: langCode, slug },
          },
          update: {
            productId: product.id,
            entityType: 'product',
            isPrimary: true,
          },
          create: {
            siteId,
            languageCode: langCode,
            slug,
            entityType: 'product',
            productId: product.id,
            isPrimary: true,
          },
        });
        results.products.created++;
      } catch (e) {
        results.products.errors.push(`Product ${product.id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // 4. Rebuild bundle slugs
    const bundles = await prisma.bundle.findMany({
      include: { translations: true },
    });

    for (const bundle of bundles) {
      for (const translation of bundle.translations) {
        if (!languageCodes.includes(translation.languageCode)) continue;

        const baseSlug = generateSlug(translation.name);
        const slug = await findUniqueSlug(baseSlug, translation.languageCode, 'bundle', bundle.id, siteId);

        try {
          await prisma.slugRoute.upsert({
            where: {
              siteId_languageCode_slug: { siteId, languageCode: translation.languageCode, slug },
            },
            update: {
              bundleId: bundle.id,
              entityType: 'bundle',
              isPrimary: true,
            },
            create: {
              siteId,
              languageCode: translation.languageCode,
              slug,
              entityType: 'bundle',
              bundleId: bundle.id,
              isPrimary: true,
            },
          });
          results.bundles.created++;
        } catch (e) {
          results.bundles.errors.push(`Bundle ${bundle.id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    }

    // 5. Rebuild tag slugs
    const tags = await prisma.tag.findMany({
      include: { translations: true },
    });

    for (const tag of tags) {
      for (const translation of tag.translations) {
        if (!languageCodes.includes(translation.languageCode)) continue;

        const baseSlug = generateSlug(translation.name);
        const slug = await findUniqueSlug(baseSlug, translation.languageCode, 'tag', tag.id, siteId);

        try {
          await prisma.slugRoute.upsert({
            where: {
              siteId_languageCode_slug: { siteId, languageCode: translation.languageCode, slug },
            },
            update: {
              tagId: tag.id,
              entityType: 'tag',
              isPrimary: true,
            },
            create: {
              siteId,
              languageCode: translation.languageCode,
              slug,
              entityType: 'tag',
              tagId: tag.id,
              isPrimary: true,
            },
          });
          results.tags.created++;
        } catch (e) {
          results.tags.errors.push(`Tag ${tag.id}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    }

    const totalCreated =
      results.templates.created +
      results.products.created +
      results.bundles.created +
      results.tags.created;

    const totalErrors =
      results.templates.errors.length +
      results.products.errors.length +
      results.bundles.errors.length +
      results.tags.errors.length;

    return NextResponse.json({
      success: true,
      message: `Rebuilt ${totalCreated} slugs with ${totalErrors} errors`,
      results,
    });
  } catch (error) {
    console.error('Rebuild slugs error:', error);
    return NextResponse.json(
      { error: 'Failed to rebuild slugs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Find a unique slug by appending numbers if necessary
 */
async function findUniqueSlug(
  baseSlug: string,
  languageCode: string,
  entityType: string,
  entityId: number,
  siteId: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.slugRoute.findUnique({
      where: {
        siteId_languageCode_slug: { siteId, languageCode, slug },
      },
    });

    // If no existing slug, or it belongs to the same entity, use this slug
    if (!existing) {
      return slug;
    }

    // Check if it belongs to the same entity
    const entityField = `${entityType}Id`;
    if (existing[entityField as keyof typeof existing] === entityId) {
      return slug;
    }

    // Try next number
    counter++;
    slug = `${baseSlug}-${counter}`;

    // Safety limit
    if (counter > 100) {
      throw new Error(`Could not find unique slug for ${baseSlug}`);
    }
  }
}

// GET /api/admin/rebuild-slugs - Get current slug counts
export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [categoryCount, templateCount, productCount, bundleCount, tagCount, slugCount] = await Promise.all([
    prisma.category.count(),
    prisma.productTemplate.count(),
    prisma.product.count(),
    prisma.bundle.count(),
    prisma.tag.count(),
    prisma.slugRoute.count(),
  ]);

  return NextResponse.json({
    entities: {
      categories: categoryCount,
      templates: templateCount,
      products: productCount,
      bundles: bundleCount,
      tags: tagCount,
    },
    currentSlugs: slugCount,
  });
}
