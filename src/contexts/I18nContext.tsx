'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createTranslator, type Locale, defaultLocale, getMessages } from '@/lib/i18n';

interface I18nContextValue {
  locale: Locale;
  t: ReturnType<typeof createTranslator>;
  messages: ReturnType<typeof getMessages>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  locale: Locale;
  children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const value = useMemo(() => ({
    locale,
    t: createTranslator(locale),
    messages: getMessages(locale),
  }), [locale]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    // Fallback for when used outside provider (shouldn't happen in normal use)
    return {
      locale: defaultLocale,
      t: createTranslator(defaultLocale),
      messages: getMessages(defaultLocale),
    };
  }

  return context;
}

export function useTranslation() {
  const { t } = useI18n();
  return t;
}

export function useLocale() {
  const { locale } = useI18n();
  return locale;
}
