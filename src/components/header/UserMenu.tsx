'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, LogOut, Package, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  locale: string;
}

interface SessionData {
  isAuthenticated: boolean;
  email?: string;
}

export function UserMenu({ locale }: UserMenuProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check session status
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setIsLoading(false);
      })
      .catch(() => {
        setSession({ isAuthenticated: false });
        setIsLoading(false);
      });
  }, []);

  const isNL = locale === 'nl';

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <User className="h-5 w-5" />
      </Button>
    );
  }

  if (!session?.isAuthenticated) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href={`/${locale}/login`}>
          {isNL ? 'Inloggen' : 'Log in'}
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline max-w-[100px] truncate">
            {session.email?.split('@')[0]}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{session.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/account`} className="cursor-pointer">
            <User className="h-4 w-4 mr-2" />
            {isNL ? 'Mijn account' : 'My Account'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/account/orders`} className="cursor-pointer">
            <Package className="h-4 w-4 mr-2" />
            {isNL ? 'Bestellingen' : 'Orders'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/account/library`} className="cursor-pointer">
            <Download className="h-4 w-4 mr-2" />
            {isNL ? 'Mijn downloads' : 'My Downloads'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href={`/api/library/auth/logout?locale=${locale}`}
            className="cursor-pointer text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isNL ? 'Uitloggen' : 'Log out'}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
