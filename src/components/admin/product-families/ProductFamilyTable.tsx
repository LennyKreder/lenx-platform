'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/admin/shared/DataTable';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { Eye } from 'lucide-react';

interface Family {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  _count: { products: number };
}

interface ProductFamilyTableProps {
  families: Family[];
}

export function ProductFamilyTable({ families }: ProductFamilyTableProps) {
  const columns: Column<Family>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (family) => (
        <Link
          href={`/en/admin/product-families/${family.id}`}
          className="font-medium hover:underline"
        >
          {family.name}
        </Link>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (family) => (
        <span className="text-muted-foreground text-sm">
          {family.description ? family.description.slice(0, 80) + (family.description.length > 80 ? '...' : '') : '-'}
        </span>
      ),
    },
    {
      key: 'products',
      header: 'Products',
      cell: (family) => (
        <span className="text-muted-foreground">{family._count.products}</span>
      ),
      className: 'text-center w-24',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (family) => (
        <StatusBadge status={family.isActive ? 'completed' : 'cancelled'} />
      ),
      className: 'w-24',
    },
    {
      key: 'actions',
      header: '',
      cell: (family) => (
        <Link href={`/en/admin/product-families/${family.id}`}>
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
      data={families}
      keyField="id"
      emptyMessage="No product families yet."
    />
  );
}
