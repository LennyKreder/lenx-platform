'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartItem as CartItemType, formatPrice } from '@/lib/cart';
import { themes } from '@/config/themes';

interface CartPageItemProps {
  item: CartItemType;
  locale: string;
  onRemove: (productId: number, bundleId?: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  showQuantity?: boolean;
}

export function CartPageItem({
  item,
  locale,
  onRemove,
  onUpdateQuantity,
  showQuantity = false,
}: CartPageItemProps) {
  const [qtyInput, setQtyInput] = useState(String(item.quantity));

  const themeColor = item.theme ? themes[item.theme as keyof typeof themes]?.previewColor : undefined;
  const hasRealImage = item.image && !item.image.includes('placeholder');
  const lineTotal = item.priceInCents * item.quantity;

  const handleDecrement = () => {
    if (item.quantity > 1) {
      const newQty = item.quantity - 1;
      onUpdateQuantity(item.productId, newQty);
      setQtyInput(String(newQty));
    }
  };

  const handleIncrement = () => {
    const newQty = item.quantity + 1;
    onUpdateQuantity(item.productId, newQty);
    setQtyInput(String(newQty));
  };

  const handleQtyChange = (value: string) => {
    setQtyInput(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      onUpdateQuantity(item.productId, parsed);
    }
  };

  const handleQtyBlur = () => {
    const parsed = parseInt(qtyInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setQtyInput(String(item.quantity));
    }
  };

  return (
    <div className="flex gap-4 py-4">
      {/* Image */}
      {item.href ? (
        <Link href={item.href} className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0 block"
          style={!hasRealImage && themeColor ? { backgroundColor: themeColor } : undefined}
        >
          {hasRealImage ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : null}
        </Link>
      ) : (
        <div
          className="w-20 h-20 rounded-md overflow-hidden bg-muted shrink-0"
          style={!hasRealImage && themeColor ? { backgroundColor: themeColor } : undefined}
        >
          {hasRealImage ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : null}
        </div>
      )}

      {/* Name + Price */}
      <div className="flex-1 min-w-0">
        {item.href ? (
          <Link href={item.href} className="font-medium text-sm line-clamp-2 hover:underline">
            {item.name}
          </Link>
        ) : (
          <h3 className="font-medium text-sm line-clamp-2">{item.name}</h3>
        )}
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

        {/* Quantity controls (mobile, physical only) */}
        {showQuantity && (
          <div className="flex items-center gap-1 mt-2 sm:hidden">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleDecrement}
              disabled={item.quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={qtyInput}
              onChange={(e) => handleQtyChange(e.target.value)}
              onBlur={handleQtyBlur}
              min={1}
              className="w-14 h-8 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleIncrement}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Quantity controls (desktop, physical only) */}
      {showQuantity && (
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleDecrement}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={qtyInput}
            onChange={(e) => handleQtyChange(e.target.value)}
            onBlur={handleQtyBlur}
            min={1}
            className="w-14 h-8 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleIncrement}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Line total (only meaningful with quantity) */}
      {showQuantity && (
        <div className="hidden sm:flex items-center min-w-[80px] justify-end">
          <span className="font-medium text-sm">
            {formatPrice(lineTotal, item.currency, locale)}
          </span>
        </div>
      )}

      {/* Remove */}
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
