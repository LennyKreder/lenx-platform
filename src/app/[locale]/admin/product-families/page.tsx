import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import { Button } from '@/components/ui/button';
import { ProductFamilyTable } from '@/components/admin/product-families/ProductFamilyTable';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Product Families - Admin',
};

export default async function ProductFamiliesPage() {
  const siteId = await getAdminSiteId();

  const families = await prisma.productFamily.findMany({
    where: { siteId },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Families</h2>
          <p className="text-muted-foreground">
            Group related products together (e.g. same product in different pack sizes).
          </p>
        </div>
        <Link href="/en/admin/product-families/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Family
          </Button>
        </Link>
      </div>

      <ProductFamilyTable families={families} />
    </div>
  );
}
