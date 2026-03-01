'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/admin/shared/StatusBadge';
import { InlineConfirm } from '@/components/admin/shared/ConfirmDialog';
import { Package, Layers, Trash2, FileText, ShieldCheck, ShieldX } from 'lucide-react';
import { themes } from '@/config/themes';

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface ProductTemplateTranslation {
  languageCode: string;
  name: string;
}

interface BundleTranslation {
  languageCode: string;
  name: string;
}

interface ProductTranslation {
  languageCode: string;
  name: string | null;
}

interface Product {
  id: number;
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
  slugs: SlugRoute[];
  translations: ProductTranslation[];
  template: { translations: ProductTemplateTranslation[] } | null;
}

interface Bundle {
  id: number;
  isAllAccess: boolean;
  slugs: SlugRoute[];
  translations: BundleTranslation[];
}

interface OrderItem {
  id: number;
  productId: number | null;
  bundleId: number | null;
  quantity: number;
  priceInCents: number;
  product: Product | null;
  bundle: Bundle | null;
}

interface Customer {
  id: number;
  email: string;
}

interface Order {
  id: number;
  orderNumber: string | null;
  customerId: number | null;
  customerEmail: string;
  source: string;
  externalId: string | null;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  currency: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  customer: Customer | null;
  items: OrderItem[];
}

interface OrderDetailsProps {
  order: Order;
}

// accessId by "product-{id}" or "bundle-{id}" key
type AccessMap = Map<string, number>;

// Helper functions
function getTemplateName(translations: ProductTemplateTranslation[]): string {
  return translations.find(t => t.languageCode === 'en')?.name || translations[0]?.name || 'Unnamed';
}

function getBundleName(translations: BundleTranslation[]): string {
  return translations.find(t => t.languageCode === 'en')?.name || translations[0]?.name || 'Unnamed';
}

export function OrderDetails({ order: initialOrder }: OrderDetailsProps) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [isUpdating, setIsUpdating] = useState(false);
  const [accessMap, setAccessMap] = useState<AccessMap>(new Map());
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessActionId, setAccessActionId] = useState<string | null>(null);

  const fetchAccess = useCallback(async () => {
    if (!order.customerId) return;
    setAccessLoading(true);
    try {
      const response = await fetch(`/api/admin/customers/${order.customerId}/access`);
      if (response.ok) {
        const records: { id: number; productId: number | null; bundleId: number | null }[] = await response.json();
        const map: AccessMap = new Map();
        for (const record of records) {
          if (record.productId) map.set(`product-${record.productId}`, record.id);
          if (record.bundleId) map.set(`bundle-${record.bundleId}`, record.id);
        }
        setAccessMap(map);
      }
    } finally {
      setAccessLoading(false);
    }
  }, [order.customerId]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const handleGrantAccess = async (item: OrderItem) => {
    if (!order.customerId) return;
    const key = item.productId ? `product-${item.productId}` : `bundle-${item.bundleId}`;
    setAccessActionId(key);
    try {
      const response = await fetch(`/api/admin/customers/${order.customerId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(item.productId ? { productId: item.productId } : { bundleId: item.bundleId }),
          grantedBy: 'admin',
          orderId: order.id,
        }),
      });
      if (response.ok) {
        await fetchAccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to grant access');
      }
    } finally {
      setAccessActionId(null);
    }
  };

  const handleRevokeAccess = async (item: OrderItem) => {
    if (!order.customerId) return;
    const key = item.productId ? `product-${item.productId}` : `bundle-${item.bundleId}`;
    const accessId = accessMap.get(key);
    if (!accessId) return;
    setAccessActionId(key);
    try {
      const response = await fetch(
        `/api/admin/customers/${order.customerId}/access?accessId=${accessId}`,
        { method: 'DELETE' },
      );
      if (response.ok) {
        await fetchAccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to revoke access');
      }
    } finally {
      setAccessActionId(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        // Re-fetch access since status change to completed may grant access
        fetchAccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update status');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      router.push('/en/admin/orders');
      router.refresh();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete order');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Order #{order.orderNumber || order.id}</h2>
          <p className="text-muted-foreground">
            Created on {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={order.status}
            onValueChange={handleStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          {order.status === 'completed' && (
            <Button asChild variant="outline">
              <a
                href={`/api/orders/${order.id}/invoice?locale=en`}
                download={`invoice-${order.orderNumber || order.id}.pdf`}
              >
                <FileText className="h-4 w-4 mr-2" />
                Invoice
              </a>
            </Button>
          )}
          <InlineConfirm onConfirm={handleDelete}>
            <Button variant="outline" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </InlineConfirm>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.orderNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number</span>
                <span className="font-mono text-sm">{order.orderNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge
                status={
                  (order.status as 'completed' | 'pending' | 'cancelled' | 'refunded') || 'pending'
                }
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source</span>
              <span className="capitalize">{order.source}</span>
            </div>
            {order.externalId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">External ID</span>
                <span>{order.externalId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span>{order.currency}</span>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              {order.customer ? (
                <Link
                  href={`/en/admin/customers/${order.customer.id}`}
                  className="hover:underline"
                >
                  {order.customerEmail}
                </Link>
              ) : (
                <span>{order.customerEmail}</span>
              )}
            </div>
            {order.customer && (
              <Link href={`/en/admin/customers/${order.customer.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  View Customer
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>
                {order.currency} {(order.subtotalInCents / 100).toFixed(2)}
              </span>
            </div>
            {order.discountInCents > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>
                  -{order.currency} {(order.discountInCents / 100).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Total</span>
              <span>
                {order.currency} {(order.totalInCents / 100).toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Items ({order.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {order.items.map((item) => {
              const isProduct = !!item.product;
              const themeData =
                item.product?.theme
                  ? themes[item.product.theme as keyof typeof themes]
                  : null;
              const accessKey = item.productId
                ? `product-${item.productId}`
                : item.bundleId
                ? `bundle-${item.bundleId}`
                : null;
              const hasAccess = accessKey ? accessMap.has(accessKey) : false;
              const isActionLoading = accessKey === accessActionId;

              return (
                <div key={item.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {isProduct ? (
                      <Package className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      {isProduct ? (
                        <>
                          <span className="font-medium">
                            {item.product
                              ? item.product.template
                                ? getTemplateName(item.product.template.translations)
                                : item.product.translations.find(t => t.languageCode === 'en')?.name || 'Standalone Product'
                              : 'Unknown'}
                          </span>
                          <span className="text-muted-foreground text-sm ml-2">
                            {[
                              item.product?.year,
                              themeData?.name,
                              item.product?.contentLanguage?.toUpperCase(),
                              item.product && !item.product.template && '(Standalone)',
                            ]
                              .filter(Boolean)
                              .join(' / ')}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-medium">
                            {item.bundle ? getBundleName(item.bundle.translations) : 'Unknown'}
                          </span>
                          {item.bundle?.isAllAccess && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              All Access
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.customerId && accessKey && !accessLoading && (
                      hasAccess ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Has access
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                            onClick={() => handleRevokeAccess(item)}
                            disabled={isActionLoading}
                          >
                            <ShieldX className="h-3.5 w-3.5 mr-1" />
                            Revoke
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleGrantAccess(item)}
                          disabled={isActionLoading}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          Grant Access
                        </Button>
                      )
                    )}
                    <div className="text-right">
                      <span className="font-medium">
                        {order.currency} {(item.priceInCents / 100).toFixed(2)}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-muted-foreground text-sm ml-2">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
