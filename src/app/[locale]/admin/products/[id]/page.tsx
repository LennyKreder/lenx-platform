import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId, getAdminSiteType } from '@/lib/admin-site';
import { DigitalProductForm } from '@/components/admin/products/digital/DigitalProductForm';
import { PhysicalProductForm } from '@/components/admin/products/physical/PhysicalProductForm';
import { ProductMediaSection } from '@/components/admin/products/ProductMediaSection';
import { ProductListingsSection } from '@/components/admin/products/ProductListingsSection';
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

  const product = await prisma.product.findUnique({
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
  });

  if (!product) {
    notFound();
  }

  const productImages = (product.images as string[]) || [];
  const productVideoUrl = (product as { videoUrl?: string | null }).videoUrl ?? null;

  if (isPhysical) {
    const [categories, families] = await Promise.all([
      prisma.category.findMany({
        where: { siteId, type: 'product', isActive: true },
        include: { translations: true },
        orderBy: { sortOrder: 'asc' },
      }).then((cats) =>
        cats.map((c) => ({
          id: c.id,
          name: c.translations.find((t) => t.languageCode === 'en')?.name
            || c.translations[0]?.name || `Category ${c.id}`,
        }))
      ),
      prisma.productFamily.findMany({
        where: { siteId, isActive: true },
        orderBy: { name: 'asc' },
      }).then((fams) =>
        fams.map((f) => ({ id: f.id, name: f.name }))
      ),
    ]);

    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Product</h2>
          <p className="text-muted-foreground">
            Update the product details, images, and settings.
          </p>
        </div>

        <ProductMediaSection
          productId={productId}
          initialImages={productImages}
          initialVideoUrl={productVideoUrl}
        />

        <div className="rounded-lg border bg-card p-6">
          <PhysicalProductForm
            product={product}
            categories={categories}
            families={families}
          />
        </div>

        <ProductListingsSection productId={productId} />
      </div>
    );
  }

  // Digital product
  const templates = await prisma.productTemplate.findMany({
    where: { isActive: true, siteId },
    include: {
      translations: true,
      slugs: { where: { isPrimary: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  const productSlug = product.slugs[0]?.slug;
  const productType = product.productType || 'planner';
  const yearSegment = product.year ? String(product.year) : 'undated';

  let productUrl: string | null = null;
  if (productSlug && product.isPublished) {
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
          <Link href={`/en/admin/products/${productId}/files`}>
            <Button variant="outline">
              <FileText className="h-4 w-4" />
              Manage Files ({product._count.files})
            </Button>
          </Link>
        </div>
      </div>

      <ProductMediaSection
        productId={productId}
        initialImages={productImages}
        initialVideoUrl={productVideoUrl}
      />

      <div className="rounded-lg border bg-card p-6">
        <DigitalProductForm
          product={product}
          templates={templates}
        />
      </div>

      <ProductListingsSection productId={productId} />
    </div>
  );
}
