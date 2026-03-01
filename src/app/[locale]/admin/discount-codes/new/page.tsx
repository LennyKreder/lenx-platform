import { prisma } from '@/lib/prisma';
import { DiscountCodeForm } from '@/components/admin/discounts/DiscountCodeForm';

export default async function NewDiscountCodePage() {
  const templates = await prisma.productTemplate.findMany({
    include: {
      translations: { where: { languageCode: 'en' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const templateOptions = templates.map((t) => ({
    id: t.id,
    name: t.translations[0]?.name || `Template #${t.id}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Discount Code</h1>
        <p className="text-muted-foreground">
          Create a redeemable discount code for checkout.
        </p>
      </div>

      <DiscountCodeForm templates={templateOptions} />
    </div>
  );
}
