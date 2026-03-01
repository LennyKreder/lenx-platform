'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getLocaleFromPathname, createTranslator, type Locale } from '@/lib/i18n';
import { translatePath } from '@/lib/route-slugs';
import { CartIcon } from '@/components/header/CartIcon';
import { UserMenu } from '@/components/header/UserMenu';
import { HeaderSearch } from '@/components/header/HeaderSearch';
import { ThemeSwitcher } from '@/components/header/ThemeSwitcher';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, ShoppingBag, Home, Info, Mail, FileText, Newspaper, User, Package, Download, LogOut, LogIn } from 'lucide-react';
import { useSite } from '@/contexts/SiteContext';

interface MenuItem {
  label: string;
  labels?: Record<string, string>;
  href: string;
  external?: boolean;
  active?: boolean;
}

function getLocalizedLabel(item: MenuItem, locale: string): string {
  return item.labels?.[locale] || item.label;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  '/': Home,
  '/shop': ShoppingBag,
  '/about': Info,
  '/contact': Mail,
  '/terms': FileText,
  '/blog': Newspaper,
};

export function Header() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const t = createTranslator(locale);
  const site = useSite();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerLinks, setHeaderLinks] = useState<MenuItem[]>([]);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [userSession, setUserSession] = useState<{ isAuthenticated: boolean; email?: string } | null>(null);

  const isNL = locale === 'nl';

  useEffect(() => {
    async function fetchMenus() {
      try {
        const response = await fetch('/api/menus');
        if (response.ok) {
          const data = await response.json();
          setHeaderLinks((data.header || []).filter((item: MenuItem) => item.active !== false));
        }
      } catch {
        // Use defaults on error
      } finally {
        setMenuLoaded(true);
      }
    }
    fetchMenus();
  }, []);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => setUserSession(data))
      .catch(() => setUserSession({ isAuthenticated: false }));
  }, []);

  // Fallback nav links
  const defaultMobileNavLinks = [
    { href: `/${locale}`, label: 'Home', icon: Home },
    { href: `/${locale}${translatePath('/shop', locale as Locale)}`, label: t('header.shop'), icon: ShoppingBag },
    ...(site.hasBlog ? [{ href: `/${locale}/blog`, label: 'Blog', icon: Newspaper }] : []),
    { href: `/${locale}${translatePath('/about', locale as Locale)}`, label: isNL ? 'Over ons' : 'About', icon: Info },
    { href: `/${locale}${translatePath('/contact', locale as Locale)}`, label: isNL ? 'Contact' : 'Contact', icon: Mail },
    { href: `/${locale}${translatePath('/terms', locale as Locale)}`, label: isNL ? 'Voorwaarden' : 'Terms', icon: FileText },
  ];

  const mobileNavLinks = menuLoaded && headerLinks.length > 0
    ? [
        { href: `/${locale}`, label: 'Home', icon: Home },
        ...headerLinks.map((item) => ({
          href: item.external ? item.href : `/${locale}${translatePath(item.href, locale as Locale)}`,
          label: getLocalizedLabel(item, locale),
          icon: ICON_MAP[item.href] || FileText,
          external: item.external,
        })),
      ]
    : defaultMobileNavLinks;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link href={`/${locale}`} className="flex items-center shrink-0">
          {site.logoUrl ? (
            <img src={site.logoUrl} alt={site.name} className="h-8" />
          ) : (
            <span className="text-lg font-[family-name:var(--font-lexend-deca)]">
              <span className="font-light">Layouts</span>
              <span className="font-medium"> by Lenny</span>
            </span>
          )}
        </Link>

        {/* Center: Search (desktop only) */}
        <div className="hidden md:flex flex-1 justify-center max-w-xl">
          <HeaderSearch
            variant="desktop"
            placeholder={isNL ? 'Zoek producten...' : 'Search products...'}
          />
        </div>

        {/* Right: Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Desktop nav items */}
          {menuLoaded && headerLinks.length > 0 ? (
            headerLinks.map((item) =>
              item.external ? (
                <Button key={item.href} asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <a href={item.href} target="_blank" rel="noopener noreferrer">{getLocalizedLabel(item, locale)}</a>
                </Button>
              ) : (
                <Button key={item.href} asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Link href={`/${locale}${translatePath(item.href, locale as Locale)}`}>{getLocalizedLabel(item, locale)}</Link>
                </Button>
              )
            )
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link href={`/${locale}/shop`}>{t('header.shop')}</Link>
              </Button>
              {site.hasBlog && (
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Link href={`/${locale}/blog`}>Blog</Link>
                </Button>
              )}
            </>
          )}

          {/* Mobile search icon */}
          <div className="md:hidden">
            <HeaderSearch
              variant="mobile"
              placeholder={isNL ? 'Zoek producten...' : 'Search products...'}
            />
          </div>

          {/* Desktop language switcher (mobile has it in menu panel) */}
          <div className="hidden md:block">
            <LanguageSwitcher variant="compact" />
          </div>
          <CartIcon />

          {/* Desktop user menu */}
          <div className="hidden md:block">
            <UserMenu locale={locale} />
          </div>

          {/* Desktop theme switcher (mobile has it in menu panel) */}
          <div className="hidden md:block">
            <ThemeSwitcher />
          </div>

          {/* Mobile menu button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader className="text-left">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              {/* User section at top */}
              <div className="mt-4 mb-2">
                {userSession?.isAuthenticated ? (
                  <>
                    <div className="px-4 py-2 text-sm text-muted-foreground truncate">
                      {userSession.email}
                    </div>
                    <nav className="flex flex-col gap-1">
                      <Link
                        href={`/${locale}/account`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                      >
                        <User className="h-5 w-5 text-muted-foreground" />
                        {isNL ? 'Mijn account' : 'My Account'}
                      </Link>
                      <Link
                        href={`/${locale}/account/orders`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                      >
                        <Package className="h-5 w-5 text-muted-foreground" />
                        {isNL ? 'Bestellingen' : 'Orders'}
                      </Link>
                      {site.hasDigitalDelivery && (
                        <Link
                          href={`/${locale}/account/library`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                        >
                          <Download className="h-5 w-5 text-muted-foreground" />
                          {isNL ? 'Mijn downloads' : 'My Downloads'}
                        </Link>
                      )}
                      <a
                        href={`/api/library/auth/logout?locale=${locale}`}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-destructive"
                      >
                        <LogOut className="h-5 w-5" />
                        {isNL ? 'Uitloggen' : 'Log out'}
                      </a>
                    </nav>
                  </>
                ) : (
                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mx-2"
                  >
                    <LogIn className="h-5 w-5" />
                    {isNL ? 'Inloggen' : 'Log in'}
                  </Link>
                )}
              </div>

              <div className="border-t my-2" />

              {/* Navigation links */}
              <nav className="flex flex-col gap-1">
                {mobileNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                  >
                    <link.icon className="h-5 w-5 text-muted-foreground" />
                    {link.label}
                  </Link>
                ))}
              </nav>

              {/* Language and theme switcher at bottom */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="border-t pt-4 flex items-center justify-between">
                  <LanguageSwitcher variant="default" />
                  <ThemeSwitcher />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>
    </header>
  );
}
