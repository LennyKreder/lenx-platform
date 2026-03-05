'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ChevronLeft, Tag, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { useSite } from '@/contexts/SiteContext';
import { formatPrice } from '@/lib/cart';
import { CartPageItem } from './CartPageItem';

interface CartPageClientProps {
  locale: string;
}

export function CartPageClient({ locale }: CartPageClientProps) {
  const {
    items,
    removeItem,
    updateQuantity,
    totalInCents,
    itemCount,
    isLoading,
    appliedDiscount,
    setAppliedDiscount,
  } = useCart();

  const [discountInput, setDiscountInput] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const { siteType } = useSite();
  const showQuantity = siteType === 'physical';
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          {isNL ? 'Je winkelwagen is leeg' : 'Your cart is empty'}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isNL
            ? 'Voeg producten toe aan je winkelwagen.'
            : 'Add items to your cart to start shopping.'}
        </p>
        <Button asChild>
          <Link href={`/${locale}/shop`}>
            {isNL ? 'Naar de winkel' : 'Go to Shop'}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back link */}
      <Link
        href={`/${locale}/shop`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {isNL ? 'Terug naar winkel' : 'Back to Shop'}
      </Link>

      <h1 className="text-3xl font-bold mb-1">
        {isNL ? 'Winkelwagen' : 'Shopping Cart'}
      </h1>
      <p className="text-muted-foreground mb-8">
        {itemCount === 1
          ? (isNL ? '1 artikel' : '1 item')
          : `${itemCount} ${isNL ? 'artikelen' : 'items'}`}
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Cart Items */}
        <div className="lg:col-span-2">
          <div className="divide-y">
            {items.map((item) => (
              <CartPageItem
                key={`${item.productId}-${item.bundleId || ''}`}
                item={item}
                locale={locale}
                onRemove={removeItem}
                onUpdateQuantity={updateQuantity}
                showQuantity={showQuantity}
              />
            ))}
          </div>

          <div className="mt-6">
            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {isNL ? 'Verder winkelen' : 'Continue Shopping'}
            </Link>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>{isNL ? 'Overzicht' : 'Order Summary'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isNL ? 'Subtotaal' : 'Subtotal'}</span>
                <span>{formatPrice(totalInCents, currency, locale)}</span>
              </div>

              {/* Discount Code Section */}
              <div className="space-y-2">
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

              {/* Discount amount */}
              {appliedDiscount && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{isNL ? 'Korting' : 'Discount'}</span>
                  <span>-{formatPrice(appliedDiscount.discountAmount, currency, locale)}</span>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-bold">{isNL ? 'Totaal' : 'Total'}</span>
                  <span className="text-lg font-bold">
                    {formatPrice(finalTotal, currency, locale)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isNL ? 'Inclusief BTW' : 'Including VAT'}
                </p>
              </div>

              {/* Checkout button */}
              <Button asChild className="w-full" size="lg">
                <Link href={`/${locale}/checkout`}>
                  {isNL ? 'Naar afrekenen' : 'Proceed to Checkout'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
