import { Metadata } from 'next';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { CartPageClient } from '@/components/cart/CartPageClient';
import { getSiteFromHeaders, getSiteBaseUrl } from '@/lib/site-context';
import { buildAlternates } from '@/lib/seo';

export const dynamic = 'force-dynamic';

interface CartPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: CartPageProps): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSiteFromHeaders();
  const baseUrl = getSiteBaseUrl(site);
  const isNL = locale === 'nl';

  const title = isNL ? 'Winkelwagen' : 'Shopping Cart';
  const description = isNL
    ? 'Bekijk en beheer je winkelwagen.'
    : 'View and manage your shopping cart.';

  return {
    title,
    description,
    alternates: await buildAlternates(locale, '/cart', { baseUrl, siteId: site.id }),
    robots: { index: false, follow: false },
  };
}

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <CartPageClient locale={locale} />
      </main>
      <Footer />
    </div>
  );
}
