import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface ProductTranslation {
  languageCode: string;
  name: string | null;
  description: string | null;
}

interface TemplateTranslation {
  languageCode: string;
  name: string;
  description: string | null;
}

interface BundleTranslation {
  languageCode: string;
  name: string;
  description: string | null;
}

// Helper to get translation for a specific language
function getTranslation<T extends { languageCode: string; name: string | null }>(
  translations: T[],
  langCode: string
): string {
  const t = translations.find((tr) => tr.languageCode === langCode);
  return t?.name || translations[0]?.name || '';
}

// Helper to get slug for a specific language
function getSlug(slugs: SlugRoute[], langCode: string): string {
  const s = slugs.find((sl) => sl.languageCode === langCode);
  return s?.slug || slugs[0]?.slug || '';
}

// Helper to get product name (from template or product translations)
function getProductName(
  product: {
    template?: { translations: TemplateTranslation[] } | null;
    translations: ProductTranslation[];
  },
  langCode: string
): string {
  if (product.template) {
    return getTranslation(product.template.translations, langCode);
  }
  return getTranslation(product.translations, langCode) || 'Standalone Product';
}

// Helper to get file properties (from template or empty object)
function getFileProperties(
  product: { template?: { fileProperties: unknown } | null }
): unknown {
  return product.template?.fileProperties || {};
}

function isValidDownloadCode(code: string): boolean {
  return /^LBL[0-9A-Fa-f]{8}$/i.test(code);
}

function normalizeDownloadCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accessCode = searchParams.get('code');
  const lang = searchParams.get('lang') || 'en';

  if (!accessCode) {
    return NextResponse.json(
      { error: 'Access code is required' },
      { status: 400 }
    );
  }

  const normalizedCode = normalizeDownloadCode(accessCode);

  if (!isValidDownloadCode(normalizedCode)) {
    return NextResponse.json(
      { error: 'Invalid access code format' },
      { status: 400 }
    );
  }

  // Try to find a product with this download code
  const product = await prisma.product.findUnique({
    where: { downloadCode: normalizedCode },
    include: {
      template: {
        include: {
          translations: true,
          slugs: { where: { isPrimary: true } },
        },
      },
      translations: true,
      slugs: { where: { isPrimary: true } },
      files: true,
    },
  });

  if (product && product.isPublished) {
    return NextResponse.json({
      type: 'product',
      products: [
        {
          id: product.id,
          slug: getSlug(product.slugs, lang),
          slugs: product.slugs,
          name: getProductName(product, lang),
          translations: product.translations,
          year: product.year,
          theme: product.theme,
          contentLanguage: product.contentLanguage,
          fileProperties: getFileProperties(product),
          files: product.files.map((f) => ({
            id: f.id,
            templateSet: f.templateSet,
            timeFormat: f.timeFormat,
            weekStart: f.weekStart,
            calendar: f.calendar,
            fileName: f.fileName,
            fileSize: f.fileSize,
          })),
        },
      ],
    });
  }

  // Try to find a bundle with this download code
  const bundle = await prisma.bundle.findUnique({
    where: { downloadCode: normalizedCode },
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
      items: {
        include: {
          product: {
            include: {
              template: {
                include: {
                  translations: true,
                  slugs: { where: { isPrimary: true } },
                },
              },
              translations: true,
              slugs: { where: { isPrimary: true } },
              files: true,
            },
          },
        },
      },
    },
  });

  if (bundle && bundle.isPublished) {
    let products: Array<{
      id: number;
      slug: string;
      slugs: SlugRoute[];
      name: string;
      translations: ProductTranslation[];
      year: number | null;
      theme: string | null;
      contentLanguage: string | null;
      fileProperties: unknown;
      files: Array<{
        id: number;
        templateSet: string | null;
        timeFormat: string | null;
        weekStart: string | null;
        calendar: string | null;
        fileName: string;
        fileSize: number | null;
      }>;
    }> = [];

    if (bundle.isAllAccess) {
      // Get all published products
      const allProducts = await prisma.product.findMany({
        where: { isPublished: true },
        include: {
          template: {
            include: {
              translations: true,
              slugs: { where: { isPrimary: true } },
            },
          },
          translations: true,
          slugs: { where: { isPrimary: true } },
          files: true,
        },
        orderBy: [{ createdAt: 'desc' }],
      });

      products = allProducts.map((p) => ({
        id: p.id,
        slug: getSlug(p.slugs, lang),
        slugs: p.slugs,
        name: getProductName(p, lang),
        translations: p.translations,
        year: p.year,
        theme: p.theme,
        contentLanguage: p.contentLanguage,
        fileProperties: getFileProperties(p),
        files: p.files.map((f) => ({
          id: f.id,
          templateSet: f.templateSet,
          timeFormat: f.timeFormat,
          weekStart: f.weekStart,
          calendar: f.calendar,
          fileName: f.fileName,
          fileSize: f.fileSize,
        })),
      }));
    } else {
      // Collect products from bundle items
      const productMap = new Map<number, (typeof products)[0]>();

      for (const item of bundle.items) {
        if (item.product && item.product.isPublished) {
          productMap.set(item.product.id, {
            id: item.product.id,
            slug: getSlug(item.product.slugs, lang),
            slugs: item.product.slugs,
            name: getProductName(item.product, lang),
            translations: item.product.translations,
            year: item.product.year,
            theme: item.product.theme,
            contentLanguage: item.product.contentLanguage,
            fileProperties: getFileProperties(item.product),
            files: item.product.files.map((f) => ({
              id: f.id,
              templateSet: f.templateSet,
              timeFormat: f.timeFormat,
              weekStart: f.weekStart,
              calendar: f.calendar,
              fileName: f.fileName,
              fileSize: f.fileSize,
            })),
          });
        }

      }

      products = Array.from(productMap.values());
    }

    return NextResponse.json({
      type: 'bundle',
      bundleName: getTranslation(bundle.translations, lang),
      bundleSlugs: bundle.slugs,
      isAllAccess: bundle.isAllAccess,
      products,
    });
  }

  return NextResponse.json(
    { error: 'Access code not found' },
    { status: 404 }
  );
}
