import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import { CustomerTable } from '@/components/admin/customers/CustomerTable';

export const metadata = {
  title: 'Customers - Admin',
};

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const siteId = await getAdminSiteId();
  const customers = await prisma.customer.findMany({
    where: { siteId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          access: true,
          orders: true,
        },
      },
    },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
        <p className="text-muted-foreground">
          Manage customer accounts and product access.
        </p>
      </div>

      <CustomerTable customers={customers} />
    </div>
  );
}
