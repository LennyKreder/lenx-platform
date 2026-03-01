'use client';

import { usePathname } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, Layers, Paintbrush, Tablet } from 'lucide-react';
import { getLocaleFromPathname, createTranslator } from '@/lib/i18n';

export function Features() {
  const pathname = usePathname();
  // Derive locale from pathname for accuracy (avoids context timing issues)
  const locale = getLocaleFromPathname(pathname);
  const t = createTranslator(locale);

  const features = [
    {
      icon: Link,
      titleKey: 'landing.features.hyperlinked.title',
      descriptionKey: 'landing.features.hyperlinked.description',
    },
    {
      icon: Paintbrush,
      titleKey: 'landing.features.themes.title',
      descriptionKey: 'landing.features.themes.description',
    },
    {
      icon: Layers,
      titleKey: 'landing.features.templates.title',
      descriptionKey: 'landing.features.templates.description',
    },
    {
      icon: Tablet,
      titleKey: 'landing.features.optimized.title',
      descriptionKey: 'landing.features.optimized.description',
    },
  ];

  return (
    <section className="container py-16 md:py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('landing.features.title')}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          {t('landing.features.subtitle')}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.titleKey}>
            <CardHeader>
              <feature.icon className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-lg">{t(feature.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{t(feature.descriptionKey)}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
