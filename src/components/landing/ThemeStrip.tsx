'use client';

import { usePathname } from 'next/navigation';
import { themes } from '@/config/themes';
import { getLocaleFromPathname, createTranslator } from '@/lib/i18n';

export function ThemeStrip() {
  const pathname = usePathname();
  // Derive locale from pathname for accuracy (avoids context timing issues)
  const locale = getLocaleFromPathname(pathname);
  const t = createTranslator(locale);

  return (
    <section className="container py-16 md:py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('landing.themes.title')}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          {t('landing.themes.subtitle')}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.values(themes).map((theme) => (
          <div
            key={theme.id}
            className="flex flex-col items-center gap-3 p-6 rounded-lg border bg-card"
          >
            <div
              className="w-16 h-16 rounded-full border-4 border-background shadow-lg"
              style={{ backgroundColor: theme.previewColor }}
            />
            <div className="text-center">
              <h3 className="font-semibold">{theme.name}</h3>
              <p className="text-sm text-muted-foreground">{theme.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
