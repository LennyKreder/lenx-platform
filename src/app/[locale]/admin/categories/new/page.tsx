'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ParentOption {
  id: number;
  name: string;
}

export default function NewCategoryPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/categories?type=product')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setParents(
            data.categories.map((c: { id: number; translations: { languageCode: string; name: string }[] }) => ({
              id: c.id,
              name: c.translations.find((t) => t.languageCode === 'en')?.name || c.translations[0]?.name || `Category ${c.id}`,
            }))
          );
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translations: [{ languageCode: 'en', name }],
          parentId,
          isActive,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create category');
      }

      router.push(`/en/admin/categories/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Category</h2>
        <p className="text-muted-foreground">
          Create a new product category.
        </p>
      </div>

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
              placeholder="e.g. Cleaning Products"
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

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Category'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/en/admin/categories')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
