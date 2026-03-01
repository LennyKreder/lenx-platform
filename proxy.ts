import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Locale definitions (keep in sync with src/lib/i18n.ts)
const VALID_LOCALES = new Set(['en', 'nl', 'de', 'fr', 'es', 'it']);

function isValidLocale(locale: string): boolean {
  return VALID_LOCALES.has(locale);
}

// Paths that should not be localized
const publicPaths = ['/api', '/_next', '/favicon.ico', '/images', '/previews', '/uploads'];

// Domain → site mapping (keep in sync with prisma/seed.ts)
const domainToSite: Record<string, { id: string; code: string; defaultLocale: string; locales: string[] }> = {
  'layoutsbylenny.com':      { id: '00000000-0000-0000-0000-000000000001', code: 'lbl', defaultLocale: 'en', locales: ['en', 'nl'] },
  'matcare.nl':              { id: '00000000-0000-0000-0000-000000000002', code: 'matcare', defaultLocale: 'nl', locales: ['nl', 'en', 'de', 'fr'] },
  'matcare.com':             { id: '00000000-0000-0000-0000-000000000002', code: 'matcare', defaultLocale: 'nl', locales: ['nl', 'en', 'de', 'fr'] },
  'clariz.nl':               { id: '00000000-0000-0000-0000-000000000003', code: 'clariz', defaultLocale: 'nl', locales: ['nl'] },
  'jellybeannailpolish.nl':  { id: '00000000-0000-0000-0000-000000000004', code: 'jellybean', defaultLocale: 'nl', locales: ['nl'] },
  // Local development aliases
  'matcare.localhost':       { id: '00000000-0000-0000-0000-000000000002', code: 'matcare', defaultLocale: 'nl', locales: ['nl', 'en', 'de', 'fr'] },
  'clariz.localhost':        { id: '00000000-0000-0000-0000-000000000003', code: 'clariz', defaultLocale: 'nl', locales: ['nl'] },
  'jellybean.localhost':     { id: '00000000-0000-0000-0000-000000000004', code: 'jellybean', defaultLocale: 'nl', locales: ['nl'] },
};

const defaultSite = domainToSite['layoutsbylenny.com'];

// Internal slug → translated slug per locale (keep in sync with src/lib/route-slugs.ts)
const routeTranslations: Record<string, Record<string, string>> = {
  'terms':          { nl: 'algemene-voorwaarden' },
  'return-policy':  { nl: 'retourbeleid' },
  'privacy-policy': { nl: 'privacybeleid' },
  'about':          { nl: 'over-ons' },
};

// Reverse map: { nl: { 'algemene-voorwaarden': 'terms', ... } }
const reverseMap: Record<string, Record<string, string>> = {};
for (const [internal, translations] of Object.entries(routeTranslations)) {
  for (const [locale, translated] of Object.entries(translations)) {
    if (!reverseMap[locale]) reverseMap[locale] = {};
    reverseMap[locale][translated] = internal;
  }
}

function resolveSite(host: string) {
  const domain = host.split(':')[0].toLowerCase();
  return domainToSite[domain] || defaultSite;
}

function getLocaleFromRequest(request: NextRequest, site: typeof defaultSite): string {
  // Check for locale cookie first
  const localeCookie = request.cookies.get('locale')?.value;
  if (localeCookie && isValidLocale(localeCookie)) {
    return localeCookie;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferredLocales = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().substring(0, 2).toLowerCase());

    for (const preferred of preferredLocales) {
      if (isValidLocale(preferred)) {
        return preferred;
      }
    }
  }

  return site.defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || 'localhost';
  const site = resolveSite(host);

  // Inject site context headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-site-id', site.id);
  requestHeaders.set('x-site-code', site.code);

  // Skip public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Skip root-level static files (e.g. google verification, robots.txt, sitemap.xml)
  if (pathname.match(/^\/[^/]+\.\w+$/)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Strip trailing slashes (except root "/")
  if (pathname !== '/' && pathname.endsWith('/')) {
    const newUrl = new URL(pathname.slice(0, -1), request.url);
    newUrl.search = request.nextUrl.search;
    return NextResponse.redirect(newUrl, 308);
  }

  // Check if the pathname already has a locale
  const pathnameHasLocale = [...VALID_LOCALES].some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Handle translated slug rewrites
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const locale = segments[0];
      const slug = segments[1];

      // Translated slug → rewrite to internal path
      const internalSlug = reverseMap[locale]?.[slug];
      if (internalSlug) {
        const url = request.nextUrl.clone();
        segments[1] = internalSlug;
        url.pathname = '/' + segments.join('/');
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      }

      // Internal slug that has a translation for this locale → 301 redirect
      const translatedSlug = routeTranslations[slug]?.[locale];
      if (translatedSlug) {
        const url = request.nextUrl.clone();
        segments[1] = translatedSlug;
        url.pathname = '/' + segments.join('/');
        return NextResponse.redirect(url, 301);
      }
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Redirect to locale-prefixed path
  const locale = getLocaleFromRequest(request, site);
  const newUrl = new URL(`/${locale}${pathname}`, request.url);
  newUrl.search = request.nextUrl.search;

  return NextResponse.redirect(newUrl, 308);
}

export const config = {
  // Match all paths except static files and api
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|previews|uploads).*)'],
};
