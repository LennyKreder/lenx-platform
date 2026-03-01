import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DiscountForm } from '@/components/admin/discounts/DiscountForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDiscountPage({ params }: PageProps) {
  const { id } = await params;

  const discount = await prisma.discount.findUnique({
    where: { id: parseInt(id, 10) },
  });

  if (!discount) {
    notFound();
  }

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
        <h1 className="text-2xl font-bold">Edit Discount</h1>
        <p className="text-muted-foreground">
          Update discount settings.
        </p>
      </div>

      <DiscountForm
        discount={{
          ...discount,
          startsAt: discount.startsAt?.toISOString() || null,
          endsAt: discount.endsAt?.toISOString() || null,
        }}
        products={productOptions}
        bundles={bundleOptions}
        templates={templateOptions}
      />
    </div>
  );
}
