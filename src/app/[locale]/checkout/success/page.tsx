import { redirect } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { CheckCircle, Download, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { ClearCartOnMount } from '@/components/cart/ClearCartOnMount';
import { TrackPurchase } from '@/components/analytics/TrackPurchase';
import { createTranslator, type Locale } from '@/lib/i18n';

interface SuccessPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const { locale } = await params;
  const { session_id } = await searchParams;

  if (!session_id) {
    redirect(`/${locale}/shop`);
  }

  // Find the order by Stripe session ID
  const order = await prisma.order.findFirst({
    where: { externalId: session_id },
    include: {
      items: {
        include: {
          product: {
            include: {
              translations: true,
              slugs: {
                where: { languageCode: locale, isPrimary: true },
                take: 1,
              },
              _count: {
                select: { files: { where: { isActive: true } } },
              },
            },
          },
          bundle: {
            include: {
              translations: true,
            },
          },
        },
      },
    },
  });

  const t = createTranslator(locale as Locale);

  if (!order) {
    // Order not found or not yet processed - show generic success
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {t('checkout.success.title')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('checkout.success.processingMessage')}
          </p>
          <Button asChild>
            <Link href={`/${locale}/shop`}>
              {t('checkout.success.backToShop')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Get product/bundle names for display
  const purchasedItems = order.items.map((item) => {
    if (item.product) {
      const translation = item.product.translations.find(
        (t) => t.languageCode === locale
      );
      return {
        id: item.product.id,
        name: translation?.name || item.product.translations[0]?.name || 'Product',
        type: 'product' as const,
        fileCount: (item.product as unknown as { _count: { files: number } })._count?.files || 0,
      };
    }
    if (item.bundle) {
      const translation = item.bundle.translations.find(
        (t) => t.languageCode === locale
      );
      return {
        id: item.bundle.id,
        name: translation?.name || item.bundle.translations[0]?.name || 'Bundle',
        type: 'bundle' as const,
        fileCount: 0,
      };
    }
    return null;
  }).filter(Boolean);

  // Format delivery date (immediate for digital products)
  const deliveryDate = new Date().toISOString().split('T')[0];
  // Get country code from order or default to NL
  const countryCode = order.billingCountry || 'NL';

  return (
    <div className="container mx-auto px-4 py-16">
      <ClearCartOnMount />
      <TrackPurchase
        transactionId={String(order.id)}
        items={order.items
          .filter((item) => item.product)
          .map((item) => ({
            id: item.product!.id,
            name: item.product!.translations.find((tr) => tr.languageCode === locale)?.name
              || item.product!.translations[0]?.name || 'Product',
            priceInCents: item.priceInCents,
            currency: order.currency,
          }))}
        totalInCents={order.totalInCents}
        currency={order.currency}
      />

      {/* Google Customer Reviews Opt-in */}
      <Script
        src="https://apis.google.com/js/platform.js?onload=renderOptIn"
        strategy="afterInteractive"
      />
      <Script id="google-reviews-optin" strategy="afterInteractive">
        {`
          window.renderOptIn = function() {
            window.gapi.load('surveyoptin', function() {
              window.gapi.surveyoptin.render({
                // REQUIRED FIELDS
                "merchant_id": 5723828637,
                "order_id": "${order.orderNumber || order.id}",
                "email": "${order.customerEmail}",
                "delivery_country": "${countryCode}",
                "estimated_delivery_date": "${deliveryDate}"
              });
            });
          }
        `}
      </Script>

      {/* Google Ads Conversion Tracking */}
      <Script id="google-ads-conversion" strategy="afterInteractive">
        {`
          gtag('event', 'conversion', {
            'send_to': 'AW-17954325650/hz7HCLOe1_wbEJKJpfFC',
            'transaction_id': '${order.orderNumber || order.id}'
          });
        `}
      </Script>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">
            {t('checkout.success.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('checkout.success.orderConfirmed', { orderId: order.orderNumber || String(order.id) })}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('checkout.success.emailSent')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('checkout.success.emailSentMessage', { email: order.customerEmail })}
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t('checkout.success.yourPurchases')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {purchasedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">{item?.name}</span>
                    {item?.type === 'product' && item.fileCount > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {item.fileCount} {t('checkout.success.filesAvailable')}
                      </span>
                    )}
                  </div>
                  {item?.type === 'product' && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/${locale}/account/downloads/${item.id}`}>
                        {t('common.download')}
                      </Link>
                    </Button>
                  )}
                  {item?.type === 'bundle' && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/${locale}/account/downloads`}>
                        {t('checkout.success.goToLibrary')}
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/${locale}/account/downloads`}>
                  {t('checkout.success.viewAllDownloads')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href={`/${locale}/account`}>
              {t('checkout.success.goToAccount')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${locale}/shop`}>
              {t('account.continueShopping')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
