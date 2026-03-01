import { prisma } from '@/lib/prisma';
import { DiscountForm } from '@/components/admin/discounts/DiscountForm';

export default async function NewDiscountPage() {
  // Get products, bundles, and templates for the dropdowns
  const [products, bundles, templates] = await Promise.all([
    prisma.product.findMany({
      where: { isPublished: true },
      include: {
        translations: { where: { languageCode: 'en' } },
        template: {
          include: {
            translations: { where: { languageCode: 'en' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bundle.findMany({
      where: { isPublished: true },
      include: {
        translations: { where: { languageCode: 'en' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.productTemplate.findMany({
      include: {
        translations: { where: { languageCode: 'en' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.translations[0]?.name || p.template?.translations[0]?.name || `Product #${p.id}`,
  }));

  const bundleOptions = bundles.map((b) => ({
    id: b.id,
    name: b.translations[0]?.name || `Bundle #${b.id}`,
  }));

  const templateOptions = templates.map((t) => ({
    id: t.id,
    name: t.translations[0]?.name || `Template #${t.id}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Discount</h1>
        <p className="text-muted-foreground">
          Create an automatic discount that applies to products in the shop.
        </p>
      </div>

      <DiscountForm
        products={productOptions}
        bundles={bundleOptions}
        templates={templateOptions}
      />
    </div>
  );
}
