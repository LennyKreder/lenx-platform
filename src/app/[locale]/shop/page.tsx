import { Suspense } from 'react';
import { Metadata } from 'next';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { ShopPageClient } from '@/components/shop/ShopPageClient';
import { getSettings } from '@/lib/settings';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface ShopPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const isNL = locale === 'nl';

  const title = isNL ? 'Winkel' : 'Shop';
  const ogTitle = `${title} - ${site.name}`;
  const description = isNL
    ? 'Bekijk en koop digitale planners, stickers en sjablonen.'
    : 'Browse and purchase digital planners, stickers, and templates.';

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/shop', { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}/shop`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function ShopPage({ params }: ShopPageProps) {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const settings = await getSettings(site.id, site.siteType ?? undefined);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        {/* Shop Content with Filters */}
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
          <ShopPageClient
            locale={locale}
            showRecentlyViewed={settings.showRecentlyViewed}
            recentlyViewedMaxQty={settings.recentlyViewedMaxQty}
            visibleFilters={{
              year: settings.showFilterYear,
              theme: settings.showFilterTheme,
              themeMode: settings.showFilterThemeMode,
              device: settings.showFilterDevice,
              itemType: settings.showFilterItemType,
              productType: settings.showFilterProductType,
              category: settings.showFilterCategory,
            }}
          />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
