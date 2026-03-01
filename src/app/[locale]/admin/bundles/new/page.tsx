import { prisma } from '@/lib/prisma';
import { BundleForm } from '@/components/admin/bundles/BundleForm';

export const metadata = {
  title: 'New Bundle - Admin',
};

export default async function NewBundlePage() {
  const products = await prisma.product.findMany({
    where: { isPublished: true },
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
      template: {
        include: {
          translations: true,
          slugs: { where: { isPrimary: true } },
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Bundle</h2>
        <p className="text-muted-foreground">
          Create a new product bundle or special offer.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <BundleForm products={products} />
      </div>
    </div>
  );
}
