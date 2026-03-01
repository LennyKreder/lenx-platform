'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/admin/shared/DataTable';
import { Eye, Trash2 } from 'lucide-react';

interface CategoryProduct {
  id: number;
  translations: { languageCode: string; name: string | null }[];
}

interface CategoryChild {
  id: number;
  translations: { languageCode: string; name: string }[];
}

interface ParentOption {
  id: number;
  name: string;
}

interface Category {
  id: number;
  sortOrder: number;
  isActive: boolean;
  translations: { languageCode: string; name: string }[];
  parent: { id: number; translations: { languageCode: string; name: string }[] } | null;
  children: CategoryChild[];
  products: CategoryProduct[];
  _count: { children: number; products: number };
}

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/categories/${id}`).then((res) => res.json()),
      fetch('/api/admin/categories?type=product').then((res) => res.json()),
    ])
      .then(([catData, listData]) => {
        if (catData.error) {
          setError(catData.error);
        } else {
          setCategory(catData);
          const enName = catData.translations.find((t: { languageCode: string }) => t.languageCode === 'en')?.name
            || catData.translations[0]?.name || '';
          setName(enName);
          setParentId(catData.parent?.id || null);
          setSortOrder(catData.sortOrder);
          setIsActive(catData.isActive);
        }
        if (listData.categories) {
          setParents(
            listData.categories
              .filter((c: { id: number }) => c.id !== parseInt(id, 10))
              .map((c: { id: number; translations: { languageCode: string; name: string }[] }) => ({
                id: c.id,
                name: c.translations.find((t) => t.languageCode === 'en')?.name || c.translations[0]?.name || `Category ${c.id}`,
              }))
          );
        }
        setIsLoading(false);
      })
      .catch(() => {
        setError('Failed to load category');
        setIsLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translations: [{ languageCode: 'en', name }],
          parentId,
          sortOrder,
          isActive,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update');
      }

      setCategory((prev) =>
        prev
          ? {
              ...prev,
              translations: [{ languageCode: 'en', name }],
              sortOrder,
              isActive,
            }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete');
      }

      router.push('/en/admin/categories');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!category) {
    return <div className="text-destructive">{error || 'Category not found'}</div>;
  }

  const getName = (translations: { languageCode: string; name: string | null }[]) =>
    translations.find((t) => t.languageCode === 'en')?.name
    || translations[0]?.name || '—';

  const childColumns: Column<CategoryChild>[] = [
    {
      key: 'name',
      header: 'Subcategory',
      cell: (child) => (
        <Link
          href={`/en/admin/categories/${child.id}`}
          className="font-medium hover:underline"
        >
          {getName(child.translations)}
        </Link>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (child) => (
        <Link href={`/en/admin/categories/${child.id}`}>
          <Button variant="ghost" size="icon-sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
      className: 'w-16',
    },
  ];

  const productColumns: Column<CategoryProduct>[] = [
    {
      key: 'name',
      header: 'Product',
      cell: (product) => {
        const productName = getName(product.translations) || `Product #${product.id}`;
        return (
          <Link
            href={`/en/admin/products/${product.id}`}
            className="font-medium hover:underline"
          >
            {productName}
          </Link>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      cell: (product) => (
        <Link href={`/en/admin/products/${product.id}`}>
          <Button variant="ghost" size="icon-sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
      className: 'w-16',
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Category</h2>
          <p className="text-muted-foreground">
            Manage category details, subcategories, and products.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Category Form */}
      <div className="rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parentId">Parent Category</Label>
            <select
              id="parentId"
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">None (top-level)</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="font-normal">
              Active
            </Label>
          </div>

          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </div>

      {/* Subcategories */}
      {category.children.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Subcategories</h3>
          <DataTable
            columns={childColumns}
            data={category.children}
            keyField="id"
            emptyMessage="No subcategories."
          />
        </div>
      )}

      {/* Products */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Products in this Category</h3>
        <DataTable
          columns={productColumns}
          data={category.products}
          keyField="id"
          emptyMessage="No products in this category yet. Assign products from the product edit page."
        />
      </div>
    </div>
  );
}
