'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/admin/shared/DataTable';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { Eye } from 'lucide-react';

interface Category {
  id: number;
  sortOrder: number;
  isActive: boolean;
  translations: { languageCode: string; name: string }[];
  parent: { translations: { languageCode: string; name: string }[] } | null;
  _count: { children: number; products: number };
}

interface CategoryTableProps {
  categories: Category[];
}

export function CategoryTable({ categories }: CategoryTableProps) {
  const getName = (translations: { languageCode: string; name: string }[]) =>
    translations.find((t) => t.languageCode === 'en')?.name
    || translations[0]?.name || '—';

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (cat) => (
        <Link
          href={`/en/admin/categories/${cat.id}`}
          className="font-medium hover:underline"
        >
          {getName(cat.translations)}
        </Link>
      ),
    },
    {
      key: 'parent',
      header: 'Parent',
      cell: (cat) => (
        <span className="text-muted-foreground text-sm">
          {cat.parent ? getName(cat.parent.translations) : '—'}
        </span>
      ),
    },
    {
      key: 'children',
      header: 'Subcategories',
      cell: (cat) => (
        <span className="text-muted-foreground">{cat._count.children}</span>
      ),
      className: 'text-center w-32',
    },
    {
      key: 'products',
      header: 'Products',
      cell: (cat) => (
        <span className="text-muted-foreground">{cat._count.products}</span>
      ),
      className: 'text-center w-24',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (cat) => (
        <StatusBadge status={cat.isActive ? 'completed' : 'cancelled'} />
      ),
      className: 'w-24',
    },
    {
      key: 'actions',
      header: '',
      cell: (cat) => (
        <Link href={`/en/admin/categories/${cat.id}`}>
          <Button variant="ghost" size="icon-sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
      className: 'w-16',
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={categories}
      keyField="id"
      emptyMessage="No categories yet."
    />
  );
}
