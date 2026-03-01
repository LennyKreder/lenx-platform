'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale, removeLocaleFromPathname, getLocaleFromPathname } from '@/lib/i18n';
import { internalizePath, translatePath } from '@/lib/route-slugs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const localeNames: Record<Locale, string> = {
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
};

const localeFlags: Record<Locale, string> = {
  en: 'EN',
  nl: 'NL',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  it: 'IT',
};

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
}

export function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Derive locale from pathname for accuracy (avoids context timing issues)
  const currentLocale = getLocaleFromPathname(pathname);

  // Prevent hydration mismatch from Radix UI random IDs
  const [mounted, setMounted] = useState(false);
  const [activeLocales, setActiveLocales] = useState<Locale[]>(locales as unknown as Locale[]);

  useEffect(() => {
    setMounted(true);
    // Fetch active locales from settings
    fetch('/api/settings/locales')
      .then((res) => res.json())
      .then((data) => {
        if (data.locales && Array.isArray(data.locales)) {
          setActiveLocales(data.locales);
        }
      })
      .catch(() => {
        // Keep default locales on error
      });
  }, []);

  // Filter locales to only show active ones
  const displayLocales = useMemo(() => {
    return locales.filter((locale) => activeLocales.includes(locale));
  }, [activeLocales]);

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    // Set cookie for persistence
    document.cookie = `locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;

    // Navigate to the new locale path with translated slug
    const pathWithoutLocale = removeLocaleFromPathname(pathname);
    const internalPath = internalizePath(pathWithoutLocale, currentLocale);
    const translatedPath = translatePath(internalPath, newLocale);
    router.push(`/${newLocale}${translatedPath}`);
  };

  if (variant === 'compact') {
    // Render placeholder until mounted to prevent hydration mismatch
    if (!mounted) {
      return (
        <Button variant="ghost" size="sm" className="gap-1">
          <Globe className="h-4 w-4" />
          <span className="font-medium">{localeFlags[currentLocale]}</span>
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            <Globe className="h-4 w-4" />
            <span className="font-medium">{localeFlags[currentLocale]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {displayLocales.map((locale) => (
            <DropdownMenuItem
              key={locale}
              onClick={() => handleLocaleChange(locale)}
              className={locale === currentLocale ? 'bg-accent' : ''}
            >
              <span className="font-medium mr-2">{localeFlags[locale]}</span>
              {localeNames[locale]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {displayLocales.map((locale) => (
        <Button
          key={locale}
          variant={locale === currentLocale ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => handleLocaleChange(locale)}
          className="font-medium"
        >
          {localeFlags[locale]}
        </Button>
      ))}
    </div>
  );
}
