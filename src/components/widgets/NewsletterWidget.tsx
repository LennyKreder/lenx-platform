'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Loader2, Check, AlertCircle } from 'lucide-react';

interface NewsletterWidgetProps {
  locale: string;
  title?: string;
  description?: string;
  compact?: boolean;
}

export function NewsletterWidget({ locale, title, description, compact = false }: NewsletterWidgetProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const isNL = locale === 'nl';

  const defaultTitle = isNL ? 'Blijf op de hoogte' : 'Stay Updated';
  const defaultDescription = isNL
    ? 'Ontvang nieuws over nieuwe planners en exclusieve aanbiedingen.'
    : 'Get notified about new planners and exclusive offers.';
  const buttonText = isNL ? 'Aanmelden' : 'Subscribe';
  const placeholder = isNL ? 'Je e-mailadres' : 'Your email address';
  const successMessage = isNL ? 'Bedankt voor je aanmelding!' : 'Thanks for subscribing!';
  const errorMessage = isNL ? 'Er ging iets mis. Probeer het opnieuw.' : 'Something went wrong. Please try again.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      if (response.ok) {
        setStatus('success');
        setMessage(successMessage);
        setEmail('');
      } else {
        const data = await response.json();
        setStatus('error');
        setMessage(data.error || errorMessage);
      }
    } catch {
      setStatus('error');
      setMessage(errorMessage);
    }
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="my-6 flex gap-2 max-w-md">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          disabled={status === 'loading' || status === 'success'}
          className="flex-1"
        />
        <Button type="submit" disabled={status === 'loading' || status === 'success'}>
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : status === 'success' ? (
            <Check className="h-4 w-4" />
          ) : (
            buttonText
          )}
        </Button>
      </form>
    );
  }

  return (
    <Card className="my-8">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 rounded-full bg-primary/10 shrink-0">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">{title || defaultTitle}</h3>
              <p className="text-muted-foreground text-sm">{description || defaultDescription}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 w-full md:w-auto">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              disabled={status === 'loading' || status === 'success'}
              className="flex-1 md:w-64"
            />
            <Button type="submit" disabled={status === 'loading' || status === 'success'}>
              {status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : status === 'success' ? (
                <Check className="h-4 w-4" />
              ) : (
                buttonText
              )}
            </Button>
          </form>
        </div>
        {message && (
          <div className={`mt-4 flex items-center gap-2 text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {status === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
