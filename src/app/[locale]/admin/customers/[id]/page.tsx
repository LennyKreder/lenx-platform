'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerAccessManager } from '@/components/admin/customers/CustomerAccessManager';
import { ArrowLeft, Mail, Calendar, ShoppingBag, Package } from 'lucide-react';

interface Customer {
  id: number;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  _count: {
    access: number;
    orders: number;
  };
}

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

interface Product {
  id: number;
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
  downloadCode: string;
  slugs: SlugRoute[];
  template: { translations: ProductTemplateTranslation[] };
}

interface Bundle {
  id: number;
  downloadCode: string;
  isAllAccess: boolean;
  slugs: SlugRoute[];
  translations: BundleTranslation[];
}

interface Access {
  id: number;
  productId: number | null;
  bundleId: number | null;
  grantedAt: string;
  grantedBy: string;
  product: Product | null;
  bundle: Bundle | null;
}

interface Order {
  id: number;
  orderNumber: string | null;
  source: string;
  externalId: string | null;
  totalInCents: number;
  currency: string;
  status: string;
  createdAt: string;
  items: unknown[];
}

interface CustomerDetails extends Customer {
  access: Access[];
  orders: Order[];
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomer = async () => {
    const response = await fetch(`/api/admin/customers/${resolvedParams.id}`);
    if (response.ok) {
      const data = await response.json();
      setCustomer(data.customer);
      setProducts(data.products);
      setBundles(data.bundles);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCustomer();
  }, [resolvedParams.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Link href="/en/admin/customers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </Link>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Customer not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/en/admin/customers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{customer.email}</h2>
          <p className="text-muted-foreground">Customer Details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{customer.email}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {new Date(customer.createdAt).toLocaleDateString('en-GB')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{customer._count.access}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{customer._count.orders}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Access */}
        <Card>
          <CardHeader>
            <CardTitle>Product Access</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerAccessManager
              customerId={customer.id}
              access={customer.access}
              products={products}
              bundles={bundles}
              onAccessChange={fetchCustomer}
            />
          </CardContent>
        </Card>

        {/* Order History */}
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.orders.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No orders yet.
              </p>
            ) : (
              <div className="space-y-3">
                {customer.orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/en/admin/orders/${order.id}`}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">Order #{order.orderNumber || order.id}</span>
                        {order.externalId && (
                          <span className="text-muted-foreground text-sm ml-2">
                            ({order.source}: {order.externalId})
                          </span>
                        )}
                      </div>
                      <span className="font-medium">
                        {order.currency} {(order.totalInCents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {new Date(order.createdAt).toLocaleDateString('en-GB')} &middot;{' '}
                      {order.items.length} item(s) &middot;{' '}
                      <span
                        className={
                          order.status === 'completed'
                            ? 'text-green-600'
                            : order.status === 'pending'
                            ? 'text-yellow-600'
                            : ''
                        }
                      >
                        {order.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
