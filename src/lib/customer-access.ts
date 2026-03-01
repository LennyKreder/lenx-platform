import 'server-only';
import { prisma } from '@/lib/prisma';
import { replaceTemplateVariables } from '@/lib/template-variables';

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

export interface AccessibleProduct {
  id: number;
  slugs: SlugRoute[];
  templateName: string;
  translations: ProductTranslation[];
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
  downloadCode: string;
  hasFiles: boolean;
  images: string[];
}

// Helper to get template name for a specific language
function getTemplateName(translations: TemplateTranslation[], langCode: string = 'en'): string {
  const t = translations.find((tr) => tr.languageCode === langCode);
  return t?.name || translations[0]?.name || '';
}

// Helper to get product name (from template or product translations for standalone)
function getProductName(
  product: {
    template?: { translations: TemplateTranslation[] } | null;
    translations: ProductTranslation[];
    templateVariables?: unknown;
    year?: number | null;
    theme?: string | null;
    contentLanguage?: string | null;
  },
  langCode: string = 'en'
): string {
  let rawName: string;
  if (product.template) {
    rawName = getTemplateName(product.template.translations, langCode);
  } else {
    const t = product.translations.find((tr) => tr.languageCode === langCode);
    rawName = t?.name || product.translations[0]?.name || 'Standalone Product';
  }
  const productVars = (product.templateVariables || {}) as Record<string, string>;
  const builtIn = { year: product.year ?? null, theme: product.theme ?? null, language: product.contentLanguage ?? null };
  return replaceTemplateVariables(rawName, productVars, builtIn);
}

/**
 * Get all products accessible via a download code (product or bundle)
 */
export async function getAccessibleProductsByCode(downloadCode: string): Promise<AccessibleProduct[]> {
  // Try product first
  const product = await prisma.product.findUnique({
    where: { downloadCode },
    include: {
      template: {
        include: {
          translations: true,
        },
      },
      translations: true,
      slugs: { where: { isPrimary: true } },
      _count: { select: { files: true } },
    },
  });

  if (product && product.isPublished) {
    return [
      {
        id: product.id,
        slugs: product.slugs,
        templateName: getProductName(product),
        translations: product.translations,
        year: product.year,
        theme: product.theme,
        contentLanguage: product.contentLanguage,
        downloadCode: product.downloadCode,
        hasFiles: product._count.files > 0,
        images: (product.images as string[]) || [],
      },
    ];
  }

  // Try bundle
  const bundle = await prisma.bundle.findUnique({
    where: { downloadCode },
    include: {
      items: {
        include: {
          product: {
            include: {
              template: {
                include: {
                  translations: true,
                },
              },
              translations: true,
              slugs: { where: { isPrimary: true } },
              _count: { select: { files: true } },
            },
          },
        },
      },
    },
  });

  if (!bundle || !bundle.isPublished) {
    return [];
  }

  if (bundle.isAllAccess) {
    const allProducts = await prisma.product.findMany({
      where: { isPublished: true },
      include: {
        template: {
          include: {
            translations: true,
          },
        },
        translations: true,
        slugs: { where: { isPrimary: true } },
        _count: { select: { files: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return allProducts.map((p) => ({
      id: p.id,
      slugs: p.slugs,
      templateName: getProductName(p),
      translations: p.translations,
      year: p.year,
      theme: p.theme,
      contentLanguage: p.contentLanguage,
      downloadCode: p.downloadCode,
      hasFiles: p._count.files > 0,
      images: (p.images as string[]) || [],
    }));
  }

  // Collect products from bundle items
  const productMap = new Map<number, AccessibleProduct>();

  for (const item of bundle.items) {
    if (item.product && item.product.isPublished) {
      productMap.set(item.product.id, {
        id: item.product.id,
        slugs: item.product.slugs,
        templateName: getProductName(item.product),
        translations: item.product.translations,
        year: item.product.year,
        theme: item.product.theme,
        contentLanguage: item.product.contentLanguage,
        downloadCode: item.product.downloadCode,
        hasFiles: item.product._count.files > 0,
        images: (item.product.images as string[]) || [],
      });
    }

  }

  return Array.from(productMap.values());
}

/**
 * Get all products accessible by a customer via their CustomerAccess records
 */
export async function getAccessibleProductsByCustomer(customerId: number): Promise<AccessibleProduct[]> {
  const access = await prisma.customerAccess.findMany({
    where: { customerId },
    include: {
      product: {
        include: {
          template: {
            include: {
              translations: true,
            },
          },
          translations: true,
          slugs: { where: { isPrimary: true } },
          _count: { select: { files: true } },
        },
      },
      bundle: {
        include: {
          items: {
            include: {
              product: {
                include: {
                  template: {
                    include: {
                      translations: true,
                    },
                  },
                  translations: true,
                  slugs: { where: { isPrimary: true } },
                  _count: { select: { files: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const productMap = new Map<number, AccessibleProduct>();

  for (const item of access) {
    // Direct product access
    if (item.product && item.product.isPublished) {
      productMap.set(item.product.id, {
        id: item.product.id,
        slugs: item.product.slugs,
        templateName: getProductName(item.product),
        translations: item.product.translations,
        year: item.product.year,
        theme: item.product.theme,
        contentLanguage: item.product.contentLanguage,
        downloadCode: item.product.downloadCode,
        hasFiles: item.product._count.files > 0,
        images: (item.product.images as string[]) || [],
      });
    }

    // Bundle access
    if (item.bundle && item.bundle.isPublished) {
      if (item.bundle.isAllAccess) {
        // All access bundle - get all published products
        const allProducts = await prisma.product.findMany({
          where: { isPublished: true },
          include: {
            template: {
              include: {
                translations: true,
              },
            },
            translations: true,
            slugs: { where: { isPrimary: true } },
            _count: { select: { files: true } },
          },
        });

        for (const p of allProducts) {
          if (!productMap.has(p.id)) {
            productMap.set(p.id, {
              id: p.id,
              slugs: p.slugs,
              templateName: getProductName(p),
              translations: p.translations,
              year: p.year,
              theme: p.theme,
              contentLanguage: p.contentLanguage,
              downloadCode: p.downloadCode,
              hasFiles: p._count.files > 0,
              images: (p.images as string[]) || [],
            });
          }
        }
      } else {
        // Regular bundle - get products from bundle items
        for (const bundleItem of item.bundle.items) {
          if (bundleItem.product && bundleItem.product.isPublished) {
            if (!productMap.has(bundleItem.product.id)) {
              productMap.set(bundleItem.product.id, {
                id: bundleItem.product.id,
                slugs: bundleItem.product.slugs,
                templateName: getProductName(bundleItem.product),
                translations: bundleItem.product.translations,
                year: bundleItem.product.year,
                theme: bundleItem.product.theme,
                contentLanguage: bundleItem.product.contentLanguage,
                downloadCode: bundleItem.product.downloadCode,
                hasFiles: bundleItem.product._count.files > 0,
                images: (bundleItem.product.images as string[]) || [],
              });
            }
          }

        }
      }
    }
  }

  return Array.from(productMap.values());
}

/**
 * Check if a customer or download code has access to a specific product
 */
export async function hasAccessToProduct(
  productId: number,
  options: { customerId?: number; downloadCode?: string }
): Promise<boolean> {
  const { customerId, downloadCode } = options;

  if (downloadCode) {
    const products = await getAccessibleProductsByCode(downloadCode);
    return products.some((p) => p.id === productId);
  }

  if (customerId) {
    const products = await getAccessibleProductsByCustomer(customerId);
    return products.some((p) => p.id === productId);
  }

  return false;
}
