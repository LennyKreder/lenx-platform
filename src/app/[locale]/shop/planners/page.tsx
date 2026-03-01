import { Metadata } from 'next';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const isNL = locale === 'nl';

  const title = isNL ? 'Digitale Planners' : 'Digital Planners';
  const ogTitle = `${title} - ${site.name}`;
  const description = isNL
    ? 'Ontdek onze collectie digitale planners voor iPad en reMarkable.'
    : 'Browse our collection of digital planners for iPad and reMarkable.';

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/shop/planners', { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}/shop/planners`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function PlannersPage({ params }: PageProps) {
  const { locale } = await params;
  const isNL = locale === 'nl';
  const site = await getSiteFromHeaders();

  // Get years that have actual published planners for this locale
  const languageFilter = {
    OR: [
      { contentLanguage: locale },
      { contentLanguage: null },
    ],
  };

  const yearsWithProducts = await prisma.product.findMany({
    where: {
      siteId: site.id,
      isPublished: true,
      productType: 'planner',
      year: { not: null },
      ...languageFilter,
    },
    select: { year: true },
    distinct: ['year'],
    orderBy: { year: 'asc' },
  });

  const years = yearsWithProducts
    .map((p) => p.year)
    .filter((y): y is number => y !== null)
    .map((y) => String(y));

  // Check if we have any undated planners
  const undatedCount = await prisma.product.count({
    where: {
      siteId: site.id,
      isPublished: true,
      productType: 'planner',
      year: null,
      ...languageFilter,
    },
  });
  const hasUndated = undatedCount > 0;

  // Get product count per year
  const yearCounts = await Promise.all(
    years.map(async (year) => {
      const count = await prisma.product.count({
        where: {
          siteId: site.id,
          isPublished: true,
          productType: 'planner',
          year: parseInt(year, 10),
          ...languageFilter,
        },
      });
      return { year, count };
    })
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: isNL ? 'Winkel' : 'Shop', href: `/${locale}/shop` },
            { label: 'Planners' },
          ]}
        />

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {isNL ? 'Digitale Planners' : 'Digital Planners'}
          </h1>
          <p className="text-muted-foreground">
            {isNL
              ? 'Kies een jaar om onze digitale planners te bekijken.'
              : 'Choose a year to browse our digital planners.'}
          </p>
        </div>

        {/* Year Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {yearCounts.map(({ year, count }) => (
            <Link
              key={year}
              href={`/${locale}/shop/planners/${year}`}
              className="group relative block overflow-hidden rounded-xl border bg-card hover:border-primary hover:shadow-lg transition-all"
            >
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-4xl font-bold group-hover:text-primary transition-colors">
                  {year}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {count} {count === 1 ? 'planner' : 'planners'}
                </p>
              </div>
            </Link>
          ))}

          {/* Undated option */}
          {hasUndated && (
            <Link
              href={`/${locale}/shop/planners/undated`}
              className="group relative block overflow-hidden rounded-xl border bg-card hover:border-primary hover:shadow-lg transition-all"
            >
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-3xl font-bold group-hover:text-primary transition-colors">
                  {isNL ? 'Ongedateerd' : 'Undated'}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {undatedCount} {undatedCount === 1 ? 'planner' : 'planners'}
                </p>
              </div>
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
