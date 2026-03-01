'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { themes } from '@/config/themes';
import { Download } from 'lucide-react';
import { getThumbnailUrl } from '@/lib/image-utils';
import type { AccessibleProduct } from '@/lib/customer-access';

interface LibraryProductCardProps {
  product: AccessibleProduct;
  locale: string;
  accessCode: string;
}

const languageLabels: Record<string, string> = {
  en: 'English',
  nl: 'Nederlands',
};

export function LibraryProductCard({ product, locale, accessCode }: LibraryProductCardProps) {
  const themeConfig = product.theme
    ? themes[product.theme as keyof typeof themes]
    : null;

  // Build product URL - goes to wizard for this specific product
  const productUrl = `/${locale}/library/planner/${accessCode}/product/${product.id}`;

  // Get first image thumbnail or placeholder
  const imageUrl = product.images[0] ? getThumbnailUrl(product.images[0]) : '/placeholder-product.png';

  // Get localized name from translations or fall back to templateName
  const translation = product.translations.find((t) => t.languageCode === locale);
  const productName = translation?.name || product.templateName || 'Unnamed Product';

  return (
    <Link href={productUrl}>
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow group">
        {/* Product Image */}
        <div className="aspect-[4/3] relative bg-muted overflow-hidden">
          <div
            className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundColor: themeConfig?.previewColor || '#f5f5f5',
            }}
          />
          {/* Download indicator */}
          <div className="absolute top-2 right-2">
            <div className="bg-primary text-primary-foreground rounded-full p-1.5">
              <Download className="w-3 h-3" />
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Product Name */}
          <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {productName}
          </h3>

          {/* Variant Info */}
          <div className="flex flex-wrap gap-1">
            {product.year && (
              <Badge variant="secondary" className="text-xs">
                {product.year}
              </Badge>
            )}
            {themeConfig && (
              <Badge variant="outline" className="text-xs">
                <span
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: themeConfig.previewColor }}
                />
                {themeConfig.name}
              </Badge>
            )}
            {product.contentLanguage && (
              <Badge variant="outline" className="text-xs">
                {languageLabels[product.contentLanguage] || product.contentLanguage}
              </Badge>
            )}
          </div>

          {/* Files indicator */}
          {!product.hasFiles && (
            <p className="text-xs text-muted-foreground mt-2">No files available</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
