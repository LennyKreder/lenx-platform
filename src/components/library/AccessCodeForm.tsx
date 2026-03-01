'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, KeyRound } from 'lucide-react';
import { normalizeDownloadCode, isValidDownloadCode } from '@/lib/download-code';
import { getLocaleFromPathname, createTranslator } from '@/lib/i18n';

interface AccessCodeFormProps {
  productType?: string;
}

export function AccessCodeForm({ productType = 'planner' }: AccessCodeFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Derive locale from pathname for accuracy (avoids context timing issues)
  const locale = getLocaleFromPathname(pathname);
  const t = createTranslator(locale);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedCode = normalizeDownloadCode(code);

    if (!isValidDownloadCode(normalizedCode)) {
      setError(t('library.access.errors.invalid'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/library/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: normalizedCode }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || t('library.access.errors.invalid'));
        setIsLoading(false);
        return;
      }

      // Determine the correct locale for redirect based on purchase language access
      // - undefined/null/'all': use current locale (bundles don't specify language)
      // - 'nl': can access both, use current locale
      // - 'en': must redirect to 'en'
      const purchaseLanguage = data.accessCode?.language || data.purchase?.language;
      let targetLocale = locale;

      if (purchaseLanguage === 'en' && locale !== 'en') {
        // EN-only purchase on non-EN page, redirect to EN
        targetLocale = 'en';
      } else if (purchaseLanguage && purchaseLanguage !== 'all' && purchaseLanguage !== 'en' && purchaseLanguage !== 'nl') {
        // Specific language that's not en/nl, use that language
        targetLocale = purchaseLanguage;
      }

      // Redirect to the library route for this product type
      router.push(`/${targetLocale}/library/${productType}/${normalizedCode}`);
    } catch {
      setError(t('common.error'));
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('library.access.title')}</CardTitle>
        <CardDescription>
          {t('library.access.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-code">{t('library.access.placeholder')}</Label>
            <Input
              id="access-code"
              type="text"
              placeholder="LBL3A7F9C2B"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              className="text-center text-lg tracking-wider font-mono"
              maxLength={11}
              autoComplete="off"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('library.access.submitting')}
              </>
            ) : (
              t('library.access.submit')
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {t('library.access.help')}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
