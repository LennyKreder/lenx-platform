import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId, getAdminSiteCode, ALL_SITES_CODE } from '@/lib/admin-site';
import { Button } from '@/components/ui/button';
import { OrderTable } from '@/components/admin/orders/OrderTable';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Orders - Admin',
};

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const siteCode = await getAdminSiteCode();
  const isAllSites = siteCode === ALL_SITES_CODE;
  const siteId = await getAdminSiteId();

  const orders = await prisma.order.findMany({
    where: isAllSites ? {} : { siteId },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, email: true } },
      site: { select: { code: true, name: true } },
      _count: { select: { items: true } },
    },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isAllSites ? 'All Orders' : 'Orders'}
          </h2>
          <p className="text-muted-foreground">
            {isAllSites
              ? 'Orders across all sites.'
              : 'View and manage customer orders from all sources.'}
          </p>
        </div>
        {!isAllSites && (
          <Link href="/en/admin/orders/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </Link>
        )}
      </div>

      <OrderTable orders={orders} showSiteColumn={isAllSites} />
    </div>
  );
}
