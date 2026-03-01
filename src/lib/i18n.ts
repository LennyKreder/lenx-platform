import en from '@/messages/en.json';
import nl from '@/messages/nl.json';
import de from '@/messages/de.json';
import fr from '@/messages/fr.json';
import es from '@/messages/es.json';
import it from '@/messages/it.json';

export const locales = ['en', 'nl', 'de', 'fr', 'es', 'it'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const messages = { en, nl, de, fr, es, it } as const;

export function getMessages(locale: Locale) {
  return messages[locale] || messages[defaultLocale];
}

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// Type-safe translation key paths
type NestedKeyOf<T, K = keyof T> = K extends keyof T & string
  ? T[K] extends object
    ? `${K}.${NestedKeyOf<T[K]>}`
    : K
  : never;

export type TranslationKey = NestedKeyOf<typeof en>;

// Get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path; // Return the key if not found
    }
  }

  return typeof result === 'string' ? result : path;
}

// Translation function with interpolation support
export function createTranslator(locale: Locale) {
  const messages = getMessages(locale);

  return function t(key: string, params?: Record<string, string | number>): string {
    let value = getNestedValue(messages as unknown as Record<string, unknown>, key);

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return value;
  };
}

// Helper to get locale from pathname
export function getLocaleFromPathname(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment;
  }

  return defaultLocale;
}

// Helper to build localized pathname
export function buildLocalizedPath(pathname: string, locale: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  // If first segment is already a locale, replace it
  if (firstSegment && isValidLocale(firstSegment)) {
    segments[0] = locale;
    return '/' + segments.join('/');
  }

  // Otherwise prepend the locale
  return `/${locale}${pathname}`;
}

// Remove locale from pathname
export function removeLocaleFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && isValidLocale(firstSegment)) {
    return '/' + segments.slice(1).join('/') || '/';
  }

  return pathname;
}

// Get date locale string for Intl APIs
export function getDateLocale(locale: Locale): string {
  const dateLocales: Record<Locale, string> = {
    en: 'en-US',
    nl: 'nl-NL',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    it: 'it-IT',
  };
  return dateLocales[locale] || 'en-US';
}
