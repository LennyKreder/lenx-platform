import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import { Button } from '@/components/ui/button';
import { OrderDetails } from '@/components/admin/orders/OrderDetails';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Order Details - Admin',
};

export const dynamic = 'force-dynamic';

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    notFound();
  }

  const siteId = await getAdminSiteId();
  const order = await prisma.order.findFirst({
    where: { id: orderId, siteId },
    include: {
      customer: true,
      items: {
        include: {
          product: {
            include: {
              template: {
                include: {
                  translations: true,
                  slugs: { where: { isPrimary: true } },
                },
              },
              translations: true,
              slugs: { where: { isPrimary: true } },
            },
          },
          bundle: {
            include: {
              translations: true,
              slugs: { where: { isPrimary: true } },
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/en/admin/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
      </div>

      <OrderDetails order={order} />
    </div>
  );
}
