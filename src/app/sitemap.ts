import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { productTypes } from '@/config/product-types';
import { getActiveLocales } from '@/lib/settings';
import { translatePath } from '@/lib/route-slugs';
import { type Locale } from '@/lib/i18n';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getSiteFromHeaders();
  const BASE_URL = getSiteBaseUrl(site);
  const activeLocales = await getActiveLocales(site.id);
  const entries: MetadataRoute.Sitemap = [];

  // Helper to build hreflang alternates (only for active locales)
  function buildAlternates(path: string) {
    const languages: Record<string, string> = {};
    for (const loc of activeLocales) {
      const translatedPath = translatePath(path, loc as Locale);
      if (loc === 'nl') {
        languages['nl-NL'] = `${BASE_URL}/nl${translatedPath}`;
        languages['nl-BE'] = `${BASE_URL}/nl${translatedPath}`;
      } else {
        languages[loc] = `${BASE_URL}/${loc}${translatedPath}`;
      }
    }
    languages['x-default'] = `${BASE_URL}/en${path}`;
    return { languages };
  }

  // Static pages (filtered by site features)
  const staticPages = [
    { path: '', changeFrequency: 'weekly' as const, priority: 1.0 },
    { path: '/shop', changeFrequency: 'daily' as const, priority: 0.9 },
    { path: '/shop/planners', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/shop/printables', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/shop/notebooks', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/shop/templates', changeFrequency: 'weekly' as const, priority: 0.8 },
    ...(site.hasBundles ? [{ path: '/shop/bundles', changeFrequency: 'weekly' as const, priority: 0.8 }] : []),
    ...(site.hasBlog ? [{ path: '/blog', changeFrequency: 'weekly' as const, priority: 0.7 }] : []),
    { path: '/about', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/contact', changeFrequency: 'monthly' as const, priority: 0.5 },
    ...(site.siteType === 'digital' ? [{ path: '/how-to-import', changeFrequency: 'monthly' as const, priority: 0.5 }] : []),
    { path: '/terms', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/privacy-policy', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/return-policy', changeFrequency: 'monthly' as const, priority: 0.3 },
  ];

  for (const locale of activeLocales) {
    for (const page of staticPages) {
      const translatedPath = translatePath(page.path, locale as Locale);
      entries.push({
        url: `${BASE_URL}/${locale}${translatedPath}`,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: buildAlternates(page.path),
      });
    }
  }

  // Product pages (using productType-based URLs)
  // Slugs are shared across years (format: {template}-{theme}-{device}), so products
  // for newer years may not have their own slug entries. We resolve slugs from sibling
  // products (same template/theme/device/language) when a product has no direct slugs.
  const products = await prisma.product.findMany({
    where: { siteId: site.id, isPublished: true },
    include: {
      slugs: { where: { isPrimary: true } },
    },
  });

  const activeLocaleSet = new Set<string>(activeLocales);

  // Build a lookup: "templateId-theme-device-contentLanguage" → slug text per locale
  const slugLookup = new Map<string, Map<string, string>>();
  for (const product of products) {
    for (const slugRoute of product.slugs) {
      const key = `${product.templateId}-${product.theme}-${product.device}-${product.contentLanguage}`;
      if (!slugLookup.has(key)) slugLookup.set(key, new Map());
      slugLookup.get(key)!.set(slugRoute.languageCode, slugRoute.slug);
    }
  }

  for (const product of products) {
    const key = `${product.templateId}-${product.theme}-${product.device}-${product.contentLanguage}`;
    const siblingSlugsByLocale = slugLookup.get(key);

    // Use direct slugs if available, otherwise fall back to sibling slugs
    const localesWithSlug = new Map<string, string>();
    for (const slugRoute of product.slugs) {
      if (activeLocaleSet.has(slugRoute.languageCode)) {
        localesWithSlug.set(slugRoute.languageCode, slugRoute.slug);
      }
    }

    // Fill in missing locales from sibling products
    if (siblingSlugsByLocale) {
      for (const [locale, slug] of siblingSlugsByLocale) {
        if (!localesWithSlug.has(locale) && activeLocaleSet.has(locale)) {
          localesWithSlug.set(locale, slug);
        }
      }
    }

    const typeConfig = product.productType
      ? productTypes[product.productType as keyof typeof productTypes]
      : null;
    const urlSegment = typeConfig?.urlSegment || 'planners';
    const isDated = typeConfig?.dated ?? true;

    for (const [locale, slug] of localesWithSlug) {
      let path: string;
      if (isDated) {
        const yearSegment = product.year ? String(product.year) : 'undated';
        path = `/shop/${urlSegment}/${yearSegment}/${slug}`;
      } else {
        path = `/shop/${urlSegment}/${slug}`;
      }

      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  // Bundle pages
  const bundles = await prisma.bundle.findMany({
    where: { siteId: site.id, isPublished: true },
    include: {
      slugs: { where: { isPrimary: true } },
    },
  });

  for (const bundle of bundles) {
    for (const slug of bundle.slugs) {
      // Only include slugs for active locales
      if (!activeLocaleSet.has(slug.languageCode)) {
        continue;
      }

      entries.push({
        url: `${BASE_URL}/${slug.languageCode}/shop/bundles/${slug.slug}`,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  // Blog posts
  const blogPosts = await prisma.blogPost.findMany({
    where: {
      siteId: site.id,
      isPublished: true,
      publishedAt: { not: null, lte: new Date() },
    },
    select: {
      slug: true,
      updatedAt: true,
    },
  });

  for (const post of blogPosts) {
    for (const locale of activeLocales) {
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: buildAlternates(`/blog/${post.slug}`),
      });
    }
  }

  return entries;
}
