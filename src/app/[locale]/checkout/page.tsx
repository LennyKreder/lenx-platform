'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ShoppingBag, Loader2, Mail, User, Tag, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/cart';
import { trackBeginCheckout } from '@/lib/analytics';
import { themes } from '@/config/themes';

interface SessionData {
  isAuthenticated: boolean;
  email?: string;
}

interface AppliedDiscount {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  discountAmount: number;
  finalTotal: number;
  displayText: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const { items, totalInCents, appliedDiscount: cartDiscount, setAppliedDiscount: setCartDiscount } = useCart();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification code login state
  const [loginEmail, setLoginEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loginStep, setLoginStep] = useState<'email' | 'code'>('email');
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  // Discount code state
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const currency = items[0]?.currency || 'EUR';
  const isNL = locale === 'nl';

  // Calculate final total considering discount
  const finalTotal = appliedDiscount ? appliedDiscount.finalTotal : totalInCents;
  const discountAmount = appliedDiscount ? appliedDiscount.discountAmount : 0;

  // Check session on mount
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setIsCheckingSession(false);
      })
      .catch(() => {
        setSession({ isAuthenticated: false });
        setIsCheckingSession(false);
      });
  }, []);

  // Track begin checkout
  useEffect(() => {
    if (items.length > 0) {
      trackBeginCheckout(
        items.map((item) => ({
          id: item.productId,
          name: item.name,
          priceInCents: item.priceInCents,
          currency: item.currency,
        })),
        totalInCents,
        currency
      );
    }
  }, []);

  // Auto-apply discount from cart context
  useEffect(() => {
    if (cartDiscount && !appliedDiscount) {
      setAppliedDiscount({
        id: 0,
        code: cartDiscount.code,
        type: cartDiscount.type,
        discountAmount: cartDiscount.discountAmount,
        finalTotal: Math.max(0, totalInCents - cartDiscount.discountAmount),
        displayText: cartDiscount.type === 'percentage'
          ? `-${cartDiscount.valuePercent}%`
          : `-${formatPrice(cartDiscount.valueInCents || 0, currency, locale)}`,
      });
    }
  }, [cartDiscount]);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;

    setIsValidatingCode(true);
    setDiscountError(null);

    try {
      // Prepare cart items for exclusion checking
      const cartItems = items.map((item) => ({
        productId: item.productId,
        bundleId: item.bundleId,
        isAllAccessBundle: item.isAllAccessBundle,
        priceInCents: item.priceInCents * item.quantity,
      }));

      const response = await fetch('/api/checkout/validate-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCode.trim(),
          orderTotalInCents: totalInCents,
          cartItems,
        }),
      });

      const data = await response.json();

      if (!data.valid) {
        setDiscountError(data.error || (isNL ? 'Ongeldige kortingscode' : 'Invalid discount code'));
        return;
      }

      setAppliedDiscount(data.discountCode);
      setDiscountCode('');
    } catch (err) {
      setDiscountError(isNL ? 'Fout bij valideren van code' : 'Failed to validate code');
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setCartDiscount(null);
    setDiscountError(null);
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRequestingCode(true);
    setError(null);

    try {
      const response = await fetch('/api/library/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, locale }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      setLoginStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRequestingCode(true);
    setError(null);

    try {
      const response = await fetch('/api/library/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Refresh session state
      setSession({ isAuthenticated: true, email: data.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleCheckout = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          items: items.map((item) => ({
            productId: item.productId,
            bundleId: item.bundleId,
            isAllAccessBundle: item.isAllAccessBundle,
            name: item.name,
            priceInCents: item.priceInCents,
            quantity: item.quantity,
          })),
          currency,
          discountCode: appliedDiscount?.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresLogin) {
          setSession({ isAuthenticated: false });
          throw new Error(isNL ? 'Je moet ingelogd zijn om af te rekenen' : 'You must be logged in to checkout');
        }
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {isNL ? 'Je winkelwagen is leeg' : 'Your cart is empty'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isNL
              ? 'Voeg producten toe aan je winkelwagen om af te rekenen.'
              : 'Add items to your cart to checkout.'}
          </p>
          <Button asChild>
            <Link href={`/${locale}/shop`}>
              {isNL ? 'Naar de winkel' : 'Go to Shop'}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href={`/${locale}/shop`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {isNL ? 'Terug naar winkel' : 'Back to Shop'}
        </Link>

        <h1 className="text-3xl font-bold mb-8">
          {isNL ? 'Afrekenen' : 'Checkout'}
        </h1>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isNL ? 'Besteloverzicht' : 'Order Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => {
                  const themeColor = item.theme ? themes[item.theme as keyof typeof themes]?.previewColor : undefined;
                  const hasRealImage = item.image && !item.image.includes('placeholder');

                  return (
                  <div key={item.productId || item.bundleId} className="flex gap-4">
                    <div
                      className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0"
                      style={!hasRealImage && themeColor ? { backgroundColor: themeColor } : undefined}
                    >
                      {hasRealImage && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isNL ? 'Aantal' : 'Qty'}: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-sm">
                      {formatPrice(
                        item.priceInCents * item.quantity,
                        item.currency,
                        locale
                      )}
                    </p>
                  </div>
                  );
                })}

                {/* Discount Code Section */}
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium">
                    {isNL ? 'Kortingscode' : 'Discount Code'}
                  </Label>
                  {appliedDiscount ? (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-700 dark:text-green-400">
                            {appliedDiscount.code}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {appliedDiscount.displayText}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={handleRemoveDiscount}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder={isNL ? 'Voer code in' : 'Enter code'}
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        disabled={isValidatingCode}
                        className="uppercase"
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyDiscount}
                        disabled={!discountCode.trim() || isValidatingCode}
                      >
                        {isValidatingCode ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Tag className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  {discountError && (
                    <p className="text-sm text-destructive mt-2">{discountError}</p>
                  )}
                </div>

                {/* Order Total */}
                <div className="border-t pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isNL ? 'Subtotaal' : 'Subtotal'}</span>
                    <span>{formatPrice(totalInCents, currency, locale)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{isNL ? 'Korting' : 'Discount'}</span>
                      <span>-{formatPrice(discountAmount, currency, locale)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>{isNL ? 'Totaal' : 'Total'}</span>
                    <span>{formatPrice(finalTotal, currency, locale)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isNL ? 'Inclusief BTW' : 'Including VAT'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Login / Payment Card */}
          <Card>
            {isCheckingSession ? (
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </CardContent>
            ) : session?.isAuthenticated ? (
              <>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {isNL ? 'Ingelogd als' : 'Logged in as'}
                  </CardTitle>
                  <CardDescription>{session.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleCheckout}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isNL ? 'Laden...' : 'Loading...'}
                      </>
                    ) : (
                      <>
                        {isNL ? 'Betalen' : 'Pay'}{' '}
                        {formatPrice(finalTotal, currency, locale)}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    {isNL
                      ? 'Je wordt doorgestuurd naar een beveiligde betaalpagina.'
                      : "You'll be redirected to a secure payment page."}
                  </p>
                </CardContent>
              </>
            ) : loginStep === 'code' ? (
              <>
                <CardHeader>
                  <CardTitle>
                    {isNL ? 'Voer je code in' : 'Enter your code'}
                  </CardTitle>
                  <CardDescription>
                    {isNL
                      ? `We hebben een code gestuurd naar ${loginEmail}`
                      : `We sent a code to ${loginEmail}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">
                        {isNL ? 'Verificatiecode' : 'Verification code'}
                      </Label>
                      <Input
                        id="code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="text-center text-lg tracking-widest font-mono"
                        required
                        disabled={isRequestingCode}
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isRequestingCode || verificationCode.length !== 6}
                    >
                      {isRequestingCode ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isNL ? 'Verifiëren...' : 'Verifying...'}
                        </>
                      ) : (
                        isNL ? 'Doorgaan' : 'Continue'
                      )}
                    </Button>

                    <div className="flex flex-col gap-2 text-center">
                      <button
                        type="button"
                        onClick={handleRequestCode}
                        disabled={isRequestingCode}
                        className="text-sm text-muted-foreground hover:text-foreground underline disabled:opacity-50"
                      >
                        {isNL ? 'Nieuwe code versturen' : 'Resend code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep('email');
                          setVerificationCode('');
                          setError(null);
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {isNL ? 'Ander e-mailadres gebruiken' : 'Use different email'}
                      </button>
                    </div>
                  </form>
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>
                    {isNL ? 'Log in om af te rekenen' : 'Log in to checkout'}
                  </CardTitle>
                  <CardDescription>
                    {isNL
                      ? 'Voer je e-mailadres in om een verificatiecode te ontvangen.'
                      : 'Enter your email to receive a verification code.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRequestCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        {isNL ? 'E-mailadres' : 'Email Address'}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder={isNL ? 'jouw@email.nl' : 'your@email.com'}
                        required
                        disabled={isRequestingCode}
                      />
                    </div>

                    {error && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isRequestingCode || !loginEmail}
                    >
                      {isRequestingCode ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isNL ? 'Verzenden...' : 'Sending...'}
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          {isNL ? 'Code versturen' : 'Send code'}
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      {isNL
                        ? 'We sturen je een e-mail met een 6-cijferige code.'
                        : "We'll send you an email with a 6-digit code."}
                    </p>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
