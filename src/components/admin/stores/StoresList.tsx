'use client';

import { Globe, Package, Store } from 'lucide-react';

interface SiteInfo {
  id: string;
  code: string;
  name: string;
  siteType: string;
  domains: unknown;
  currency: string;
  defaultLocale: string;
  locales: unknown;
  hasShipping: boolean;
  hasDigitalDelivery: boolean;
  hasBolIntegration: boolean;
  hasBundles: boolean;
  hasTemplates: boolean;
  _count: {
    products: number;
    salesChannels: number;
  };
}

interface StoresListProps {
  sites: SiteInfo[];
}

export function StoresList({ sites }: StoresListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sites.map((site) => {
        const domains = (site.domains as string[]) || [];
        const locales = (site.locales as string[]) || [];

        return (
          <div key={site.id} className="rounded-lg border bg-card p-6 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{site.name}</h3>
                  <p className="text-sm text-muted-foreground">{site.code}</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                {site.siteType}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                {site._count.products} products
              </div>
              <div className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                {site._count.salesChannels} channels
              </div>
              <div>{site.currency}</div>
            </div>

            {domains.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Domains: </span>
                {domains.join(', ')}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {locales.map((locale) => (
                <span key={locale} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {locale}
                </span>
              ))}
              {site.hasShipping && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">Shipping</span>}
              {site.hasDigitalDelivery && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">Digital</span>}
              {site.hasBolIntegration && <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">Bol.com</span>}
              {site.hasBundles && <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">Bundles</span>}
              {site.hasTemplates && <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">Templates</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
