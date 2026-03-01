'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/admin/shared/DataTable';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { InlineConfirm } from '@/components/admin/shared/ConfirmDialog';
import { Pencil, Trash2, Layers, Star, Copy, Link2 } from 'lucide-react';

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface BundleTranslation {
  languageCode: string;
  name: string;
  description: string | null;
}

interface BundleItem {
  productId?: number | null;
}

interface Bundle {
  id: number;
  discountPercent: number | null;
  fixedPriceInCents: number | null;
  currency: string;
  contentLanguage: string | null;
  isAllAccess: boolean;
  isFeatured: boolean;
  downloadCode: string;
  isPublished: boolean;
  translations: BundleTranslation[];
  slugs: SlugRoute[];
  items: BundleItem[];
  _count: { orderItems: number; access: number };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface BundleTableProps {
  bundles: Bundle[];
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  onDelete?: (id: number) => void;
  onFeaturedChange?: (id: number, isFeatured: boolean) => void;
}

// Helper to get translation for a specific language
function getTranslation(
  translations: BundleTranslation[],
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

export function BundleTable({ bundles, pagination, onPageChange, onDelete, onFeaturedChange }: BundleTableProps) {
  const router = useRouter();
  const [togglingFeatured, setTogglingFeatured] = useState<number | null>(null);

  const handleToggleFeatured = async (id: number, currentValue: boolean) => {
    setTogglingFeatured(id);
    try {
      const response = await fetch(`/api/admin/bundles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentValue }),
      });

      if (response.ok) {
        if (onFeaturedChange) {
          onFeaturedChange(id, !currentValue);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update featured status');
      }
    } finally {
      setTogglingFeatured(null);
    }
  };

  const handleDelete = async (id: number) => {
    const response = await fetch(`/api/admin/bundles/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      if (onDelete) {
        onDelete(id);
      }
      router.refresh();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete bundle');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/en/library/planner/${code}`;
    navigator.clipboard.writeText(url);
  };

  const columns: Column<Bundle>[] = [
    {
      key: 'featured',
      header: '',
      cell: (bundle) => (
        <button
          onClick={() => handleToggleFeatured(bundle.id, bundle.isFeatured)}
          disabled={togglingFeatured === bundle.id}
          className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
          title={bundle.isFeatured ? 'Remove from featured' : 'Add to featured'}
        >
          <Star
            className={`h-4 w-4 ${
              bundle.isFeatured
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground hover:text-yellow-400'
            }`}
          />
        </button>
      ),
      className: 'w-10',
    },
    {
      key: 'name',
      header: 'Bundle',
      cell: (bundle) => (
        <div className="flex items-center gap-3">
          {bundle.isAllAccess ? (
            <Star className="h-4 w-4 text-yellow-500" />
          ) : (
            <Layers className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <Link
              href={`/en/admin/bundles/${bundle.id}`}
              className="font-medium hover:underline"
            >
              {getTranslation(bundle.translations, 'en')}
            </Link>
            {bundle.isAllAccess && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                All Access
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug (EN)',
      cell: (bundle) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {getSlug(bundle.slugs, 'en')}
        </code>
      ),
    },
    {
      key: 'shop',
      header: 'Shop',
      cell: (bundle) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
          bundle.contentLanguage
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {bundle.contentLanguage?.toUpperCase() || 'All'}
        </span>
      ),
    },
    {
      key: 'contents',
      header: 'Contents',
      cell: (bundle) => {
        if (bundle.isAllAccess) {
          return <span className="text-muted-foreground">All products</span>;
        }
        const productCount = bundle.items.filter((i) => i.productId).length;
        return (
          <span className="text-muted-foreground">
            {productCount > 0 ? `${productCount} product(s)` : 'Empty'}
          </span>
        );
      },
    },
    {
      key: 'price',
      header: 'Price',
      cell: (bundle) => {
        if (bundle.fixedPriceInCents) {
          return (
            <span>
              {bundle.currency} {(bundle.fixedPriceInCents / 100).toFixed(2)}
            </span>
          );
        }
        if (bundle.discountPercent) {
          return <span>{bundle.discountPercent}% off</span>;
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: 'code',
      header: 'Code',
      cell: (bundle) => (
        <div className="flex items-center gap-1">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
            {bundle.downloadCode}
          </code>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            onClick={() => copyCode(bundle.downloadCode)}
            title="Copy code"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6"
            onClick={() => copyLink(bundle.downloadCode)}
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
      cell: (bundle) => (
        <StatusBadge status={bundle.isPublished ? 'published' : 'draft'} />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (bundle) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/en/admin/bundles/${bundle.id}`}>
            <Button variant="ghost" size="icon-sm">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <InlineConfirm onConfirm={() => handleDelete(bundle.id)}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </InlineConfirm>
        </div>
      ),
      className: 'w-24',
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={bundles}
      keyField="id"
      emptyMessage="No bundles yet. Create your first bundle to offer product collections."
      pagination={
        pagination && onPageChange
          ? {
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange,
            }
          : undefined
      }
    />
  );
}
