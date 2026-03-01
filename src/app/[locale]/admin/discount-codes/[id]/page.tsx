import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DiscountCodeForm } from '@/components/admin/discounts/DiscountCodeForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDiscountCodePage({ params }: PageProps) {
  const { id } = await params;

  const [discountCode, templates] = await Promise.all([
    prisma.discountCode.findUnique({
      where: { id: parseInt(id, 10) },
    }),
    prisma.productTemplate.findMany({
      include: {
        translations: { where: { languageCode: 'en' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!discountCode) {
    notFound();
  }

  const templateOptions = templates.map((t) => ({
    id: t.id,
    name: t.translations[0]?.name || `Template #${t.id}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Discount Code</h1>
        <p className="text-muted-foreground">
          Update discount code settings.
        </p>
      </div>

      <DiscountCodeForm
        discountCode={{
          ...discountCode,
          startsAt: discountCode.startsAt?.toISOString() || null,
          endsAt: discountCode.endsAt?.toISOString() || null,
        }}
        templates={templateOptions}
      />
    </div>
  );
}
