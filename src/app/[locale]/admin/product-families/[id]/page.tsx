'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DataTable, type Column } from '@/components/admin/shared/DataTable';
import { Eye, Trash2 } from 'lucide-react';

interface FamilyProduct {
  id: number;
  familyValue: string | null;
  sku: string | null;
  priceInCents: number;
  isPublished: boolean;
  translations: { languageCode: string; name: string | null }[];
}

interface Family {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  products: FamilyProduct[];
}

export default function EditProductFamilyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [family, setFamily] = useState<Family | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/product-families/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setFamily(data);
          setName(data.name);
          setDescription(data.description || '');
          setIsActive(data.isActive);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setError('Failed to load family');
        setIsLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/product-families/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, isActive }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update');
      }

      setFamily((prev) => prev ? { ...prev, name, description, isActive } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product family?')) return;

    try {
      const response = await fetch(`/api/admin/product-families/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete');
      }

      router.push('/en/admin/product-families');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!family) {
    return <div className="text-destructive">{error || 'Family not found'}</div>;
  }

  const productColumns: Column<FamilyProduct>[] = [
    {
      key: 'name',
      header: 'Product',
      cell: (product) => {
        const name = product.translations.find((t) => t.languageCode === 'en')?.name
          || product.translations[0]?.name || `Product #${product.id}`;
        return (
          <Link
            href={`/en/admin/products/${product.id}`}
            className="font-medium hover:underline"
          >
            {name}
          </Link>
        );
      },
    },
    {
      key: 'variant',
      header: 'Variant',
      cell: (product) => (
        <span className="text-muted-foreground">{product.familyValue || '-'}</span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      cell: (product) => (
        <span className="text-muted-foreground font-mono text-sm">{product.sku || '-'}</span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      cell: (product) => (
        <span className="font-medium">
          EUR {(product.priceInCents / 100).toFixed(2)}
        </span>
      ),
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
          <h2 className="text-2xl font-bold tracking-tight">Edit Product Family</h2>
          <p className="text-muted-foreground">
            Manage family details and view member products.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Family Form */}
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
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

      {/* Products in Family */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Products in this Family</h3>
        <DataTable
          columns={productColumns}
          data={family.products}
          keyField="id"
          emptyMessage="No products in this family yet. Assign products from the product edit page."
        />
      </div>
    </div>
  );
}
