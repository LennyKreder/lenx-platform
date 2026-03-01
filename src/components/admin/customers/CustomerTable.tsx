'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/admin/shared/DataTable';
import { Eye, Search } from 'lucide-react';

interface Customer {
  id: number;
  email: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  _count: {
    access: number;
    orders: number;
  };
}

interface CustomerTableProps {
  customers: Customer[];
}

export function CustomerTable({ customers: initialCustomers }: CustomerTableProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) {
      setCustomers(initialCustomers);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/admin/customers?search=${encodeURIComponent(search)}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: 'email',
      header: 'Email',
      cell: (customer) => (
        <Link
          href={`/en/admin/customers/${customer.id}`}
          className="font-medium hover:underline"
        >
          {customer.email}
        </Link>
      ),
    },
    {
      key: 'access',
      header: 'Products',
      cell: (customer) => (
        <span className="text-muted-foreground">{customer._count.access}</span>
      ),
      className: 'text-center',
    },
    {
      key: 'orders',
      header: 'Orders',
      cell: (customer) => (
        <span className="text-muted-foreground">{customer._count.orders}</span>
      ),
      className: 'text-center',
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      cell: (customer) => (
        <span className="text-muted-foreground">
          {customer.lastLoginAt
            ? new Date(customer.lastLoginAt).toLocaleDateString('en-GB')
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      cell: (customer) => (
        <span className="text-muted-foreground">
          {new Date(customer.createdAt).toLocaleDateString('en-GB')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (customer) => (
        <Link href={`/en/admin/customers/${customer.id}`}>
          <Button variant="ghost" size="icon-sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
      className: 'w-16',
    },
  ];

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="submit" variant="outline" disabled={isSearching}>
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <DataTable
        columns={columns}
        data={customers}
        keyField="id"
        emptyMessage="No customers found."
      />
    </div>
  );
}
