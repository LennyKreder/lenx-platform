import { prisma } from '@/lib/prisma';
import { getAdminSiteId, getAdminSiteType } from '@/lib/admin-site';
import { ProductForm } from '@/components/admin/products/ProductForm';

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

  const [templates, categories, families] = await Promise.all([
    // Only fetch templates for digital sites
    isPhysical
      ? Promise.resolve([])
      : prisma.productTemplate.findMany({
          where: { isActive: true, siteId: siteId },
          include: {
            translations: true,
            slugs: { where: { isPrimary: true } },
          },
          orderBy: { sortOrder: 'asc' },
        }),
    // Only fetch categories for physical sites
    isPhysical && siteId
      ? prisma.category.findMany({
          where: { siteId, type: 'product', isActive: true },
          include: { translations: true },
          orderBy: { sortOrder: 'asc' },
        }).then((cats) =>
          cats.map((c) => ({
            id: c.id,
            name: c.translations.find((t) => t.languageCode === 'en')?.name
              || c.translations[0]?.name || `Category ${c.id}`,
          }))
        )
      : Promise.resolve([]),
    // Only fetch families for physical sites
    isPhysical && siteId
      ? prisma.productFamily.findMany({
          where: { siteId, isActive: true },
          orderBy: { name: 'asc' },
        }).then((fams) =>
          fams.map((f) => ({ id: f.id, name: f.name }))
        )
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Product</h2>
        <p className="text-muted-foreground">
          {isPhysical
            ? 'Add a new physical product.'
            : 'Add a new product based on a template, or create a standalone product.'}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <ProductForm
          siteType={siteType || 'digital'}
          templates={templates}
          categories={categories}
          families={families}
        />
      </div>
    </div>
  );
}
