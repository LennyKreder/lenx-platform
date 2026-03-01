import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ProductFilesManager } from '@/components/admin/products/ProductFilesManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { themes } from '@/config/themes';

export const metadata = {
  title: 'Product Files - Admin',
};

interface FilePropertyConfig {
  templateSet?: boolean;
  timeFormat?: boolean;
  weekStart?: boolean;
  calendar?: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductFilesPage({ params }: PageProps) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    notFound();
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      template: {
        include: {
          translations: true,
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Get file properties from template (if exists) or default to no variants
  const fileProperties = product.template
    ? (product.template.fileProperties as FilePropertyConfig)
    : {};
  const hasFileVariants = Object.values(fileProperties).some(Boolean);

  const themeData = product.theme
    ? themes[product.theme as keyof typeof themes]
    : null;

  // Get product name: from template if available, otherwise standalone
  const productName = product.template
    ? product.template.translations.find(t => t.languageCode === 'en')?.name || product.template.translations[0]?.name || 'Unnamed Template'
    : 'Standalone Product';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/en/admin/products/${productId}`}>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Product
            </Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Manage Files</h2>
          <div className="flex items-center gap-2 mt-1">
            {themeData && (
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: themeData.previewColor }}
              />
            )}
            <p className="text-muted-foreground">
              {productName}
              {product.year && ` ${product.year}`}
              {themeData && ` - ${themeData.name}`}
              {product.contentLanguage && ` (${product.contentLanguage.toUpperCase()})`}
              {!product.template && ' (Standalone)'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <ProductFilesManager
          productId={productId}
          templateHasFileVariants={hasFileVariants}
        />
      </div>
    </div>
  );
}
