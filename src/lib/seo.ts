import { getActiveLocales } from '@/lib/settings';
import { translatePath } from '@/lib/route-slugs';
import { type Locale } from '@/lib/i18n';

const DEFAULT_BASE_URL = 'https://layoutsbylenny.com';

/**
 * Build canonical URL and hreflang alternates for a page.
 * @param locale - Current locale (e.g. 'en', 'nl')
 * @param path - Internal path after the locale segment (e.g. '/shop', '/terms')
 *               Use '' or '/' for the home page.
 * @param options - Optional baseUrl and siteId for multi-site support
 */
export async function buildAlternates(
  locale: string,
  path: string = '',
  options?: { baseUrl?: string; siteId?: string },
) {
  const baseUrl = options?.baseUrl || DEFAULT_BASE_URL;
  const normalizedPath = path && path !== '/' ? path : '';
  const activeLocales = await getActiveLocales(options?.siteId);

  const languages: Record<string, string> = {};
  for (const loc of activeLocales) {
    const translatedPath = translatePath(normalizedPath, loc as Locale);
    if (loc === 'nl') {
      languages['nl-NL'] = `${baseUrl}/nl${translatedPath}`;
      languages['nl-BE'] = `${baseUrl}/nl${translatedPath}`;
    } else {
      languages[loc] = `${baseUrl}/${loc}${translatedPath}`;
    }
  }
  languages['x-default'] = `${baseUrl}/en${normalizedPath}`;

  const canonicalPath = translatePath(normalizedPath, locale as Locale);
  return {
    canonical: `${baseUrl}/${locale}${canonicalPath}`,
    languages,
  };
}
