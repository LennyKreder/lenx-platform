'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Store } from 'lucide-react';
import { useAdminLayout } from './AdminLayoutProvider';

export function SiteSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { currentSite, sites, canViewAll, loading, switchSite } = useAdminLayout();

  if (loading || sites.length <= 1) return null;

  if (collapsed) {
    const isAllSites = currentSite === '__all__';
    return (
      <div className="px-2 py-2">
        <button
          className="flex h-8 w-full items-center justify-center rounded-lg bg-primary/10 text-primary"
          title={isAllSites ? 'All Sites' : (sites.find((s) => s.code === currentSite)?.name || currentSite)}
        >
          {isAllSites ? <Globe className="h-4 w-4" /> : <Store className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <Select value={currentSite} onValueChange={switchSite}>
        <SelectTrigger className="w-full h-9 text-sm">
          {currentSite === '__all__' ? (
            <Globe className="h-4 w-4 mr-2 shrink-0" />
          ) : (
            <Store className="h-4 w-4 mr-2 shrink-0" />
          )}
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {canViewAll && (
            <SelectItem value="__all__">All Sites</SelectItem>
          )}
          {sites.map((site) => (
            <SelectItem key={site.code} value={site.code}>
              {site.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
