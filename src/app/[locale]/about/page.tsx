import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { WidgetRenderer } from '@/components/widgets';
import { createTranslator, type Locale } from '@/lib/i18n';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';
import { translatePath } from '@/lib/route-slugs';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

async function getPageContent(siteId: string, locale: string): Promise<string | null> {
  const page = await prisma.contentPage.findFirst({
    where: { siteId, slug: 'about' },
    include: {
      translations: true,
    },
  });

  if (!page || !page.isPublished) return null;

  // Try locale, fallback to English
  let translation = page.translations.find((t) => t.languageCode === locale);
  if (!translation) {
    translation = page.translations.find((t) => t.languageCode === 'en');
  }

  if (!translation) return null;

  // Check if content is HTML (starts with < tag) or legacy JSON
  const content = translation.content.trim();
  if (content.startsWith('<') || content.startsWith('&lt;')) {
    return content;
  }

  // Try to convert legacy JSON to HTML
  try {
    const json = JSON.parse(content);
    let html = '';
    if (json.heading) html += `<h1>${json.heading}</h1>`;
    if (json.intro) html += `<p>${json.intro}</p>`;
    if (json.story) html += `<p>${json.story}</p>`;
    if (json.mission) html += `<h2>${json.mission}</h2>`;
    if (json.missionText) html += `<p>${json.missionText}</p>`;
    if (json.quality) html += `<h2>${json.quality}</h2>`;
    if (json.qualityText) html += `<p>${json.qualityText}</p>`;
    return html;
  } catch {
    return content;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const page = await prisma.contentPage.findFirst({
    where: { siteId: site.id, slug: 'about' },
    include: { translations: { where: { languageCode: locale } } },
  });

  const translation = page?.translations[0];
  const title = translation?.title || 'About';
  const ogTitle = `${title} - ${site.name}`;
  const description = translation?.metaDescription || `Learn about ${site.name} and our digital planners`;

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/about', { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}${translatePath('/about', locale as Locale)}`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  const t = createTranslator(locale as Locale);
  const site = await getSiteFromHeaders();

  const htmlContent = await getPageContent(site.id, locale);

  // Fallback to static translations if no CMS content
  const fallbackHtml = `
    <h1>${t('pages.about.heading')}</h1>
    <p>${t('pages.about.intro')}</p>
    <p>${t('pages.about.story')}</p>
    <h2>${t('pages.about.mission')}</h2>
    <p>${t('pages.about.missionText')}</p>
    <h2>${t('pages.about.quality')}</h2>
    <p>${t('pages.about.qualityText')}</p>
  `;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: t('navigation.shop'), href: `/${locale}/shop` },
            { label: t('navigation.about') },
          ]}
        />

        <div className="max-w-2xl mx-auto">
          <WidgetRenderer
            html={htmlContent || fallbackHtml}
            locale={locale}
            className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight"
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
