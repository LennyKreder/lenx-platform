import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderForm } from '@/components/admin/orders/OrderForm';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'New Order - Admin',
};

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const siteId = await getAdminSiteId();
  const [products, bundles] = await Promise.all([
    prisma.product.findMany({
      where: { siteId, isPublished: true },
      orderBy: [{ createdAt: 'desc' }],
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
    }),
    prisma.bundle.findMany({
      where: { siteId, isPublished: true },
      orderBy: { createdAt: 'desc' },
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/en/admin/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">New Order</h2>
          <p className="text-muted-foreground">
            Create a manual order for a customer.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderForm products={products} bundles={bundles} />
        </CardContent>
      </Card>
    </div>
  );
}
