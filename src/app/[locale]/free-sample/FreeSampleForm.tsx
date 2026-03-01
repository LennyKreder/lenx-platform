'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Check, AlertCircle, Mail } from 'lucide-react';

const THEMES = [
  { value: 'brown', label: 'Brown' },
  { value: 'dark_mode_blue', label: 'Dark Mode Blue' },
  { value: 'dark_mode_brown', label: 'Dark Mode Brown' },
  { value: 'dark_mode_essential', label: 'Dark Mode Essential' },
  { value: 'dark_mode_olive', label: 'Dark Mode Olive' },
  { value: 'dark_mode_purple', label: 'Dark Mode Purple' },
  { value: 'dark_mode_rose', label: 'Dark Mode Rose' },
  { value: 'dark_mode_terminal', label: 'Dark Mode Terminal' },
  { value: 'earth_natural', label: 'Earth Natural' },
  { value: 'grey_neutral', label: 'Grey Neutral' },
  { value: 'navy_professional', label: 'Navy Professional' },
  { value: 'patina_blue', label: 'Patina Blue' },
  { value: 'pink', label: 'Pink' },
  { value: 'purple', label: 'Purple' },
  { value: 'royal_blue', label: 'Royal Blue' },
  { value: 'soft_pastel', label: 'Soft Pastel' },
  { value: 'soft_rose', label: 'Soft Rose' },
];

const THEME_VALUES = new Set(THEMES.map((t) => t.value));

interface FreeSampleFormProps {
  locale: string;
  currentMonth: number;
  currentYear: number;
  initialTheme?: string;
}

type Step = 'select' | 'email' | 'sent';

// Translations
function getTexts(locale: string) {
  const isNL = locale === 'nl';
  return {
    stepSelect: isNL ? 'Stap 1: Kies een kleurthema' : 'Step 1: Choose a color theme',
    stepEmail: isNL ? 'Stap 2: Ontvang je gratis voorbeeld' : 'Step 2: Get your free sample',
    themeLabel: isNL ? 'Kleurthema' : 'Color theme',
    themePlaceholder: isNL ? 'Kies een thema...' : 'Choose a theme...',
    continueButton: isNL ? 'Verder' : 'Continue',
    emailLabel: isNL ? 'E-mailadres' : 'Email address',
    emailPlaceholder: isNL ? 'je@email.com' : 'you@email.com',
    emailDescription: isNL
      ? 'We sturen je af en toe updates over nieuwe planners. Je kunt je altijd uitschrijven.'
      : 'We\'ll occasionally send updates about new planners. You can unsubscribe anytime.',
    submitButton: isNL ? 'Stuur mij het voorbeeld' : 'Send me the sample',
    checkEmail: isNL
      ? 'Check je inbox!'
      : 'Check your inbox!',
    emailSent: isNL
      ? 'We hebben een e-mail gestuurd met je downloadlink. Controleer ook je spam-map als je het niet ziet.'
      : 'We\'ve sent an email with your download link. Check your spam folder if you don\'t see it.',
    errorGeneric: isNL ? 'Er ging iets mis. Probeer het opnieuw.' : 'Something went wrong. Please try again.',
    backButton: isNL ? 'Terug' : 'Back',
  };
}

export function FreeSampleForm({ locale, currentMonth, currentYear, initialTheme }: FreeSampleFormProps) {
  const validInitialTheme = initialTheme && THEME_VALUES.has(initialTheme) ? initialTheme : '';
  const [step, setStep] = useState<Step>('select');
  const [theme, setTheme] = useState(validInitialTheme);
  const plannerLanguage = locale === 'nl' ? 'nl' : 'en';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const texts = getTexts(locale);

  const handleContinueToEmail = () => {
    if (theme) {
      setStep('email');
    }
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/samples/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale,
          theme,
          language: plannerLanguage,
          month: currentMonth,
          year: currentYear,
        }),
      });

      if (response.ok) {
        setStatus('success');
        setStep('sent');
      } else {
        const data = await response.json();
        setStatus('error');
        setErrorMessage(data.error || texts.errorGeneric);
      }
    } catch {
      setStatus('error');
      setErrorMessage(texts.errorGeneric);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select theme */}
      <Card className={step !== 'select' ? 'opacity-60' : ''}>
        <CardContent className="p-6">
          <h2 className="font-semibold text-lg mb-4">{texts.stepSelect}</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{texts.themeLabel}</Label>
              <Select
                value={theme}
                onValueChange={setTheme}
                disabled={step !== 'select'}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={texts.themePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {step === 'select' && (
              <Button
                onClick={handleContinueToEmail}
                disabled={!theme}
                className="w-full"
              >
                {texts.continueButton}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Email */}
      {(step === 'email' || step === 'sent') && (
        <Card className={step !== 'email' ? 'opacity-60' : ''}>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-4">{texts.stepEmail}</h2>
            <form onSubmit={handleSubmitEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{texts.emailLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={texts.emailPlaceholder}
                  required
                  disabled={step !== 'email' || status === 'loading'}
                />
                <p className="text-xs text-muted-foreground">
                  {texts.emailDescription}
                </p>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errorMessage}
                </div>
              )}

              {step === 'email' && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setStep('select'); setStatus('idle'); setErrorMessage(''); }}
                  >
                    {texts.backButton}
                  </Button>
                  <Button
                    type="submit"
                    disabled={status === 'loading' || !email}
                    className="flex-1"
                  >
                    {status === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      texts.submitButton
                    )}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Check email */}
      {step === 'sent' && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <h2 className="font-semibold text-lg mb-2">{texts.checkEmail}</h2>
            <p className="text-muted-foreground text-sm">
              {texts.emailSent}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
