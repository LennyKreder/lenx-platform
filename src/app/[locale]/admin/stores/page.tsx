import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated, getAdminUser } from '@/lib/admin-auth';
import { redirect } from 'next/navigation';
import { StoresList } from '@/components/admin/stores/StoresList';

export const metadata = {
  title: 'Stores - Admin',
};

export default async function StoresPage() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    redirect('/en/admin/login');
  }

  const admin = await getAdminUser();
  const isSuperAdmin = admin?.role === 'super_admin';
  const siteAccess = (admin?.siteAccess as string[]) || [];

  const where = isSuperAdmin || siteAccess.includes('*')
    ? {}
    : { code: { in: siteAccess } };

  const sites = await prisma.site.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      code: true,
      name: true,
      siteType: true,
      domains: true,
      currency: true,
      defaultLocale: true,
      locales: true,
      hasShipping: true,
      hasDigitalDelivery: true,
      hasBolIntegration: true,
      hasBundles: true,
      hasTemplates: true,
      _count: {
        select: {
          products: true,
          salesChannels: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stores</h2>
        <p className="text-muted-foreground">
          Overview of all stores in the platform.
        </p>
      </div>

      <StoresList sites={sites} />
    </div>
  );
}
