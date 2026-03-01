'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Tag, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { useCart } from '@/contexts/CartContext';
import { CartItem } from './CartItem';
import { formatPrice } from '@/lib/cart';

interface CartDrawerProps {
  locale: string;
}

export function CartDrawer({ locale }: CartDrawerProps) {
  const {
    items,
    isOpen,
    setIsOpen,
    totalInCents,
    removeItem,
    isLoading,
    appliedDiscount,
    setAppliedDiscount,
  } = useCart();

  const [discountInput, setDiscountInput] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const currency = items[0]?.currency || 'EUR';
  const isNL = locale === 'nl';

  const finalTotal = appliedDiscount
    ? Math.max(0, totalInCents - appliedDiscount.discountAmount)
    : totalInCents;

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;

    setDiscountLoading(true);
    setDiscountError(null);

    try {
      const response = await fetch('/api/checkout/validate-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountInput.trim(),
          orderTotalInCents: totalInCents,
          cartItems: items.map((item) => ({
            productId: item.productId,
            bundleId: item.bundleId,
            isAllAccessBundle: item.isAllAccessBundle,
            priceInCents: item.priceInCents * item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setDiscountError(data.error || (isNL ? 'Ongeldige code' : 'Invalid code'));
        return;
      }

      setAppliedDiscount({
        code: data.discountCode.code,
        name: data.discountCode.name,
        type: data.discountCode.type,
        valueInCents: data.discountCode.valueInCents,
        valuePercent: data.discountCode.valuePercent,
        discountAmount: data.discountCode.discountAmount,
      });
      setDiscountInput('');
    } catch {
      setDiscountError(isNL ? 'Er ging iets mis' : 'Something went wrong');
    } finally {
      setDiscountLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {isNL ? 'Winkelwagen' : 'Shopping Cart'}
          </SheetTitle>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {isNL ? 'Je winkelwagen is leeg' : 'Your cart is empty'}
              </p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setIsOpen(false)}
              >
                {isNL ? 'Verder winkelen' : 'Continue shopping'}
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <CartItem
                  key={item.productId}
                  item={item}
                  locale={locale}
                  onRemove={removeItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with Discount, Total and Checkout */}
        {items.length > 0 && (
          <SheetFooter className="flex-col gap-4">
            {/* Discount Code Section */}
            <div className="w-full space-y-2">
              {appliedDiscount ? (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      {appliedDiscount.code}
                    </span>
                    <span className="text-xs text-green-600">
                      (-{formatPrice(appliedDiscount.discountAmount, currency, locale)})
                    </span>
                  </div>
                  <button
                    onClick={() => setAppliedDiscount(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={discountInput}
                    onChange={(e) => {
                      setDiscountInput(e.target.value.toUpperCase());
                      setDiscountError(null);
                    }}
                    placeholder={isNL ? 'Kortingscode' : 'Discount code'}
                    className="text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyDiscount}
                    disabled={discountLoading || !discountInput.trim()}
                  >
                    {discountLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      isNL ? 'Toepassen' : 'Apply'
                    )}
                  </Button>
                </div>
              )}
              {discountError && (
                <p className="text-xs text-destructive">{discountError}</p>
              )}
            </div>

            {/* Total */}
            <div className="w-full space-y-1">
              {appliedDiscount && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{isNL ? 'Subtotaal' : 'Subtotal'}</span>
                  <span>{formatPrice(totalInCents, currency, locale)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {isNL ? 'Totaal' : 'Total'}
                </span>
                <span className="text-lg font-bold">
                  {formatPrice(finalTotal, currency, locale)}
                </span>
              </div>
            </div>

            <Button asChild className="w-full" size="lg">
              <Link
                href={`/${locale}/checkout`}
                onClick={() => setIsOpen(false)}
              >
                {isNL ? 'Afrekenen' : 'Checkout'}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              {isNL ? 'Verder winkelen' : 'Continue Shopping'}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
