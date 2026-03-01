'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem as CartItemType } from '@/lib/cart';
import { formatPrice } from '@/lib/cart';
import { themes } from '@/config/themes';

interface CartItemProps {
  item: CartItemType;
  locale: string;
  onRemove: (productId: number, bundleId?: number) => void;
}

export function CartItem({
  item,
  locale,
  onRemove,
}: CartItemProps) {
  // Get theme color for fallback display
  const themeColor = item.theme ? themes[item.theme]?.previewColor : undefined;
  const hasRealImage = item.image && !item.image.includes('placeholder');

  return (
    <div className="flex gap-4 py-4 border-b last:border-b-0">
      {/* Product Image */}
      <div
        className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0"
        style={!hasRealImage && themeColor ? { backgroundColor: themeColor } : undefined}
      >
        {hasRealImage ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2">{item.name}</h3>
        <div className="text-sm mt-1">
          {item.originalPriceInCents && item.originalPriceInCents > item.priceInCents ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground line-through">
                {formatPrice(item.originalPriceInCents, item.currency, locale)}
              </span>
              <span className="text-primary font-medium">
                {formatPrice(item.priceInCents, item.currency, locale)}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {formatPrice(item.priceInCents, item.currency, locale)}
            </span>
          )}
        </div>
      </div>

      {/* Remove Button */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(item.productId, item.bundleId)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
