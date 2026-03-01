import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BundleForm } from '@/components/admin/bundles/BundleForm';

export const metadata = {
  title: 'Edit Bundle - Admin',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBundlePage({ params }: PageProps) {
  const { id } = await params;
  const bundleId = parseInt(id, 10);

  if (isNaN(bundleId)) {
    notFound();
  }

  const [bundle, products] = await Promise.all([
    prisma.bundle.findUnique({
      where: { id: bundleId },
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
        items: {
          include: {
            product: {
              include: {
                translations: true,
                slugs: { where: { isPrimary: true } },
              },
            },
          },
        },
      },
    }),
    prisma.product.findMany({
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
    }),
  ]);

  if (!bundle) {
    notFound();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Bundle</h2>
        <p className="text-muted-foreground">
          Update the bundle details and contents.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <BundleForm bundle={bundle} products={products} />
      </div>
    </div>
  );
}
