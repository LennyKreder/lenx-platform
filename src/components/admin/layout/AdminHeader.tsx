'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Map paths to titles
const pathTitles: Record<string, string> = {
  '/en/admin': 'Dashboard',
  '/en/admin/templates': 'Product Templates',
  '/en/admin/products': 'Products',
  '/en/admin/bundles': 'Bundles',
  '/en/admin/tags': 'Tags',
  '/en/admin/customers': 'Customers',
  '/en/admin/orders': 'Orders',
  '/en/admin/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  // Check for exact match first
  if (pathTitles[pathname]) {
    return pathTitles[pathname];
  }

  // Check for partial matches (e.g., /en/admin/products/1)
  for (const [path, title] of Object.entries(pathTitles)) {
    if (pathname.startsWith(path + '/')) {
      return title;
    }
  }

  return 'Admin';
}

export function AdminHeader() {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/en/library/admin-login';
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/en" target="_blank">
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4" />
            View Site
          </Button>
        </Link>

        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
