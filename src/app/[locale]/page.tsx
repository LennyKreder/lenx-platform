import { redirect } from 'next/navigation';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { ResponsiveBanner } from '@/components/landing/ResponsiveBanner';
import { WidgetRenderer } from '@/components/widgets';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const page = await prisma.contentPage.findFirst({
    where: { siteId: site.id, slug: 'home' },
    include: { translations: { where: { languageCode: locale } } },
  });

  const translation = page?.translations[0];
  const isNL = locale === 'nl';

  const title = translation?.title
    ? translation.title
    : isNL
      ? 'Digitale Planners met Zorg Ontworpen'
      : 'Digital Planners Designed with Care';
  const description = translation?.metaDescription
    || (isNL
      ? 'Ontdek prachtige digitale planners voor GoodNotes, Notability en meer. Handgemaakt met liefde voor detail.'
      : 'Discover beautiful digital planners for GoodNotes, Notability and more. Handcrafted with attention to detail.');

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '', { baseUrl, siteId: site.id }),
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;
  const site = await getSiteFromHeaders();

  // Check if a home page exists in the CMS
  const page = await prisma.contentPage.findFirst({
    where: { siteId: site.id, slug: 'home' },
    include: {
      translations: true,
    },
  });

  // If no home page exists, redirect to shop (backward compat)
  if (!page || !page.isPublished) {
    redirect(`/${locale}/shop`);
  }

  // Find translation for locale, fallback to English
  let translation = page.translations.find((t) => t.languageCode === locale);
  if (!translation) {
    translation = page.translations.find((t) => t.languageCode === 'en');
  }

  if (!translation) {
    redirect(`/${locale}/shop`);
  }

  // Get base banner URL - variants (mobile, dark, language) are derived from naming convention
  const bannerUrl = page.bannerImage;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Banner with responsive variants based on naming convention */}
        {bannerUrl && (
          <div className="relative w-full h-40 sm:h-56 md:h-72 lg:h-96 bg-muted overflow-hidden">
            <ResponsiveBanner baseUrl={bannerUrl} locale={locale} />
          </div>
        )}

        {/* Content */}
        <div className="container py-12">
          <WidgetRenderer
            html={translation.content}
            locale={locale}
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-2xl"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
