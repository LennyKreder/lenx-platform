import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { WidgetRenderer } from '@/components/widgets';
import { createTranslator, type Locale } from '@/lib/i18n';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';
import { notFound } from 'next/navigation';
import { Download, Lightbulb, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

async function getPageContent(siteId: string, locale: string): Promise<string | null> {
  const page = await prisma.contentPage.findFirst({
    where: { siteId, slug: 'how-to-import' },
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

  return null;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);

  const page = await prisma.contentPage.findFirst({
    where: { siteId: site.id, slug: 'how-to-import' },
    include: { translations: { where: { languageCode: locale } } },
  });

  let title: string;
  let description: string;

  if (page?.translations[0]) {
    title = page.translations[0].title;
    description = page.translations[0].metaDescription || '';
  } else {
    const t = createTranslator(locale as Locale);
    title = t('pages.howToImport.title');
    description = t('pages.howToImport.description');
  }

  const ogTitle = `${title} - ${site.name}`;

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/how-to-import', { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}/how-to-import`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function HowToImportPage({ params }: PageProps) {
  const { locale } = await params;
  const t = createTranslator(locale as Locale);
  const site = await getSiteFromHeaders();
  if (site.siteType !== 'digital') notFound();

  const htmlContent = await getPageContent(site.id, locale);

  // If CMS content exists, render it directly
  if (htmlContent) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12">
          <Breadcrumbs
            locale={locale}
            items={[
              { label: t('navigation.shop'), href: `/${locale}/shop` },
              { label: t('navigation.howToImport') },
            ]}
          />

          <div className="max-w-3xl mx-auto">
            <WidgetRenderer
              html={htmlContent}
              locale={locale}
              className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight"
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Static fallback with the styled layout
  const apps = [
    {
      key: 'goodnotes',
      name: t('pages.howToImport.goodnotes.title'),
      steps: [
        t('pages.howToImport.goodnotes.step1'),
        t('pages.howToImport.goodnotes.step2'),
        t('pages.howToImport.goodnotes.step3'),
        t('pages.howToImport.goodnotes.step4'),
      ],
    },
    {
      key: 'noteshelf',
      name: t('pages.howToImport.noteshelf.title'),
      steps: [
        t('pages.howToImport.noteshelf.step1'),
        t('pages.howToImport.noteshelf.step2'),
        t('pages.howToImport.noteshelf.step3'),
        t('pages.howToImport.noteshelf.step4'),
      ],
    },
    {
      key: 'notability',
      name: t('pages.howToImport.notability.title'),
      steps: [
        t('pages.howToImport.notability.step1'),
        t('pages.howToImport.notability.step2'),
        t('pages.howToImport.notability.step3'),
        t('pages.howToImport.notability.step4'),
      ],
    },
  ];

  const tips = [
    t('pages.howToImport.tips.tip1'),
    t('pages.howToImport.tips.tip2'),
    t('pages.howToImport.tips.tip3'),
    t('pages.howToImport.tips.tip4'),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: t('navigation.shop'), href: `/${locale}/shop` },
            { label: t('navigation.howToImport') },
          ]}
        />

        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            {t('pages.howToImport.heading')}
          </h1>
          <p className="text-xl text-muted-foreground mb-12">
            {t('pages.howToImport.intro')}
          </p>

          <div className="space-y-8 mb-12">
            {apps.map((app) => (
              <div key={app.key} className="p-6 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">{app.name}</h2>
                </div>
                <ol className="space-y-3 ml-4">
                  {app.steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-lg border bg-card mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Lightbulb className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="text-xl font-semibold">{t('pages.howToImport.tips.title')}</h2>
            </div>
            <ul className="space-y-2 ml-4">
              {tips.map((tip, index) => (
                <li key={index} className="flex gap-3 text-muted-foreground">
                  <span className="text-amber-500">&bull;</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3 mb-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('pages.howToImport.needHelp')}</h2>
            </div>
            <p className="text-muted-foreground">
              {t('pages.howToImport.needHelpText')}{' '}
              <Link href={`/${locale}/contact`} className="text-primary hover:underline">
                {t('navigation.contact')}
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
