import { prisma } from '@/lib/prisma';
import { getAdminSiteId, getAdminSiteType } from '@/lib/admin-site';
import { DigitalProductForm } from '@/components/admin/products/digital/DigitalProductForm';
import { PhysicalProductForm } from '@/components/admin/products/physical/PhysicalProductForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'New Product - Admin',
};

export default async function NewProductPage() {
  const [siteId, siteType] = await Promise.all([
    getAdminSiteId(),
    getAdminSiteType(),
  ]);

  const isPhysical = siteType === 'physical';

  if (isPhysical) {
    const [categories, families] = await Promise.all([
      prisma.category.findMany({
        where: { siteId, type: 'product', isActive: true },
        include: { translations: true },
        orderBy: { sortOrder: 'asc' },
      }).then((cats) =>
        cats.map((c) => ({
          id: c.id,
          name: c.translations.find((t) => t.languageCode === 'en')?.name
            || c.translations[0]?.name || `Category ${c.id}`,
        }))
      ),
      prisma.productFamily.findMany({
        where: { siteId, isActive: true },
        orderBy: { name: 'asc' },
      }).then((fams) =>
        fams.map((f) => ({ id: f.id, name: f.name }))
      ),
    ]);

    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Product</h2>
          <p className="text-muted-foreground">
            Add a new physical product.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <PhysicalProductForm
            categories={categories}
            families={families}
          />
        </div>
      </div>
    );
  }

  // Digital product
  const templates = await prisma.productTemplate.findMany({
    where: { isActive: true, siteId },
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Product</h2>
        <p className="text-muted-foreground">
          Add a new product based on a template, or create a standalone product.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <DigitalProductForm templates={templates} />
      </div>
    </div>
  );
}
