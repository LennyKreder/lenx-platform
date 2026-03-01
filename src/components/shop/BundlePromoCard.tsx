import Link from 'next/link';
import { Package, ArrowRight } from 'lucide-react';

interface BundlePromoCardProps {
  locale: string;
  bundleCount?: number;
}

export function BundlePromoCard({ locale, bundleCount }: BundlePromoCardProps) {
  const isNL = locale === 'nl';

  return (
    <Link href={`/${locale}/shop/bundles`}>
      <div className="group relative rounded-lg border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden hover:border-primary/50 transition-all h-full">
        <div className="aspect-[4/3] flex items-center justify-center p-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 group-hover:bg-primary/20 transition-colors">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
              {isNL ? 'Bekijk alle bundels' : 'View all bundles'}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {isNL
                ? 'Bespaar met onze bundelaanbiedingen'
                : 'Save with our bundle deals'}
            </p>
            {bundleCount !== undefined && bundleCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {bundleCount} {isNL ? 'bundels beschikbaar' : 'bundles available'}
              </p>
            )}
            <div className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-3 group-hover:gap-2 transition-all">
              {isNL ? 'Bekijken' : 'Browse'}
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
