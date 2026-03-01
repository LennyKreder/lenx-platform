import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Script from "next/script";
import { I18nProvider } from "@/contexts/I18nContext";
import { SiteProvider, type SiteContextData, type CompanyInfo } from "@/contexts/SiteContext";
import { isValidLocale, type Locale } from "@/lib/i18n";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { getSiteFromHeaders, getSiteBaseUrl } from "@/lib/site-context";
import { hexToOklch } from "@/lib/color-utils";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

const ogLocaleMap: Record<string, string> = {
  en: 'en_US',
  nl: 'nl_NL',
  de: 'de_DE',
  fr: 'fr_FR',
  es: 'es_ES',
  it: 'it_IT',
};

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: site.defaultMetaTitle || site.name,
      template: `%s - ${site.name}`,
    },
    description: site.defaultMetaDescription || '',
    authors: [{ name: site.name, url: baseUrl }],
    creator: site.name,
    publisher: site.name,
    openGraph: {
      locale: ogLocaleMap[locale] || 'en_US',
      siteName: site.name,
      type: 'website',
      url: baseUrl,
    },
    twitter: {
      card: 'summary_large_image',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}`,
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);

  const siteData: SiteContextData = {
    id: site.id,
    code: site.code,
    name: site.name,
    siteType: site.siteType,
    logoUrl: site.logoUrl,
    primaryColor: site.primaryColor,
    accentColor: site.accentColor,
    footerText: site.footerText,
    companyInfo: (site.companyInfo as unknown as CompanyInfo) || null,
    contactEmail: site.contactEmail,
    hasShipping: site.hasShipping,
    hasDigitalDelivery: site.hasDigitalDelivery,
    hasBundles: site.hasBundles,
    hasTemplates: site.hasTemplates,
    hasBlog: site.hasBlog,
    hasReviews: site.hasReviews,
    hasMultilingual: site.hasMultilingual,
    hasBolIntegration: site.hasBolIntegration,
  };

  // Build CSS variable overrides for site-specific colors
  const cssOverrides: string[] = [];
  if (site.primaryColor) {
    cssOverrides.push(`--primary: ${hexToOklch(site.primaryColor)};`);
  }
  if (site.accentColor) {
    cssOverrides.push(`--accent: ${hexToOklch(site.accentColor)};`);
  }
  const siteStyles = cssOverrides.length > 0
    ? `:root { ${cssOverrides.join(' ')} }`
    : '';

  // GA tracking (per-site)
  const gaId = site.gaTrackingId;

  return (
    <I18nProvider locale={locale as Locale}>
      <SiteProvider site={siteData}>
        <ClientProviders locale={locale}>
          {siteStyles && (
            <style dangerouslySetInnerHTML={{ __html: siteStyles }} />
          )}
          {gaId && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                strategy="afterInteractive"
              />
              <Script id="gtag-init" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                `}
              </Script>
            </>
          )}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: site.name,
                url: baseUrl,
                ...(site.logoUrl ? { logo: site.logoUrl } : {}),
                contactPoint: {
                  '@type': 'ContactPoint',
                  contactType: 'customer service',
                  url: `${baseUrl}/${locale}/contact`,
                },
              }),
            }}
          />
          {children}
        </ClientProviders>
      </SiteProvider>
    </I18nProvider>
  );
}
