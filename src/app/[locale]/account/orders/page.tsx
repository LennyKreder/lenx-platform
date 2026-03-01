import Link from 'next/link';
import { Package, ChevronRight, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCustomerSession } from '@/lib/customer-session';
import { prisma } from '@/lib/prisma';
import { createTranslator, type Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

interface OrdersPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { locale } = await params;
  const session = await getCustomerSession();

  if (!session) {
    return null; // Layout will redirect
  }

  const orders = await prisma.order.findMany({
    where: { customerId: session.customerId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: {
            include: {
              translations: {
                where: { languageCode: locale },
                take: 1,
              },
            },
          },
          bundle: {
            include: {
              translations: {
                where: { languageCode: locale },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const t = createTranslator(locale as Locale);
  const dateLocale = locale === 'nl' ? 'nl-NL' : locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : locale === 'it' ? 'it-IT' : 'en-US';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            {t('account.status.completed')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            {t('account.status.pending')}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive">
            {t('account.status.cancelled')}
          </Badge>
        );
      case 'refunded':
        return (
          <Badge variant="outline">
            {t('account.status.refunded')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          {t('account.orders')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('account.orderHistory')}
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {t('account.noOrdersYet')}
            </p>
            <Link
              href={`/${locale}/shop`}
              className="text-primary hover:underline mt-2"
            >
              {t('account.browseProducts')}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {t('account.order')} #{order.orderNumber || order.id}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString(
                      dateLocale,
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(order.status)}
                  <span className="font-bold">
                    {new Intl.NumberFormat(dateLocale, {
                      style: 'currency',
                      currency: order.currency,
                    }).format(order.totalInCents / 100)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item) => {
                    const name = item.product
                      ? item.product.translations[0]?.name ||
                        item.product.translations[0]?.name ||
                        'Product'
                      : item.bundle
                      ? item.bundle.translations[0]?.name ||
                        item.bundle.translations[0]?.name ||
                        'Bundle'
                      : 'Item';

                    const productId = item.product?.id;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('account.qty')}: {item.quantity} &times;{' '}
                            {new Intl.NumberFormat(dateLocale, {
                              style: 'currency',
                              currency: order.currency,
                            }).format(item.priceInCents / 100)}
                          </p>
                        </div>
                        {order.status === 'completed' && productId && (
                          <Link
                            href={`/${locale}/account/downloads/${productId}`}
                            className="flex items-center text-sm text-primary hover:underline"
                          >
                            {t('account.download')}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
                {order.status === 'completed' && (
                  <div className="mt-4 pt-4 border-t">
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`/api/orders/${order.id}/invoice?locale=${locale}`}
                        download={`invoice-${order.orderNumber || order.id}.pdf`}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {t('account.downloadInvoice')}
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
