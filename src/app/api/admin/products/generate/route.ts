import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { generateDownloadCode } from '@/lib/download-code';
import { themes, getThemeName, getThemesByCategory, getAllProductThemes } from '@/config/themes';
import { autoLinkFilesForProduct } from '@/lib/product-files';

// Language display names for product naming (UI language -> content language -> display name)
const languageDisplayNames: Record<string, Record<string, string>> = {
  en: { en: 'English', nl: 'Dutch', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian' },
  nl: { en: 'Engels', nl: 'Nederlands', de: 'Duits', fr: 'Frans', es: 'Spaans', it: 'Italiaans' },
  de: { en: 'Englisch', nl: 'Niederländisch', de: 'Deutsch', fr: 'Französisch', es: 'Spanisch', it: 'Italienisch' },
  fr: { en: 'Anglais', nl: 'Néerlandais', de: 'Allemand', fr: 'Français', es: 'Espagnol', it: 'Italien' },
  es: { en: 'Inglés', nl: 'Neerlandés', de: 'Alemán', fr: 'Francés', es: 'Español', it: 'Italiano' },
  it: { en: 'Inglese', nl: 'Olandese', de: 'Tedesco', fr: 'Francese', es: 'Spagnolo', it: 'Italiano' },
};

// Name templates: {{year}} {{theme}} ({{language}})
const nameTemplates: Record<string, string> = {
  en: '{{year}} {{theme}} Planner ({{language}})',
  nl: '{{year}} {{theme}} Planner ({{language}})',
  de: '{{year}} {{theme}} Planner ({{language}})',
  fr: 'Planificateur {{theme}} {{year}} ({{language}})',
  es: 'Planificador {{theme}} {{year}} ({{language}})',
  it: 'Planner {{theme}} {{year}} ({{language}})',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// POST /api/admin/products/generate
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
      year,
      productLanguages = ['en', 'nl'],
      priceInCents = 899,
      isPublished = false,
      dryRun = false,
    } = body as {
      templateId: number;
      year: number;
      productLanguages?: string[];
      priceInCents?: number;
      isPublished?: boolean;
      dryRun?: boolean;
    };

    if (!templateId || !year) {
      return NextResponse.json(
        { error: 'templateId and year are required' },
        { status: 400 }
      );
    }

    // Verify template exists, including template slugs for URL generation
    const template = await prisma.productTemplate.findUnique({
      where: { id: templateId },
      include: { slugs: { where: { isPrimary: true } } },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 400 });
    }

    // Helper to get template slug for a language
    const getTemplateSlug = (langCode: string): string => {
      const slug = template.slugs.find((s) => s.languageCode === langCode);
      return slug?.slug || template.slugs[0]?.slug || 'product';
    };

    // Get theme IDs based on template configuration
    let themeIds: string[];
    if (template.themeSelection === 'specific' && template.selectedThemes.length > 0) {
      // Use only the themes selected in the template
      themeIds = template.selectedThemes;
    } else if (template.themeSelection === 'tablet') {
      // Use only tablet themes
      themeIds = getThemesByCategory('tablet');
    } else if (template.themeSelection === 'e_ink') {
      // Use only e-ink themes
      themeIds = getThemesByCategory('e_ink');
    } else if (template.themeSelection === 'filofax') {
      // Use only filofax themes
      themeIds = getThemesByCategory('filofax');
    } else {
      // Use all product themes (excludes bundles)
      themeIds = getAllProductThemes();
    }
    const translationLanguages = ['en', 'nl', 'de', 'fr', 'es', 'it'];
    const results: { theme: string; language: string; productId?: number; filesLinked?: number; error?: string; skipped?: boolean }[] = [];

    for (const themeId of themeIds) {
      for (const productLang of productLanguages) {
        // Check if product already exists for this theme/year/language combo
        const existingProduct = await prisma.product.findFirst({
          where: {
            siteId,
            templateId,
            theme: themeId,
            year,
            contentLanguage: productLang,
          },
        });

        if (existingProduct) {
          results.push({
            theme: themeId,
            language: productLang,
            skipped: true,
            error: 'Product already exists',
          });
          continue;
        }

        if (dryRun) {
          results.push({
            theme: themeId,
            language: productLang,
            skipped: false,
            error: 'Would create product',
          });
          continue;
        }

        // Generate unique download code
        let downloadCode = generateDownloadCode();
        let attempts = 0;
        while (await prisma.product.findUnique({ where: { downloadCode } })) {
          downloadCode = generateDownloadCode();
          attempts++;
          if (attempts > 10) {
            results.push({
              theme: themeId,
              language: productLang,
              error: 'Failed to generate download code',
            });
            continue;
          }
        }

        try {
          const product = await prisma.$transaction(async (tx) => {
            // Create product with translations
            const newProduct = await tx.product.create({
              data: {
                siteId,
                templateId,
                year,
                theme: themeId,
                contentLanguage: productLang,
                productType: template.productType,
                device: template.device,
                orientation: template.orientation,
                templateVariables: {},
                priceInCents,
                currency: 'EUR',
                downloadCode,
                isPublished,
                isFeatured: false,
                publishedAt: isPublished ? new Date() : null,
                images: [],
                translations: {
                  create: translationLanguages.map((uiLang) => {
                    const themeName = getThemeName(themeId, uiLang);
                    const langDisplayName = languageDisplayNames[uiLang]?.[productLang] || productLang.toUpperCase();
                    return {
                      languageCode: uiLang,
                      name: nameTemplates[uiLang]
                        .replace('{{year}}', String(year))
                        .replace('{{theme}}', themeName)
                        .replace('{{language}}', langDisplayName),
                      description: null,
                    };
                  }),
                },
              },
            });

            // Create ONE slug for the product's content language
            // Format: {template-name}-{theme}-{device}
            // Example: clarity-planner-soft-rose-ipad
            // The slug is unique per languageCode, so different content language products
            // can have the same slug text but different languageCode
            const templateSlug = getTemplateSlug(productLang);
            const themeName = getThemeName(themeId, 'en'); // Use English theme name for slugs
            const devicePart = template.device || '';
            const slug = slugify(`${templateSlug}-${themeName}-${devicePart}`);

            // Check if slug exists for this language
            const existing = await tx.slugRoute.findUnique({
              where: { siteId_languageCode_slug: { siteId, languageCode: productLang, slug } },
            });

            if (!existing) {
              await tx.slugRoute.create({
                data: {
                  siteId,
                  languageCode: productLang,
                  slug,
                  entityType: 'product',
                  productId: newProduct.id,
                  isPrimary: true,
                },
              });
            }

            return newProduct;
          });

          // Auto-link files for the product
          let filesLinked = 0;
          try {
            filesLinked = await autoLinkFilesForProduct(product.id);
          } catch (linkErr) {
            console.error(`Error linking files for product ${product.id}:`, linkErr);
          }

          results.push({
            theme: themeId,
            language: productLang,
            productId: product.id,
            filesLinked,
          });
        } catch (err) {
          console.error(`Error creating product for ${themeId}/${productLang}:`, err);
          results.push({
            theme: themeId,
            language: productLang,
            error: String(err),
          });
        }
      }
    }

    const created = results.filter((r) => r.productId).length;
    const skipped = results.filter((r) => r.skipped).length;
    const errors = results.filter((r) => r.error && !r.skipped).length;

    return NextResponse.json({
      success: true,
      summary: {
        created,
        skipped,
        errors,
        total: themeIds.length * productLanguages.length,
      },
      results,
    });
  } catch (error) {
    console.error('Error generating products:', error);
    return NextResponse.json(
      { error: 'Failed to generate products' },
      { status: 500 }
    );
  }
}
