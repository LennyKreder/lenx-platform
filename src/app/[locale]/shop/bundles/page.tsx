import { Suspense } from 'react';
import { Metadata } from 'next';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { BundlesPageClient } from '@/components/shop/BundlesPageClient';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface BundlesPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: BundlesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const isNL = locale === 'nl';
  const title = isNL ? 'Bundels' : 'Bundles';
  const ogTitle = `${title} - ${site.name}`;
  const description = isNL
    ? 'Bespaar met onze bundelaanbiedingen. Krijg meerdere planners voor een gereduceerde prijs.'
    : 'Save with our bundle deals. Get multiple planners at a discounted price.';

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/shop/bundles', { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}/shop/bundles`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function BundlesPage({ params }: BundlesPageProps) {
  const { locale } = await params;
  const isNL = locale === 'nl';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {isNL ? 'Bundels' : 'Bundles'}
          </h1>
          <p className="text-muted-foreground">
            {isNL
              ? 'Bespaar met onze bundelaanbiedingen. Krijg meerdere planners voor een gereduceerde prijs.'
              : 'Save with our bundle deals. Get multiple planners at a discounted price.'}
          </p>
        </div>

        {/* Bundles Grid */}
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
          <BundlesPageClient locale={locale} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
