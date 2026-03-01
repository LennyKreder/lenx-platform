'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPageClient() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || 'en';
  const returnTo = searchParams.get('returnTo');
  const error = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    error === 'invalid_token'
      ? locale === 'nl'
        ? 'Deze code is ongeldig of verlopen. Vraag een nieuwe aan.'
        : 'This code is invalid or expired. Please request a new one.'
      : null
  );

  const codeInputRef = useRef<HTMLInputElement>(null);
  const isNL = locale === 'nl';

  // Focus code input when switching to code step
  useEffect(() => {
    if (step === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/library/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      setStep('code');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Translate API error messages
  const translateError = (error: string): string => {
    const errorTranslations: Record<string, Record<string, string>> = {
      'Invalid or expired code': {
        en: 'Invalid or expired code',
        nl: 'Ongeldige of verlopen code',
      },
      'Invalid email or code': {
        en: 'Invalid email or code',
        nl: 'Ongeldig e-mailadres of code',
      },
      'Email and code are required': {
        en: 'Email and code are required',
        nl: 'E-mailadres en code zijn verplicht',
      },
      'An error occurred': {
        en: 'An error occurred',
        nl: 'Er is een fout opgetreden',
      },
      'Invalid code': {
        en: 'Invalid code',
        nl: 'Ongeldige code',
      },
    };
    return errorTranslations[error]?.[locale] || errorTranslations[error]?.en || error;
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/library/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Cookie is set on the POST response via cookies() API (same as admin login).
      // Use full page navigation to guarantee the browser sends the new cookie
      // on the next request — router.push() can serve cached RSC responses
      // that miss the cookie in some edge cases.
      window.location.href = returnTo || `/${locale}/account`;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setErrorMessage(translateError(errorMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setCode('');

    try {
      const response = await fetch('/api/library/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isNL ? 'Terug naar home' : 'Back to home'}
        </Link>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isNL ? 'Inloggen' : 'Log in'}
            </CardTitle>
            <CardDescription>
              {step === 'email'
                ? isNL
                  ? 'Voer je e-mailadres in om een verificatiecode te ontvangen.'
                  : 'Enter your email to receive a verification code.'
                : isNL
                  ? `We hebben een code gestuurd naar ${email}`
                  : `We sent a code to ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    {isNL ? 'E-mailadres' : 'Email address'}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isNL ? 'jouw@email.nl' : 'your@email.com'}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isNL ? 'Verzenden...' : 'Sending...'}
                    </>
                  ) : (
                    isNL ? 'Code versturen' : 'Send code'
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  {isNL
                    ? 'We sturen je een e-mail met een 6-cijferige code om in te loggen.'
                    : "We'll send you an email with a 6-digit code to log in."}
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">
                    {isNL ? 'Verificatiecode' : 'Verification code'}
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={codeInputRef}
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="pl-10 text-center text-lg tracking-widest font-mono"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isNL ? 'Verifiëren...' : 'Verifying...'}
                    </>
                  ) : (
                    isNL ? 'Inloggen' : 'Log in'
                  )}
                </Button>

                <div className="flex flex-col gap-2 text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-sm text-muted-foreground hover:text-foreground underline disabled:opacity-50"
                  >
                    {isNL ? 'Nieuwe code versturen' : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setErrorMessage(null);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {isNL ? 'Ander e-mailadres gebruiken' : 'Use different email'}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
