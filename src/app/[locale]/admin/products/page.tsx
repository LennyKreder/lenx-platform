import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId, getAdminSiteCode, getAdminSiteType, ALL_SITES_CODE } from '@/lib/admin-site';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { DigitalProductsPageClient } from '@/components/admin/products/digital/DigitalProductsPageClient';
import { PhysicalProductsPageClient } from '@/components/admin/products/physical/PhysicalProductsPageClient';

export const metadata = {
  title: 'Products - Admin',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const siteCode = await getAdminSiteCode();
  const isAllSites = siteCode === ALL_SITES_CODE;
  const siteType = isAllSites ? null : await getAdminSiteType();
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const pageSize = 20;

  // In "All Sites" mode, show products from physical sites only (not LBL)
  let where: Record<string, unknown>;
  if (isAllSites) {
    const physicalSites = await prisma.site.findMany({
      where: { siteType: 'physical' },
      select: { id: true },
    });
    where = { siteId: { in: physicalSites.map((s) => s.id) } };
  } else {
    const siteId = await getAdminSiteId();
    where = { siteId };
  }

  const isPhysical = isAllSites || siteType === 'physical';

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        template: {
          include: {
            translations: true,
            slugs: { where: { isPrimary: true } },
          },
        },
        translations: true,
        slugs: { where: { isPrimary: true } },
        site: { select: { code: true, name: true } },
        category: { select: { translations: true } },
        _count: { select: { files: true, tags: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const paginationData = {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">
            {isAllSites
              ? 'Products across all physical product sites.'
              : isPhysical
                ? 'Manage your physical products.'
                : 'Manage your product variants and their files.'}
          </p>
        </div>
        {!isAllSites && (
          <div className="flex gap-2">
            {!isPhysical && (
              <Link href="/en/admin/products/generate">
                <Button variant="outline">
                  <Sparkles className="h-4 w-4" />
                  Generate
                </Button>
              </Link>
            )}
            <Link href="/en/admin/products/new">
              <Button>
                <Plus className="h-4 w-4" />
                New Product
              </Button>
            </Link>
          </div>
        )}
      </div>

      {isPhysical ? (
        <PhysicalProductsPageClient
          initialProducts={products.map((p) => ({
            id: p.id,
            priceInCents: p.priceInCents,
            compareAtPriceInCents: (p as { compareAtPriceInCents?: number | null }).compareAtPriceInCents ?? null,
            currency: p.currency,
            sku: (p as { sku?: string | null }).sku ?? null,
            isPublished: p.isPublished,
            isFeatured: p.isFeatured,
            translations: p.translations,
            slugs: p.slugs,
            imageCount: (p.images as string[] | null)?.length ?? 0,
            hasVideo: !!(p as { videoUrl?: string | null }).videoUrl,
            category: p.category
              ? { name: p.category.translations.find((t) => t.languageCode === 'en')?.name || p.category.translations[0]?.name || '' }
              : null,
            site: (p as { site?: { code: string; name: string } }).site || null,
          }))}
          initialPagination={paginationData}
          showSiteColumn={isAllSites}
        />
      ) : (
        <DigitalProductsPageClient
          initialProducts={products.map((p) => ({
            id: p.id,
            year: p.year,
            theme: p.theme,
            contentLanguage: p.contentLanguage,
            productType: p.productType,
            device: p.device,
            priceInCents: p.priceInCents,
            currency: p.currency,
            downloadCode: p.downloadCode,
            isPublished: p.isPublished,
            isFeatured: p.isFeatured,
            translations: p.translations,
            slugs: p.slugs,
            template: p.template ? { translations: p.template.translations, slugs: p.template.slugs } : null,
            _count: p._count,
            imageCount: (p.images as string[] | null)?.length ?? 0,
            hasVideo: !!(p as { videoUrl?: string | null }).videoUrl,
          }))}
          initialPagination={paginationData}
        />
      )}
    </div>
  );
}
