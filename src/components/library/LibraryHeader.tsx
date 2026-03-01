'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLocaleFromPathname, createTranslator } from '@/lib/i18n';
import { usePurchase } from '@/contexts/PurchaseContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/header/ThemeSwitcher';
import { LogOut } from 'lucide-react';
import { useSite } from '@/contexts/SiteContext';

interface LibraryHeaderProps {
  productType: string;
}

export function LibraryHeader({ productType }: LibraryHeaderProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const t = createTranslator(locale);
  const site = useSite();
  const purchase = usePurchase();

  // Show language switcher only if purchase has access to multiple languages
  const showLanguageSwitcher = purchase.language === 'all' || purchase.language === 'nl';

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link href={`/${locale}`} className="text-xl font-bold">
          {site.name}
        </Link>
        <div className="flex items-center gap-4">
          {showLanguageSwitcher && <LanguageSwitcher variant="compact" />}
          <ThemeSwitcher />
          <Link
            href={`/${locale}/library/${productType}`}
            className="text-sm text-muted-foreground hover:text-foreground"
            title={t('header.exitLibrary')}
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
