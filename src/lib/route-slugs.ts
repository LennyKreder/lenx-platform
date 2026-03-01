import { type Locale } from './i18n';

/**
 * Internal (English) slug → translated slug per locale.
 * Only locales with different slugs need entries.
 */
const routeTranslations: Record<string, Partial<Record<Locale, string>>> = {
  'terms':          { nl: 'algemene-voorwaarden' },
  'return-policy':  { nl: 'retourbeleid' },
  'privacy-policy': { nl: 'privacybeleid' },
  'about':          { nl: 'over-ons' },
};

// Build reverse map: { nl: { 'algemene-voorwaarden': 'terms', ... } }
const reverseMap: Partial<Record<Locale, Record<string, string>>> = {};
for (const [internal, translations] of Object.entries(routeTranslations)) {
  for (const [locale, translated] of Object.entries(translations)) {
    const loc = locale as Locale;
    if (!reverseMap[loc]) reverseMap[loc] = {};
    reverseMap[loc]![translated] = internal;
  }
}

/** Get translated slug for a locale (returns internal slug if no translation exists) */
export function getTranslatedSlug(internalSlug: string, locale: Locale): string {
  return routeTranslations[internalSlug]?.[locale] || internalSlug;
}

/** Reverse: given a translated slug and locale, get the internal slug */
export function getInternalSlug(translatedSlug: string, locale: Locale): string {
  return reverseMap[locale]?.[translatedSlug] || translatedSlug;
}

/** Translate a path's first segment for a locale. e.g. `/terms` + `nl` → `/algemene-voorwaarden` */
export function translatePath(internalPath: string, locale: Locale): string {
  const segments = internalPath.split('/').filter(Boolean);
  if (segments.length === 0) return internalPath;

  segments[0] = getTranslatedSlug(segments[0], locale);
  return '/' + segments.join('/');
}

/** Reverse-translate a path's first segment back to internal. e.g. `/algemene-voorwaarden` + `nl` → `/terms` */
export function internalizePath(translatedPath: string, locale: Locale): string {
  const segments = translatedPath.split('/').filter(Boolean);
  if (segments.length === 0) return translatedPath;

  segments[0] = getInternalSlug(segments[0], locale);
  return '/' + segments.join('/');
}

/** Check if an internal slug has a translation for the given locale */
export function hasTranslation(internalSlug: string, locale: Locale): boolean {
  return !!routeTranslations[internalSlug]?.[locale];
}
