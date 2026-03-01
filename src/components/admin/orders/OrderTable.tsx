'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type Column } from '@/components/admin/shared/DataTable';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { Eye, Search, ShoppingCart, Store, Settings } from 'lucide-react';

interface Order {
  id: number;
  orderNumber: string | null;
  customerEmail: string;
  source: string;
  externalId: string | null;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  currency: string;
  status: string;
  createdAt: Date;
  customer: { id: number; email: string } | null;
  site?: { code: string; name: string };
  _count: { items: number };
}

interface OrderTableProps {
  orders: Order[];
  showSiteColumn?: boolean;
}

const sourceIcons: Record<string, React.ReactNode> = {
  etsy: <Store className="h-4 w-4" />,
  shop: <ShoppingCart className="h-4 w-4" />,
  admin: <Settings className="h-4 w-4" />,
};

const siteColors: Record<string, string> = {
  lbl: 'bg-blue-100 text-blue-800',
  matcare: 'bg-green-100 text-green-800',
  clariz: 'bg-purple-100 text-purple-800',
  jellybean: 'bg-pink-100 text-pink-800',
};

export function OrderTable({ orders: initialOrders, showSiteColumn }: OrderTableProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter);

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleFilterChange = () => {
    // Delay to allow state to update
    setTimeout(fetchOrders, 0);
  };

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: 'Order',
      cell: (order) => (
        <Link
          href={`/en/admin/orders/${order.id}`}
          className="font-medium hover:underline"
        >
          #{order.orderNumber || order.id}
        </Link>
      ),
      className: 'w-20',
    },
    // Conditionally add site column
    ...(showSiteColumn
      ? [
          {
            key: 'site',
            header: 'Site',
            cell: (order: Order) => {
              const code = order.site?.code || '';
              return (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${siteColors[code] || 'bg-gray-100 text-gray-800'}`}
                >
                  {order.site?.name || code}
                </span>
              );
            },
            className: 'w-28',
          } as Column<Order>,
        ]
      : []),
    {
      key: 'source',
      header: 'Source',
      cell: (order) => (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {sourceIcons[order.source] || sourceIcons.admin}
          </span>
          <span className="capitalize">{order.source}</span>
          {order.externalId && (
            <span className="text-xs text-muted-foreground">
              ({order.externalId})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (order) => (
        <div>
          {order.customer ? (
            <Link
              href={`/en/admin/customers/${order.customer.id}`}
              className="hover:underline"
            >
              {order.customerEmail}
            </Link>
          ) : (
            <span className="text-muted-foreground">{order.customerEmail}</span>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      cell: (order) => (
        <span className="text-muted-foreground">{order._count.items}</span>
      ),
      className: 'text-center w-20',
    },
    {
      key: 'total',
      header: 'Total',
      cell: (order) => (
        <span className="font-medium">
          {order.currency} {(order.totalInCents / 100).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (order) => {
        const statusMap: Record<string, 'completed' | 'pending' | 'cancelled' | 'refunded'> = {
          completed: 'completed',
          pending: 'pending',
          cancelled: 'cancelled',
          refunded: 'refunded',
        };
        return (
          <StatusBadge status={statusMap[order.status] || 'pending'} />
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      cell: (order) => (
        <span className="text-muted-foreground">
          {new Date(order.createdAt).toLocaleDateString('en-GB')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (order) => (
        <Link href={`/en/admin/orders/${order.id}`}>
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
      <div className="flex flex-wrap gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-64">
          <Input
            placeholder="Search by email or order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={isLoading}>
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            handleFilterChange();
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sourceFilter}
          onValueChange={(v) => {
            setSourceFilter(v);
            handleFilterChange();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="etsy">Etsy</SelectItem>
            <SelectItem value="shop">Shop</SelectItem>
            <SelectItem value="admin">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        keyField="id"
        emptyMessage="No orders found."
      />
    </div>
  );
}
