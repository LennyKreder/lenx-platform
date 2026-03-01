import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { ContactForm } from '@/components/ContactForm';
import { createTranslator, type Locale } from '@/lib/i18n';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';
import { translatePath } from '@/lib/route-slugs';
import { ExternalLink, Mail, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ContactContent {
  heading: string;
  intro: string;
  email: string;
  emailAddress: string;
  address: string;
  etsy: string;
  etsyDescription: string;
  responseTime: string;
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

async function getContactContent(siteId: string, locale: string): Promise<ContactContent | null> {
  const page = await prisma.contentPage.findFirst({
    where: { siteId, slug: 'contact' },
    include: {
      translations: {
        where: { languageCode: locale },
      },
    },
  });

  if (!page || !page.isPublished || page.translations.length === 0) {
    return null;
  }

  try {
    return JSON.parse(page.translations[0].content) as ContactContent;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const page = await prisma.contentPage.findFirst({
    where: { siteId: site.id, slug: 'contact' },
    include: { translations: { where: { languageCode: locale } } },
  });

  const translation = page?.translations[0];
  const title = translation?.title || 'Contact';
  const ogTitle = `${title} - ${site.name}`;
  const description = translation?.metaDescription || `Get in touch with ${site.name}`;

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/contact', { baseUrl, siteId: site.id }),
    openGraph: {
      title: ogTitle,
      description,
      type: 'website',
      url: `${baseUrl}/${locale}${translatePath('/contact', locale as Locale)}`,
      siteName: site.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
    },
  };
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  const t = createTranslator(locale as Locale);
  const site = await getSiteFromHeaders();
  const isNL = locale === 'nl';

  // Try database content first, fall back to static translations
  const dbContent = await getContactContent(site.id, locale);
  const content: ContactContent = dbContent || {
    heading: t('pages.contact.heading'),
    intro: t('pages.contact.intro'),
    email: t('pages.contact.email'),
    emailAddress: t('pages.contact.emailAddress'),
    address: t('pages.contact.address'),
    etsy: t('pages.contact.etsy'),
    etsyDescription: t('pages.contact.etsyDescription'),
    responseTime: t('pages.contact.responseTime'),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: t('navigation.shop'), href: `/${locale}/shop` },
            { label: t('navigation.contact') },
          ]}
        />

        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            {content.heading}
          </h1>
          <p className="text-muted-foreground mb-8">
            {content.intro}
          </p>

          {/* Contact Form */}
          <div className="mb-8">
            <ContactForm locale={locale} />
          </div>

          <p className="text-sm text-muted-foreground mb-8">
            {content.responseTime}
          </p>

          {/* Email */}
          <div className="p-6 rounded-lg border bg-card mb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold mb-1">{content.email}</h2>
                <a
                  href={`mailto:${content.emailAddress}`}
                  className="text-primary hover:underline"
                >
                  {content.emailAddress}
                </a>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="p-6 rounded-lg border bg-card mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold mb-1">{isNL ? 'Adres' : 'Address'}</h2>
                <p className="text-muted-foreground text-sm whitespace-pre-line">{content.address.replace(/\\n/g, '\n')}</p>
              </div>
            </div>
          </div>

          {/* Etsy alternative */}
          <div className="p-6 rounded-lg border bg-card">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <ExternalLink className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold mb-1">{content.etsy}</h2>
                <p className="text-muted-foreground text-sm mb-2">
                  {content.etsyDescription}
                </p>
                <a
                  href="https://www.etsy.com/shop/LayoutsByLenny"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {isNL ? 'LayoutsByLenny op Etsy' : 'LayoutsByLenny on Etsy'}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
