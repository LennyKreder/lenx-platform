'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/admin/shared/DataTable';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { InlineConfirm } from '@/components/admin/shared/ConfirmDialog';
import { Pencil, Trash2, FileText, Copy, CopyPlus, Link2, Check, Image as ImageIcon, Video, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { themes } from '@/config/themes';

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface ProductTranslation {
  languageCode: string;
  name: string | null;
  description: string | null;
}

interface TemplateTranslation {
  languageCode: string;
  name: string;
}

interface Product {
  id: number;
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
  productType: string | null;
  device: string | null;
  priceInCents: number;
  currency: string;
  downloadCode: string;
  isPublished: boolean;
  isFeatured: boolean;
  translations: ProductTranslation[];
  slugs: SlugRoute[];
  template: {
    translations: TemplateTranslation[];
    slugs: SlugRoute[];
  } | null;
  _count: { files: number; tags: number };
  imageCount: number;
  hasVideo: boolean;
  site?: { code: string; name: string } | null;
}

interface ProductTableProps {
  products: Product[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  selectedIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
  showSiteColumn?: boolean;
}

// Helper to get translation for a specific language
function getTranslation<T extends { languageCode: string; name: string | null }>(
  translations: T[],
  langCode: string
): string {
  const t = translations.find((tr) => tr.languageCode === langCode);
  return t?.name || translations[0]?.name || '';
}

// Helper to get slug for a specific language
function getSlug(slugs: SlugRoute[], langCode: string): string {
  const s = slugs.find((sl) => sl.languageCode === langCode);
  return s?.slug || slugs[0]?.slug || '';
}

const siteColors: Record<string, string> = {
  matcare: 'bg-emerald-100 text-emerald-800',
  clariz: 'bg-purple-100 text-purple-800',
  jellybean: 'bg-amber-100 text-amber-800',
};

export function ProductTable({
  products,
  pagination,
  onPageChange,
  selectedIds,
  onSelectionChange,
  showSiteColumn,
}: ProductTableProps) {
  const router = useRouter();
  const [localProducts, setLocalProducts] = useState(products);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const [togglingFeatured, setTogglingFeatured] = useState<number | null>(null);

  // Update local products when props change
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelection = new Set(selectedIds);
      localProducts.forEach((p) => newSelection.add(p.id));
      onSelectionChange(newSelection);
    } else {
      const newSelection = new Set(selectedIds);
      localProducts.forEach((p) => newSelection.delete(p.id));
      onSelectionChange(newSelection);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    onSelectionChange(newSelection);
  };

  const allSelected = localProducts.length > 0 && localProducts.every((p) => selectedIds.has(p.id));
  const someSelected = localProducts.some((p) => selectedIds.has(p.id)) && !allSelected;

  const handleToggleFeatured = async (id: number, currentValue: boolean) => {
    setTogglingFeatured(id);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentValue }),
      });

      if (response.ok) {
        setLocalProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isFeatured: !currentValue } : p))
        );
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update featured status');
      }
    } finally {
      setTogglingFeatured(null);
    }
  };

  const handleDuplicate = async (id: number) => {
    setDuplicating(id);
    try {
      const response = await fetch(`/api/admin/products/${id}/duplicate`, {
        method: 'POST',
      });

      if (response.ok) {
        const newProduct = await response.json();
        router.push(`/en/admin/products/${newProduct.id}`);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to duplicate product');
      }
    } finally {
      setDuplicating(null);
    }
  };

  const handleDelete = async (id: number) => {
    const response = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setLocalProducts((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete product');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/en/library/planner/${code}`;
    navigator.clipboard.writeText(url);
  };

  const columns: Column<Product>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={allSelected}
          onCheckedChange={handleSelectAll}
          aria-label="Select all"
          className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
          {...(someSelected && { 'data-state': 'checked' })}
        />
      ),
      cell: (product) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.has(product.id)}
            onCheckedChange={(checked) => handleSelectOne(product.id, checked as boolean)}
            aria-label={`Select product ${product.id}`}
          />
        </div>
      ),
      className: 'w-10',
    },
    {
      key: 'featured',
      header: '',
      cell: (product) => (
        <button
          onClick={() => handleToggleFeatured(product.id, product.isFeatured)}
          disabled={togglingFeatured === product.id}
          className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
          title={product.isFeatured ? 'Remove from featured' : 'Add to featured'}
        >
          <Star
            className={`h-4 w-4 ${
              product.isFeatured
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground hover:text-yellow-400'
            }`}
          />
        </button>
      ),
      className: 'w-10',
    },
    {
      key: 'product',
      header: 'Product',
      cell: (product) => {
        const themeData = product.theme
          ? themes[product.theme as keyof typeof themes]
          : null;
        // Use template name if available, otherwise product's own translation
        const templateName = product.template
          ? getTranslation(product.template.translations, 'en')
          : getTranslation(product.translations as { languageCode: string; name: string | null }[], 'en') || 'Standalone Product';
        return (
          <div className="flex items-center gap-3">
            {themeData && (
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: themeData.previewColor }}
              />
            )}
            <div>
              <Link
                href={`/en/admin/products/${product.id}`}
                className="font-medium hover:underline"
              >
                {templateName}
              </Link>
              <div className="text-xs text-muted-foreground">
                {[
                  product.year,
                  themeData?.name,
                  product.contentLanguage?.toUpperCase(),
                  !product.template && '(Standalone)',
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </div>
            </div>
          </div>
        );
      },
    },
    ...(showSiteColumn
      ? [
          {
            key: 'site' as const,
            header: 'Site',
            cell: (product: Product) => {
              const code = product.site?.code || '';
              const colorClass = siteColors[code] || 'bg-gray-100 text-gray-800';
              return (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                  {product.site?.name || code || '—'}
                </span>
              );
            },
          },
        ]
      : []),
    {
      key: 'productType',
      header: 'Type',
      cell: (product) => (
        <span className="text-muted-foreground">
          {product.productType || '—'}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      cell: (product) => (
        <span>
          {product.currency} {(product.priceInCents / 100).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'files',
      header: <span className="flex items-center justify-center gap-1"><FileText className="h-3 w-3" />Files</span>,
      cell: (product) => (
        <div className="flex items-center justify-center gap-1 text-muted-foreground">
          {product._count.files}
        </div>
      ),
      className: 'text-center',
    },
    {
      key: 'media',
      header: <span className="flex items-center justify-center gap-1"><ImageIcon className="h-3 w-3" />Media</span>,
      cell: (product) => (
        <div className="flex items-center justify-center gap-1 text-muted-foreground">
          {product.imageCount}
          {product.hasVideo && <Video className="h-3 w-3 text-primary" />}
        </div>
      ),
      className: 'text-center',
    },
    {
      key: 'code',
      header: 'Code',
      cell: (product) => (
        <div className="flex items-center gap-1">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
            {product.downloadCode}
          </code>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            onClick={() => copyCode(product.downloadCode)}
            title="Copy code"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            onClick={() => copyLink(product.downloadCode)}
            title="Copy library link"
          >
            <Link2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (product) => (
        <StatusBadge status={product.isPublished ? 'published' : 'draft'} />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (product) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleDuplicate(product.id)}
            disabled={duplicating === product.id}
            title="Duplicate product"
          >
            <CopyPlus className="h-4 w-4" />
          </Button>
          <Link href={`/en/admin/products/${product.id}`}>
            <Button variant="ghost" size="icon-sm" title="Edit product">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <InlineConfirm onConfirm={() => handleDelete(product.id)}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              title="Delete product"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </InlineConfirm>
        </div>
      ),
      className: 'w-32',
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={localProducts}
      keyField="id"
      emptyMessage="No products yet. Create your first product to get started."
      pagination={{
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onPageChange,
      }}
    />
  );
}
