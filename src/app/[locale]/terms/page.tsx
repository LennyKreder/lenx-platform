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
    where: { siteId, slug: 'terms' },
    include: {
      translations: true,
    },
  });

  if (!page || !page.isPublished) return null;

  let translation = page.translations.find((t) => t.languageCode === locale);
  if (!translation) {
    translation = page.translations.find((t) => t.languageCode === 'en');
  }

  if (!translation) return null;

  const content = translation.content.trim();
  if (content.startsWith('<') || content.startsWith('&lt;')) {
    return content;
  }

  // Convert legacy JSON to HTML
  try {
    const json = JSON.parse(content);
    let html = '';
    if (json.heading) html += `<h1>${json.heading}</h1>`;
    if (json.lastUpdated) html += `<p><em>${json.lastUpdated}</em></p>`;
    if (json.sections && Array.isArray(json.sections)) {
      for (const section of json.sections) {
        if (section.title) html += `<h2>${section.title}</h2>`;
        if (section.content) html += `<p>${section.content}</p>`;
      }
    }
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
    where: { siteId: site.id, slug: 'terms' },
    include: { translations: { where: { languageCode: locale } } },
  });

  const translation = page?.translations[0];
  const title = translation?.title || 'Terms & Conditions';
  const ogTitle = `${title} - ${site.name}`;
  const description = translation?.metaDescription || `Terms and conditions for ${site.name} products`;

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/terms', { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}${translatePath('/terms', locale as Locale)}`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = createTranslator(locale as Locale);
  const site = await getSiteFromHeaders();

  const htmlContent = await getPageContent(site.id, locale);

  const fallbackHtml = `
    <h1>${t('pages.terms.heading')}</h1>
    <p><em>${t('pages.terms.lastUpdated')}</em></p>
    <h2>${t('pages.terms.digital.title')}</h2>
    <p>${t('pages.terms.digital.content')}</p>
    <h2>${t('pages.terms.license.title')}</h2>
    <p>${t('pages.terms.license.content')}</p>
    <h2>${t('pages.terms.refunds.title')}</h2>
    <p>${t('pages.terms.refunds.content')}</p>
    <h2>${t('pages.terms.copyright.title')}</h2>
    <p>${t('pages.terms.copyright.content')}</p>
    <h2>${t('pages.terms.contact.title')}</h2>
    <p>${t('pages.terms.contact.content')}</p>
  `;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: t('navigation.shop'), href: `/${locale}/shop` },
            { label: t('navigation.terms') },
          ]}
        />

        <div className="max-w-4xl mx-auto">
          <WidgetRenderer
            html={htmlContent || fallbackHtml}
            locale={locale}
            className={htmlContent ? 'terms-content' : 'prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight'}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
