import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
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

  const title = isNL ? 'Afdrukbare Planners' : 'Printable Planners';
  const ogTitle = `${title} - ${site.name}`;
  const description = isNL
    ? 'Ontdek onze collectie afdrukbare planners.'
    : 'Browse our collection of printable planners.';

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/shop/printables', { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}/shop/printables`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function PrintablesPage({ params }: PageProps) {
  const { locale } = await params;
  const isNL = locale === 'nl';
  const site = await getSiteFromHeaders();

  // Get years that have actual published printables for this locale
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
      productType: 'printables',
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

  // Check if we have any undated printables
  const hasUndated = await prisma.product.count({
    where: {
      siteId: site.id,
      isPublished: true,
      productType: 'printables',
      year: null,
      ...languageFilter,
    },
  }) > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {isNL ? 'Afdrukbare Planners' : 'Printable Planners'}
          </h1>
          <p className="text-muted-foreground">
            {isNL
              ? 'Kies een jaar om onze afdrukbare planners te bekijken.'
              : 'Choose a year to browse our printable planners.'}
          </p>
        </div>

        {/* Year Selection */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {years.map((year) => (
            <Link
              key={year}
              href={`/${locale}/shop/printables/${year}`}
              className="group block p-6 rounded-lg border bg-card hover:border-primary transition-colors"
            >
              <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">
                {year}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isNL ? `Afdrukbare planners voor ${year}` : `Printable planners for ${year}`}
              </p>
            </Link>
          ))}

          {/* Undated option - only show if we have undated printables */}
          {hasUndated && (
            <Link
              href={`/${locale}/shop/printables/undated`}
              className="group block p-6 rounded-lg border bg-card hover:border-primary transition-colors"
            >
              <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">
                {isNL ? 'Ongedateerd' : 'Undated'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isNL ? 'Afdrukbare planners zonder datum' : 'Printable planners without dates'}
              </p>
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
