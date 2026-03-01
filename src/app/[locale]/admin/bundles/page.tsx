import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { BundlesPageClient } from './BundlesPageClient';

export const metadata = {
  title: 'Bundles - Admin',
};

export const dynamic = 'force-dynamic';

export default async function BundlesPage() {
  const pageSize = 20;

  const [allBundles, total] = await Promise.all([
    prisma.bundle.findMany({
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
        items: {
          select: { productId: true },
        },
        _count: { select: { orderItems: true, access: true } },
      },
    }),
    prisma.bundle.count(),
  ]);

  // Sort by English translation name (or first available)
  const sortedBundles = allBundles.sort((a, b) => {
    const nameA = a.translations.find(t => t.languageCode === 'en')?.name || a.translations[0]?.name || '';
    const nameB = b.translations.find(t => t.languageCode === 'en')?.name || b.translations[0]?.name || '';
    return nameA.localeCompare(nameB);
  });

  // Paginate
  const bundles = sortedBundles.slice(0, pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bundles</h2>
          <p className="text-muted-foreground">
            Create product bundles and special offers.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/en/admin/bundles/generate">
            <Button variant="outline">
              <Sparkles className="h-4 w-4" />
              Auto-Generate
            </Button>
          </Link>
          <Link href="/en/admin/bundles/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Bundle
            </Button>
          </Link>
        </div>
      </div>

      <BundlesPageClient
        initialBundles={bundles}
        initialPagination={{
          page: 1,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        }}
      />
    </div>
  );
}
