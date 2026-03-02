'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocaleFromPathname, createTranslator, type Locale } from '@/lib/i18n';
import { translatePath } from '@/lib/route-slugs';
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

export function Footer() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const t = createTranslator(locale);
  const site = useSite();
  const [footerLinks, setFooterLinks] = useState<MenuItem[]>([]);
  const [menuLoaded, setMenuLoaded] = useState(false);

  useEffect(() => {
    async function fetchMenus() {
      try {
        const response = await fetch('/api/menus');
        if (response.ok) {
          const data = await response.json();
          setFooterLinks((data.footer || []).filter((item: MenuItem) => item.active !== false));
        }
      } catch {
        // Use defaults on error
      } finally {
        setMenuLoaded(true);
      }
    }
    fetchMenus();
  }, []);

  // Default footer links as fallback (filtered by site features)
  const defaultLinks: MenuItem[] = [
    { label: t('footer.about'), href: '/about' },
    { label: t('footer.contact'), href: '/contact' },
    ...(site.hasBlog ? [{ label: 'Blog', href: '/blog' }] : []),
    { label: t('footer.terms'), href: '/terms' },
    ...(site.hasDigitalDelivery ? [{ label: t('footer.howToImport'), href: '/how-to-import' }] : []),
    ...(site.code === 'lbl' ? [{ label: 'Etsy', href: 'https://www.etsy.com/shop/LayoutsByLenny', external: true }] : []),
    ...(site.hasDigitalDelivery ? [{ label: t('header.library'), href: '/library' }] : []),
  ];

  const links = menuLoaded && footerLinks.length > 0 ? footerLinks : defaultLinks;

  return (
    <footer className="border-t py-8 md:py-12">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="font-semibold">{site.footerText || site.name}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          {links.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {getLocalizedLabel(link, locale)}
              </a>
            ) : (
              <Link
                key={link.href}
                href={`/${locale}${translatePath(link.href, locale as Locale)}`}
                className="hover:text-foreground transition-colors"
              >
                {getLocalizedLabel(link, locale)}
              </Link>
            )
          )}
        </div>
      </div>
      <div className="container mt-8 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} {site.name}
        {site.companyInfo && (
          <>
            {site.companyInfo.name && <> &middot; {site.companyInfo.name}</>}
            {site.companyInfo.cocNumber && <> &middot; {locale === 'nl' ? 'KvK' : 'CoC'} {site.companyInfo.cocNumber}</>}
            {site.companyInfo.vatNumber && <> &middot; {locale === 'nl' ? 'BTW' : 'VAT'} {site.companyInfo.vatNumber}</>}
          </>
        )}
      </div>
    </footer>
  );
}
