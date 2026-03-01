import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSiteId } from '@/lib/admin-site';
import {
  Package,
  Layers,
  Users,
  ShoppingCart,
  Download,
} from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Manage products, orders, and customers',
};

export const dynamic = 'force-dynamic';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  href?: string;
}

function StatCard({ title, value, icon: Icon, description, href }: StatCardProps) {
  const content = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="rounded-full bg-primary/10 p-3">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="rounded-lg border bg-card p-6 block hover:bg-muted/50 transition-colors cursor-pointer">
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      {content}
    </div>
  );
}

export default async function AdminDashboard() {
  const siteId = await getAdminSiteId();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch stats in parallel
  const [
    templatesCount,
    productsCount,
    publishedProductsCount,
    bundlesCount,
    customersCount,
    ordersCount,
    downloadsToday,
    recentOrders,
  ] = await Promise.all([
    prisma.productTemplate.count({ where: { siteId } }),
    prisma.product.count({ where: { siteId } }),
    prisma.product.count({ where: { siteId, isPublished: true } }),
    prisma.bundle.count({ where: { siteId } }),
    prisma.customer.count({ where: { siteId } }),
    prisma.order.count({ where: { siteId } }),
    prisma.downloadLog.count({
      where: { downloadedAt: { gte: today } },
    }),
    prisma.order.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        items: {
          include: {
            product: {
              include: {
                slugs: { where: { isPrimary: true } },
              },
            },
            bundle: {
              include: {
                slugs: { where: { isPrimary: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your site.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Products"
          value={productsCount}
          icon={Package}
          description={`${publishedProductsCount} published`}
          href="/en/admin/products"
        />
        <StatCard
          title="Bundles"
          value={bundlesCount}
          icon={Layers}
          href="/en/admin/bundles"
        />
        <StatCard
          title="Customers"
          value={customersCount}
          icon={Users}
          href="/en/admin/customers"
        />
        <StatCard
          title="Orders"
          value={ordersCount}
          icon={ShoppingCart}
          href="/en/admin/orders"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Product Templates"
          value={templatesCount}
          icon={Package}
          href="/en/admin/templates"
        />
        <StatCard
          title="Downloads Today"
          value={downloadsToday}
          icon={Download}
        />
      </div>

      {/* Recent Orders */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Recent Orders</h3>
        </div>
        <div className="p-6">
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No orders yet. Orders will appear here once customers start purchasing.
            </p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{order.customerEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.items.length} item(s) &middot; {order.source}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {(order.totalInCents / 100).toFixed(2)} {order.currency}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="/en/admin/templates"
            className="rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <h4 className="font-medium">Create Template</h4>
            <p className="text-sm text-muted-foreground">
              Define a new product type
            </p>
          </a>
          <a
            href="/en/admin/products"
            className="rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <h4 className="font-medium">Add Product</h4>
            <p className="text-sm text-muted-foreground">
              Create a new product variant
            </p>
          </a>
          <a
            href="/en/admin/orders"
            className="rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <h4 className="font-medium">View Orders</h4>
            <p className="text-sm text-muted-foreground">
              See all customer orders
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
