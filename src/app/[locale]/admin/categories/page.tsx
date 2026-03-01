import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import { Button } from '@/components/ui/button';
import { CategoryTable } from '@/components/admin/categories/CategoryTable';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Categories - Admin',
};

export default async function CategoriesPage() {
  const siteId = await getAdminSiteId();

  const categories = await prisma.category.findMany({
    where: { siteId, type: 'product' },
    orderBy: { sortOrder: 'asc' },
    include: {
      translations: true,
      parent: { include: { translations: true } },
      _count: { select: { children: true, products: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground">
            Organize products into categories and subcategories.
          </p>
        </div>
        <Link href="/en/admin/categories/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Category
          </Button>
        </Link>
      </div>

      <CategoryTable categories={categories} />
    </div>
  );
}
