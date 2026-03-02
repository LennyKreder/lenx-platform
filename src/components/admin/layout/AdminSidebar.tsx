'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileBox,
  Package,
  Tags,
  Layers,
  Users,
  ShoppingCart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Percent,
  Ticket,
  Star,
  MessageSquare,
  DollarSign,
  FileText,
  Newspaper,
  MenuIcon,
  FolderTree,
  PackageSearch,
  Store,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { SiteSwitcher } from './SiteSwitcher';
import { useAdminLayout } from './AdminLayoutProvider';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  // Which site types show this item. undefined = all types
  siteTypes?: ('digital' | 'physical' | '__all__')[];
}

interface NavSection {
  title: string;
  items: NavItem[];
  siteTypes?: ('digital' | 'physical' | '__all__')[];
}

const navigation: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/en/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Templates', href: '/en/admin/templates', icon: FileBox, siteTypes: ['digital'] },
      { label: 'Products', href: '/en/admin/products', icon: Package, siteTypes: ['digital', 'physical', '__all__'] },
      { label: 'Families', href: '/en/admin/product-families', icon: PackageSearch, siteTypes: ['physical', '__all__'] },
      { label: 'Categories', href: '/en/admin/categories', icon: FolderTree, siteTypes: ['physical', '__all__'] },
      { label: 'Bundles', href: '/en/admin/bundles', icon: Layers, siteTypes: ['digital'] },
      { label: 'Pricing', href: '/en/admin/pricing', icon: DollarSign, siteTypes: ['digital'] },
      { label: 'Featured', href: '/en/admin/featured', icon: Star, siteTypes: ['digital'] },
      { label: 'Tags', href: '/en/admin/tags', icon: Tags, siteTypes: ['digital', 'physical'] },
      { label: 'Reviews', href: '/en/admin/reviews', icon: MessageSquare, siteTypes: ['digital', 'physical'] },
    ],
    siteTypes: ['digital', 'physical'],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Customers', href: '/en/admin/customers', icon: Users, siteTypes: ['digital', 'physical'] },
      { label: 'Orders', href: '/en/admin/orders', icon: ShoppingCart },
      { label: 'Discounts', href: '/en/admin/discounts', icon: Percent, siteTypes: ['digital', 'physical'] },
      { label: 'Codes', href: '/en/admin/discount-codes', icon: Ticket, siteTypes: ['digital', 'physical'] },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Pages', href: '/en/admin/pages', icon: FileText, siteTypes: ['digital', 'physical'] },
      { label: 'Blog', href: '/en/admin/blog', icon: Newspaper, siteTypes: ['digital', 'physical'] },
      { label: 'Menus', href: '/en/admin/menus', icon: MenuIcon, siteTypes: ['digital', 'physical'] },
    ],
    siteTypes: ['digital', 'physical'],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Stores', href: '/en/admin/stores', icon: Store, siteTypes: ['digital', 'physical', '__all__'] },
      { label: 'Channels', href: '/en/admin/channels', icon: Radio, siteTypes: ['physical', '__all__'] },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: '/en/admin/settings', icon: Settings, siteTypes: ['digital', 'physical'] },
    ],
    siteTypes: ['digital', 'physical'],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentSiteType, loading } = useAdminLayout();

  const filteredNavigation = useMemo(() => {
    // Determine the effective type for filtering
    const effectiveType = currentSiteType || '__all__';

    return navigation
      .filter((section) => {
        if (!section.siteTypes) return true;
        return section.siteTypes.includes(effectiveType as 'digital' | 'physical' | '__all__');
      })
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!item.siteTypes) return true;
          return item.siteTypes.includes(effectiveType as 'digital' | 'physical' | '__all__');
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [currentSiteType]);

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-muted/30 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/en/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            L
          </div>
          {!isCollapsed && (
            <span className="font-semibold">Lenx Admin</span>
          )}
        </Link>
      </div>

      {/* Site switcher */}
      <SiteSwitcher collapsed={isCollapsed} />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {filteredNavigation.map((section) => (
          <div key={section.title} className="mb-4">
            {!isCollapsed && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/en/admin' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        isCollapsed && 'justify-center px-2'
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn('w-full', isCollapsed ? 'px-2' : 'justify-start')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
