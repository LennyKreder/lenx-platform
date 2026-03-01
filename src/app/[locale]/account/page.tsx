import Link from 'next/link';
import { Package, Download, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCustomerSession } from '@/lib/customer-session';
import { getAccessibleProductsByCustomer } from '@/lib/customer-access';
import { prisma } from '@/lib/prisma';
import { createTranslator, type Locale } from '@/lib/i18n';

interface AccountPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;
  const session = await getCustomerSession();

  if (!session) {
    return null; // Layout will redirect
  }

  // Get customer stats
  const [orderCount, accessibleProducts] = await Promise.all([
    prisma.order.count({
      where: { customerId: session.customerId, status: 'completed' },
    }),
    getAccessibleProductsByCustomer(session.customerId),
  ]);

  const productCount = accessibleProducts.length;

  // Get recent orders
  const recentOrders = await prisma.order.findMany({
    where: { customerId: session.customerId, status: 'completed' },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      totalInCents: true,
      currency: true,
    },
  });

  const t = createTranslator(locale as Locale);
  const dateLocale = locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : locale === 'it' ? 'it-IT' : 'en-US';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          {t('account.welcomeBack')}
        </h1>
        <p className="text-muted-foreground mt-1">{session.email}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/${locale}/account/orders`}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t('account.orders')}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderCount}</div>
              <p className="text-xs text-muted-foreground">
                {t('account.totalOrders')}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${locale}/account/downloads`}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t('account.downloads')}
              </CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productCount}</div>
              <p className="text-xs text-muted-foreground">
                {t('account.availableProducts')}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('account.recentOrders')}</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/account/orders`}>
              {t('account.viewAll')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('account.noOrdersYet')}
            </p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {t('account.order')} #{order.orderNumber || order.id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString(
                        dateLocale,
                        { year: 'numeric', month: 'long', day: 'numeric' }
                      )}
                    </p>
                  </div>
                  <p className="font-medium">
                    {new Intl.NumberFormat(dateLocale, {
                      style: 'currency',
                      currency: order.currency,
                    }).format(order.totalInCents / 100)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link href={`/${locale}/account/downloads`}>
            <Download className="h-4 w-4 mr-2" />
            {t('account.goToDownloads')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/${locale}/shop`}>
            {t('account.continueShopping')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
