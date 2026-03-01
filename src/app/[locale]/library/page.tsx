'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AccessCodeForm } from '@/components/library/AccessCodeForm';
import { getLocaleFromPathname } from '@/lib/i18n';
import { useSite } from '@/contexts/SiteContext';

export default function LibraryEntryPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const site = useSite();

  if (!site.hasDigitalDelivery) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link href={`/${locale}`} className="text-xl font-bold">
            {site.name}
          </Link>
          <LanguageSwitcher variant="compact" />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <AccessCodeForm />
      </main>
      <footer className="border-t py-4">
        <div className="container text-center text-sm text-muted-foreground">
          <p>
            <a
              href="https://www.etsy.com/shop/LayoutsByLenny"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Etsy Shop
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
