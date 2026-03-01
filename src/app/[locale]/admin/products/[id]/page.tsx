import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId, getAdminSiteType } from '@/lib/admin-site';
import { ProductForm } from '@/components/admin/products/ProductForm';
import { ProductMediaSection } from '@/components/admin/products/ProductMediaSection';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Edit Product - Admin',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    notFound();
  }

  const [siteId, siteType] = await Promise.all([
    getAdminSiteId(),
    getAdminSiteType(),
  ]);

  const isPhysical = siteType === 'physical';

  const [product, templates, categories, families] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        template: {
          include: {
            translations: true,
            slugs: { where: { isPrimary: true } },
          },
        },
        translations: true,
        slugs: { where: { isPrimary: true } },
        tags: true,
        _count: { select: { files: true } },
      },
    }),
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
    isPhysical && siteId
      ? prisma.productFamily.findMany({
          where: { siteId, isActive: true },
          orderBy: { name: 'asc' },
        }).then((fams) =>
          fams.map((f) => ({ id: f.id, name: f.name }))
        )
      : Promise.resolve([]),
  ]);

  if (!product) {
    notFound();
  }

  // Get images and video from product (cast from Json/unknown types)
  const productImages = (product.images as string[]) || [];
  const productVideoUrl = (product as { videoUrl?: string | null }).videoUrl ?? null;

  // Build product URL for "View on Site"
  const productSlug = product.slugs[0]?.slug;
  const productType = product.productType || 'planner';
  const yearSegment = product.year ? String(product.year) : 'undated';

  let productUrl: string | null = null;
  if (productSlug && product.isPublished && !isPhysical) {
    if (productType === 'planner') {
      productUrl = `/en/shop/planners/${yearSegment}/${productSlug}`;
    } else if (productType === 'printable') {
      productUrl = `/en/shop/printables/${yearSegment}/${productSlug}`;
    } else if (productType === 'template') {
      productUrl = `/en/shop/templates/${productSlug}`;
    } else if (productType === 'notebook') {
      productUrl = `/en/shop/notebooks/${productSlug}`;
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Product</h2>
          <p className="text-muted-foreground">
            Update the product details, images, and settings.
          </p>
        </div>
        <div className="flex gap-2">
          {productUrl && (
            <Link href={productUrl} target="_blank">
              <Button variant="outline">
                <ExternalLink className="h-4 w-4" />
                View on Site
              </Button>
            </Link>
          )}
          {!isPhysical && (
            <Link href={`/en/admin/products/${productId}/files`}>
              <Button variant="outline">
                <FileText className="h-4 w-4" />
                Manage Files ({product._count.files})
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Product Media (Images & Video) */}
      <ProductMediaSection
        productId={productId}
        initialImages={productImages}
        initialVideoUrl={productVideoUrl}
      />

      {/* Product Details */}
      <div className="rounded-lg border bg-card p-6">
        <ProductForm
          siteType={siteType || 'digital'}
          product={product}
          templates={templates}
          categories={categories}
          families={families}
        />
      </div>
    </div>
  );
}
