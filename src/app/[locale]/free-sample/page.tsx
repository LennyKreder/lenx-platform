import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { FreeSampleForm } from './FreeSampleForm';
import { createTranslator, type Locale } from '@/lib/i18n';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ theme?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const t = createTranslator(locale as Locale);

  const title = t('pages.freeSample.title');
  const description = t('pages.freeSample.description');

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/free-sample', { baseUrl, siteId: site.id }),
    openGraph: {
      title: `${title} - ${site.name}`,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}/free-sample`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - ${site.name}`,
      description,
    },
  };
}

export default async function FreeSamplePage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { theme } = await searchParams;
  const site = await getSiteFromHeaders();
  if (site.siteType !== 'digital') notFound();
  const t = createTranslator(locale as Locale);

  // Calculate current month/year server-side
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: t('navigation.shop'), href: `/${locale}/shop` },
            { label: t('navigation.freeSample') },
          ]}
        />

        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            {t('pages.freeSample.heading')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t('pages.freeSample.intro')}
          </p>

          <FreeSampleForm
            locale={locale}
            currentMonth={currentMonth}
            currentYear={currentYear}
            initialTheme={theme}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
