import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { generateDownloadCode } from '@/lib/download-code';
import { siteConfig } from '@/config/site';

// All Access bundle translations
const translations: Record<string, { name: string; description: string; seoTitle: string; seoDescription: string }> = {
  en: {
    name: 'All Access Bundle',
    description: 'Access to all published products, current and future.',
    seoTitle: `All Access Bundle${siteConfig.separator}${siteConfig.name}`,
    seoDescription: 'Get lifetime access to all digital planners and calendars. Includes all current and future products.',
  },
  nl: {
    name: 'Alles-in-één Bundel',
    description: 'Toegang tot alle gepubliceerde producten, nu en in de toekomst.',
    seoTitle: `Alles-in-één Bundel${siteConfig.separator}${siteConfig.name}`,
    seoDescription: 'Krijg levenslange toegang tot alle digitale planners en kalenders. Inclusief alle huidige en toekomstige producten.',
  },
  de: {
    name: 'All Access Paket',
    description: 'Zugriff auf alle veröffentlichten Produkte – jetzt und in Zukunft.',
    seoTitle: `All Access Paket${siteConfig.separator}${siteConfig.name}`,
    seoDescription: 'Erhalten Sie lebenslangen Zugang zu allen digitalen Planern und Kalendern. Enthält alle aktuellen und zukünftigen Produkte.',
  },
  fr: {
    name: 'Pack Accès Total',
    description: 'Accès à tous les produits publiés, actuels et futurs.',
    seoTitle: `Pack Accès Total${siteConfig.separator}${siteConfig.name}`,
    seoDescription: 'Obtenez un accès à vie à tous les planificateurs et calendriers numériques. Inclut tous les produits actuels et futurs.',
  },
  es: {
    name: 'Paquete Acceso Total',
    description: 'Acceso a todos los productos publicados, actuales y futuros.',
    seoTitle: `Paquete Acceso Total${siteConfig.separator}${siteConfig.name}`,
    seoDescription: 'Obtén acceso de por vida a todos los planificadores y calendarios digitales. Incluye todos los productos actuales y futuros.',
  },
  it: {
    name: 'Pacchetto Accesso Totale',
    description: 'Accesso a tutti i prodotti pubblicati, attuali e futuri.',
    seoTitle: `Pacchetto Accesso Totale${siteConfig.separator}${siteConfig.name}`,
    seoDescription: 'Ottieni accesso a vita a tutti i planner e calendari digitali. Include tutti i prodotti attuali e futuri.',
  },
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// POST /api/admin/bundles/generate-all-access
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  try {
    const body = await request.json();
    const {
      fixedPrice = 49.99,
      isPublished = false,
      dryRun = false,
    } = body as {
      fixedPrice?: number;
      isPublished?: boolean;
      dryRun?: boolean;
    };

    // Check if an All Access bundle already exists for this store
    const existingBundle = await prisma.bundle.findFirst({
      where: { siteId, isAllAccess: true },
    });

    if (existingBundle) {
      return NextResponse.json({
        success: false,
        error: 'An All Access bundle already exists',
        existingBundleId: existingBundle.id,
      }, { status: 400 });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: 'Would create All Access bundle',
        dryRun: true,
      });
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

    // Create the All Access bundle with translations
    const translationLanguages = Object.keys(translations);

    const bundle = await prisma.$transaction(async (tx) => {
      const newBundle = await tx.bundle.create({
        data: {
          siteId,
          discountPercent: null,
          fixedPriceInCents: Math.round(fixedPrice * 100),
          currency: 'EUR',
          theme: 'premium_gold', // Special theme for All Access
          isAllAccess: true,
          downloadCode,
          isPublished,
          isFeatured: true, // All Access should be featured
          publishedAt: isPublished ? new Date() : null,
          images: [],
          translations: {
            create: translationLanguages.map((lang) => ({
              languageCode: lang,
              name: translations[lang].name,
              description: translations[lang].description,
              seoTitle: translations[lang].seoTitle,
              seoDescription: translations[lang].seoDescription,
            })),
          },
          // No items needed for All Access - isAllAccess flag grants access to everything
        },
      });

      // Create slugs for each language
      for (const lang of translationLanguages) {
        const slug = slugify(translations[lang].name);

        // Check if slug exists
        const existing = await tx.slugRoute.findUnique({
          where: { siteId_languageCode_slug: { siteId, languageCode: lang, slug } },
        });

        if (!existing) {
          await tx.slugRoute.create({
            data: {
              siteId,
              languageCode: lang,
              slug,
              entityType: 'bundle',
              bundleId: newBundle.id,
              isPrimary: true,
            },
          });
        }
      }

      return newBundle;
    });

    return NextResponse.json({
      success: true,
      bundleId: bundle.id,
      message: 'All Access bundle created successfully',
    });
  } catch (error) {
    console.error('Error generating All Access bundle:', error);
    return NextResponse.json(
      { error: 'Failed to generate All Access bundle' },
      { status: 500 }
    );
  }
}
