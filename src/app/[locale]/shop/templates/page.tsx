import { Suspense } from 'react';
import { Metadata } from 'next';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { UndatedProductsClient } from '@/components/shop/UndatedProductsClient';
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
  const title = isNL ? 'Digitale Templates' : 'Digital Templates';
  const ogTitle = `${title} - ${site.name}`;
  const description = isNL
    ? 'Ontdek onze collectie digitale templates voor iPad en reMarkable.'
    : 'Browse our collection of digital templates for iPad and reMarkable.';

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/shop/templates', { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}/shop/templates`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function TemplatesPage({ params }: PageProps) {
  const { locale } = await params;
  const isNL = locale === 'nl';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-muted-foreground">
          <a href={`/${locale}/shop`} className="hover:text-foreground">
            Shop
          </a>
          <span className="mx-2">/</span>
          <span className="text-foreground">Templates</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {isNL ? 'Digitale Templates' : 'Digital Templates'}
          </h1>
          <p className="text-muted-foreground">
            {isNL
              ? 'Ontdek onze collectie digitale templates.'
              : 'Browse our collection of digital templates.'}
          </p>
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
          <UndatedProductsClient locale={locale} productType="templates" />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
