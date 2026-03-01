'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ContactFormProps {
  locale: string;
}

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string; // Honeypot field - should remain empty
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export function ContactForm({ locale }: ContactFormProps) {
  const isNL = locale === 'nl';

  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '',
  });
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const labels = {
    name: isNL ? 'Naam' : 'Name',
    email: isNL ? 'E-mailadres' : 'Email address',
    subject: isNL ? 'Onderwerp' : 'Subject',
    message: isNL ? 'Bericht' : 'Message',
    send: isNL ? 'Versturen' : 'Send message',
    sending: isNL ? 'Versturen...' : 'Sending...',
    successTitle: isNL ? 'Bericht verzonden!' : 'Message sent!',
    successMessage: isNL
      ? 'Bedankt voor je bericht. Ik neem zo snel mogelijk contact met je op.'
      : 'Thank you for your message. I will get back to you as soon as possible.',
    sendAnother: isNL ? 'Nog een bericht sturen' : 'Send another message',
    placeholders: {
      name: isNL ? 'Je naam' : 'Your name',
      email: isNL ? 'je@email.com' : 'you@email.com',
      subject: isNL ? 'Waar kan ik je mee helpen?' : 'How can I help you?',
      message: isNL ? 'Je bericht...' : 'Your message...',
    },
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (status === 'error') {
      setStatus('idle');
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, locale }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setErrorMessage(data.error || (isNL ? 'Er ging iets mis' : 'Something went wrong'));
        return;
      }

      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMessage(
        isNL
          ? 'Kon geen verbinding maken. Probeer het later opnieuw.'
          : 'Could not connect. Please try again later.'
      );
    }
  };

  const handleReset = () => {
    setFormData({ name: '', email: '', subject: '', message: '', website: '' });
    setStatus('idle');
    setErrorMessage('');
  };

  if (status === 'success') {
    return (
      <div className="p-8 rounded-lg border bg-card text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{labels.successTitle}</h2>
        <p className="text-muted-foreground mb-6">{labels.successMessage}</p>
        <Button variant="outline" onClick={handleReset}>
          {labels.sendAnother}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Honeypot field - hidden from users, catches bots */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={handleChange}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{labels.name}</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            maxLength={100}
            placeholder={labels.placeholders.name}
            value={formData.name}
            onChange={handleChange}
            disabled={status === 'loading'}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{labels.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder={labels.placeholders.email}
            value={formData.email}
            onChange={handleChange}
            disabled={status === 'loading'}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">{labels.subject}</Label>
        <Input
          id="subject"
          name="subject"
          type="text"
          required
          maxLength={200}
          placeholder={labels.placeholders.subject}
          value={formData.subject}
          onChange={handleChange}
          disabled={status === 'loading'}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">{labels.message}</Label>
        <Textarea
          id="message"
          name="message"
          required
          maxLength={5000}
          rows={6}
          placeholder={labels.placeholders.message}
          value={formData.message}
          onChange={handleChange}
          disabled={status === 'loading'}
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <Button type="submit" disabled={status === 'loading'} className="w-full sm:w-auto">
        {status === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {labels.sending}
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            {labels.send}
          </>
        )}
      </Button>
    </form>
  );
}
