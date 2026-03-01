'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { HubChoice } from './HubChoice';
import { HubStepped } from './HubStepped';
import { Button } from '@/components/ui/button';
import { LayoutGrid, ListOrdered, Package } from 'lucide-react';
import { getLocaleFromPathname, createTranslator } from '@/lib/i18n';
import { usePurchase } from '@/contexts/PurchaseContext';

type ViewMode = 'compact' | 'stepped';

export function Hub() {
  const [viewMode, setViewMode] = useState<ViewMode>('stepped');
  const pathname = usePathname();
  const purchase = usePurchase();
  // Derive locale from pathname for accuracy (avoids context timing issues)
  const locale = getLocaleFromPathname(pathname);
  const t = createTranslator(locale);

  return (
    <div>
      {/* Browse Products Link and View Toggle */}
      <div className="container max-w-2xl pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Button variant="outline" asChild>
            <Link href={`/${locale}/library/planner/${purchase.code}/products`}>
              <Package className="h-4 w-4 mr-2" />
              Browse All Products
            </Link>
          </Button>

          {/* View toggle */}
          <div className="flex justify-end gap-1 p-1 bg-muted rounded-lg w-fit">
            <Button
              variant={viewMode === 'stepped' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('stepped')}
              className="gap-2"
            >
              <ListOrdered className="h-4 w-4" />
              <span className="hidden sm:inline">{t('library.hub.viewMode.stepByStep')}</span>
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('compact')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">{t('library.hub.viewMode.compact')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Render selected view */}
      {viewMode === 'compact' ? <HubChoice /> : <HubStepped />}
    </div>
  );
}
