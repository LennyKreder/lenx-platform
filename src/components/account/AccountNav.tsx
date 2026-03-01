'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, Download, User, LogOut } from 'lucide-react';
// NOTE: Logout uses <a> instead of <Link> because <Link> prefetches its target,
// which would call the logout API endpoint and clear the session cookie.
import { cn } from '@/lib/utils';

interface AccountNavProps {
  locale: string;
}

export function AccountNav({ locale }: AccountNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: `/${locale}/account`,
      label: locale === 'nl' ? 'Overzicht' : 'Overview',
      icon: User,
      exact: true,
    },
    {
      href: `/${locale}/account/orders`,
      label: locale === 'nl' ? 'Bestellingen' : 'Orders',
      icon: Package,
    },
    {
      href: `/${locale}/account/downloads`,
      label: locale === 'nl' ? 'Mijn downloads' : 'My Downloads',
      icon: Download,
    },
  ];

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}

      <div className="pt-4 mt-4 border-t">
        <a
          href={`/api/library/auth/logout?locale=${locale}`}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {locale === 'nl' ? 'Uitloggen' : 'Log out'}
        </a>
      </div>
    </nav>
  );
}
