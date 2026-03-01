import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Breadcrumbs } from '@/components/shop/Breadcrumbs';
import { createTranslator, type Locale } from '@/lib/i18n';
import { verifySampleDownloadToken } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DownloadTrigger } from './DownloadTrigger';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = createTranslator(locale as Locale);

  return {
    title: t('pages.freeSample.title'),
    robots: { index: false, follow: false },
  };
}

export default async function DownloadPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { token } = await searchParams;
  const t = createTranslator(locale as Locale);

  if (!token) {
    redirect(`/${locale}/free-sample`);
  }

  const tokenData = verifySampleDownloadToken(token);
  if (!tokenData.valid) {
    redirect(`/${locale}/free-sample`);
  }

  // Activate subscriber — clicking the link confirms the email is real
  if (tokenData.email) {
    await prisma.newsletterSubscriber.updateMany({
      where: { email: tokenData.email, isActive: false },
      data: { isActive: true },
    });
  }

  const isNL = locale === 'nl';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-12">
        <Breadcrumbs
          locale={locale}
          items={[
            { label: t('navigation.shop'), href: `/${locale}/shop` },
            { label: t('navigation.freeSample'), href: `/${locale}/free-sample` },
            { label: isNL ? 'Download' : 'Download' },
          ]}
        />

        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-4">
            {isNL ? 'Bedankt voor het downloaden!' : 'Thank you for downloading!'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isNL
              ? 'Je download zou automatisch moeten starten. Zo niet, klik dan op de knop hieronder.'
              : 'Your download should start automatically. If it doesn\'t, click the button below.'}
          </p>

          <DownloadTrigger
            token={token}
            buttonLabel={isNL ? 'Download PDF' : 'Download PDF'}
          />

          <div className="mt-12 p-6 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-4">
              {isNL
                ? 'Bevalt het voorbeeld? Bekijk de volledige jaarplanner met 65+ sjablonen en 17 kleurthema\'s.'
                : 'Enjoyed the sample? Check out the full year planner with 65+ templates and 17 color themes.'}
            </p>
            <a
              href={`/${locale}/shop/planners`}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              {isNL ? 'Bekijk de shop' : 'Browse the shop'} &rarr;
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
