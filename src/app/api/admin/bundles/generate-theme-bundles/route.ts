import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { generateDownloadCode } from '@/lib/download-code';
import { themes, getThemeName } from '@/config/themes';
import { siteConfig } from '@/config/site';

// Description templates
// {{firstYear}}, {{secondYear}}, {{theme}} will be replaced
const descriptionTemplates: Record<string, string> = {
  en: 'Access to {{firstYear}} and {{secondYear}} files for the {{theme}} theme.',
  nl: 'Toegang tot {{firstYear}} en {{secondYear}} bestanden voor het {{theme}} thema.',
  de: 'Zugang zu {{firstYear}} und {{secondYear}} Dateien für das {{theme}} Theme.',
  fr: 'Accès aux fichiers {{firstYear}} et {{secondYear}} pour le thème {{theme}}.',
  es: 'Acceso a los archivos de {{firstYear}} y {{secondYear}} para el tema {{theme}}.',
  it: 'Accesso ai file {{firstYear}} e {{secondYear}} per il tema {{theme}}.',
};

// Name templates
const nameTemplates: Record<string, string> = {
  en: '{{theme}} {{firstYear}}-{{secondYear}} Bundle',
  nl: '{{theme}} {{firstYear}}-{{secondYear}} Bundel',
  de: '{{theme}} {{firstYear}}-{{secondYear}} Paket',
  fr: 'Pack {{theme}} {{firstYear}}-{{secondYear}}',
  es: 'Paquete {{theme}} {{firstYear}}-{{secondYear}}',
  it: 'Pacchetto {{theme}} {{firstYear}}-{{secondYear}}',
};

// SEO Title templates - includes site name with separator
const seoTitleTemplates: Record<string, string> = {
  en: `{{theme}} {{firstYear}}-{{secondYear}} Bundle${siteConfig.separator}${siteConfig.name}`,
  nl: `{{theme}} {{firstYear}}-{{secondYear}} Bundel${siteConfig.separator}${siteConfig.name}`,
  de: `{{theme}} {{firstYear}}-{{secondYear}} Paket${siteConfig.separator}${siteConfig.name}`,
  fr: `Pack {{theme}} {{firstYear}}-{{secondYear}}${siteConfig.separator}${siteConfig.name}`,
  es: `Paquete {{theme}} {{firstYear}}-{{secondYear}}${siteConfig.separator}${siteConfig.name}`,
  it: `Pacchetto {{theme}} {{firstYear}}-{{secondYear}}${siteConfig.separator}${siteConfig.name}`,
};

// SEO Description templates
const seoDescriptionTemplates: Record<string, string> = {
  en: 'Get both {{firstYear}} and {{secondYear}} digital planners in the beautiful {{theme}} color scheme. Save with this bundle deal.',
  nl: 'Krijg zowel {{firstYear}} als {{secondYear}} digitale planners in het mooie {{theme}} kleurenschema. Bespaar met deze bundeldeal.',
  de: 'Holen Sie sich sowohl {{firstYear}} als auch {{secondYear}} digitale Planer im wunderschönen {{theme}} Farbschema. Sparen Sie mit diesem Paketangebot.',
  fr: 'Obtenez les planificateurs numériques {{firstYear}} et {{secondYear}} dans le magnifique thème {{theme}}. Économisez avec cette offre groupée.',
  es: 'Obtén planificadores digitales de {{firstYear}} y {{secondYear}} en el hermoso tema {{theme}}. Ahorra con esta oferta de paquete.',
  it: 'Ottieni i planner digitali {{firstYear}} e {{secondYear}} nel bellissimo tema {{theme}}. Risparmia con questa offerta pacchetto.',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// POST /api/admin/bundles/generate-theme-bundles
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  try {
    const body = await request.json();
    const {
      firstYear,
      secondYear,
      languages: productLanguages = ['en', 'nl'],
      pricingType = 'fixed',
      fixedPrice = 16.99,
      discountPercent = 20,
      isPublished = false,
      dryRun = false,
    } = body as {
      firstYear: number;
      secondYear: number;
      languages?: string[];
      pricingType?: 'fixed' | 'discount';
      fixedPrice?: number;
      discountPercent?: number;
      isPublished?: boolean;
      dryRun?: boolean;
    };

    if (!firstYear || !secondYear) {
      return NextResponse.json(
        { error: 'firstYear and secondYear are required' },
        { status: 400 }
      );
    }

    // Get all theme IDs (excluding premium_gold which is for All Access only)
    const themeIds = Object.keys(themes).filter((id) => id !== 'premium_gold');
    const results: { theme: string; bundleId?: number; error?: string; skipped?: boolean }[] = [];
    const translationLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it'];

    for (const themeId of themeIds) {
      // Find all published products with this theme for both years, filtered by selected languages
      const products = await prisma.product.findMany({
        where: {
          siteId,
          isPublished: true,
          theme: themeId,
          year: { in: [firstYear, secondYear] },
          contentLanguage: { in: productLanguages },
        },
        select: { id: true, year: true, contentLanguage: true },
      });

      if (products.length === 0) {
        results.push({ theme: themeId, skipped: true, error: 'No products found' });
        continue;
      }

      // Determine content language: if only one language is selected, set it; otherwise null (all shops)
      const bundleContentLanguage = productLanguages.length === 1 ? productLanguages[0] : null;

      // Determine which languages to create slugs for
      const slugLanguages = bundleContentLanguage ? [bundleContentLanguage] : translationLanguages;

      // Check if bundle already exists for this theme/year combo (no language suffix in slug)
      const baseSlug = `${slugify(themeId)}-${firstYear}-${secondYear}-bundle`;

      // Check for conflicting slugs - only conflict if content languages overlap
      let hasConflict = false;
      for (const lang of slugLanguages) {
        const existingSlugRoute = await prisma.slugRoute.findUnique({
          where: { siteId_languageCode_slug: { siteId, languageCode: lang, slug: baseSlug } },
          include: { bundle: { select: { contentLanguage: true } } },
        });

        if (existingSlugRoute) {
          const existingContentLang = existingSlugRoute.bundle?.contentLanguage;
          // Conflict if: both null, both same, or one is null
          const hasOverlap = !bundleContentLanguage || !existingContentLang || bundleContentLanguage === existingContentLang;
          if (hasOverlap) {
            hasConflict = true;
            break;
          }
        }
      }

      if (hasConflict) {
        results.push({ theme: themeId, skipped: true, error: 'Bundle with conflicting slug already exists' });
        continue;
      }

      if (dryRun) {
        results.push({
          theme: themeId,
          skipped: false,
          error: `Would create bundle with ${products.length} products`,
        });
        continue;
      }

      // Generate unique download code
      let downloadCode = generateDownloadCode();
      let attempts = 0;
      while (await prisma.bundle.findUnique({ where: { downloadCode } })) {
        downloadCode = generateDownloadCode();
        attempts++;
        if (attempts > 10) {
          results.push({ theme: themeId, error: 'Failed to generate download code' });
          continue;
        }
      }

      // Create bundle with translations
      try {
        const bundle = await prisma.$transaction(async (tx) => {
          const newBundle = await tx.bundle.create({
            data: {
              siteId,
              discountPercent: pricingType === 'discount' ? discountPercent : null,
              fixedPriceInCents: pricingType === 'fixed' ? Math.round(fixedPrice * 100) : null,
              currency: 'EUR',
              contentLanguage: bundleContentLanguage,
              theme: themeId,
              isAllAccess: false,
              downloadCode,
              isPublished,
              isFeatured: false,
              publishedAt: isPublished ? new Date() : null,
              images: [],
              translations: {
                create: translationLanguages.map((lang) => {
                  const themeName = getThemeName(themeId, lang);
                  const replaceVars = (template: string) =>
                    template
                      .replace(/\{\{theme\}\}/g, themeName)
                      .replace(/\{\{firstYear\}\}/g, String(firstYear))
                      .replace(/\{\{secondYear\}\}/g, String(secondYear));
                  return {
                    languageCode: lang,
                    name: replaceVars(nameTemplates[lang]),
                    description: replaceVars(descriptionTemplates[lang]),
                    seoTitle: replaceVars(seoTitleTemplates[lang]),
                    seoDescription: replaceVars(seoDescriptionTemplates[lang]),
                  };
                }),
              },
              items: {
                create: products.map((p) => ({ productId: p.id })),
              },
            },
          });

          // Create slugs only for relevant languages based on contentLanguage
          for (const lang of slugLanguages) {
            await tx.slugRoute.create({
              data: {
                siteId,
                languageCode: lang,
                slug: baseSlug,
                entityType: 'bundle',
                bundleId: newBundle.id,
                isPrimary: true,
              },
            });
          }

          return newBundle;
        });

        results.push({ theme: themeId, bundleId: bundle.id });
      } catch (err) {
        console.error(`Error creating bundle for ${themeId}:`, err);
        results.push({ theme: themeId, error: String(err) });
      }
    }

    const created = results.filter((r) => r.bundleId).length;
    const skipped = results.filter((r) => r.skipped).length;
    const errors = results.filter((r) => r.error && !r.skipped).length;

    return NextResponse.json({
      success: true,
      summary: { created, skipped, errors, total: themeIds.length },
      results,
    });
  } catch (error) {
    console.error('Error generating theme bundles:', error);
    return NextResponse.json(
      { error: 'Failed to generate theme bundles' },
      { status: 500 }
    );
  }
}
