import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { isValidYearSegment, type YearSegment } from '@/lib/routing';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { PlannersYearClient } from '@/components/shop/PlannersYearClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string; year: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, year } = await params;

  if (!isValidYearSegment(year)) {
    return { title: 'Not Found' };
  }

  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const isNL = locale === 'nl';
  const isUndated = year === 'undated';

  const title = isUndated
    ? isNL
      ? `Ongedateerde Planners | ${site.name}`
      : `Undated Planners | ${site.name}`
    : isNL
      ? `${year} Planners | ${site.name}`
      : `${year} Planners | ${site.name}`;

  const description = isUndated
    ? isNL
      ? 'Ontdek onze ongedateerde digitale planners.'
      : 'Browse our undated digital planners.'
    : isNL
      ? `Ontdek onze digitale planners voor ${year}.`
      : `Browse our digital planners for ${year}.`;

  return { title, description };
}

export default async function PlannersYearPage({ params }: PageProps) {
  const { locale, year } = await params;

  // Strict validation - 404 for invalid years
  if (!isValidYearSegment(year)) {
    notFound();
  }

  const isNL = locale === 'nl';
  const isUndated = year === 'undated';

  const heading = isUndated
    ? isNL
      ? 'Ongedateerde Planners'
      : 'Undated Planners'
    : isNL
      ? `${year} Planners`
      : `${year} Planners`;

  const description = isUndated
    ? isNL
      ? 'Digitale planners zonder datum - gebruik ze elk jaar.'
      : 'Digital planners without dates - use them any year.'
    : isNL
      ? `Ontdek onze digitale planners voor ${year}.`
      : `Browse our digital planners for ${year}.`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: isNL ? 'Winkel' : 'Shop', href: `/${locale}/shop` },
            { label: 'Planners', href: `/${locale}/shop/planners` },
            { label: isUndated ? (isNL ? 'Ongedateerd' : 'Undated') : year },
          ]}
        />

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{heading}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {/* Products Grid */}
        <Suspense
          fallback={
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-card overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-6 bg-muted rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <PlannersYearClient
            locale={locale}
            year={year as YearSegment}
            productType="planners"
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
