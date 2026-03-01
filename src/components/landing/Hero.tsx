'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Calendar, Palette, Globe, Tablet } from 'lucide-react';
import { getLocaleFromPathname, createTranslator } from '@/lib/i18n';

export function Hero() {
  const pathname = usePathname();
  // Derive locale from pathname for accuracy (avoids context timing issues)
  const locale = getLocaleFromPathname(pathname);
  const t = createTranslator(locale);

  return (
    <section className="container py-24 md:py-32">
      <div className="flex flex-col items-center text-center gap-8">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          {t('landing.hero.title')}
          <br />
          <span className="text-muted-foreground">{t('landing.hero.titleHighlight')}</span>
        </h1>
        <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl">
          {t('landing.hero.subtitle')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" variant="outline" asChild>
            <a
              href="https://www.etsy.com/shop/LayoutsByLenny"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('landing.hero.ctaPrimary')}
            </a>
          </Button>
          <Button size="lg" asChild>
            <Link href={`/${locale}/library`}>{t('landing.hero.ctaSecondary')}</Link>
          </Button>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 text-sm text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Calendar className="h-8 w-8" />
            <span>{t('landing.hero.features.templates')}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Palette className="h-8 w-8" />
            <span>{t('landing.hero.features.themes')}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Globe className="h-8 w-8" />
            <span>{t('landing.hero.features.language')}</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Tablet className="h-8 w-8" />
            <span>{t('landing.hero.features.goodnotes')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
