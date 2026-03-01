'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePurchase } from '@/contexts/PurchaseContext';
import { getLocaleFromPathname, createTranslator } from '@/lib/i18n';
import { themes, type ThemeId } from '@/config/themes';
import { languages, type LanguageId } from '@/config/languages';
import { plannerTypes, type PlannerTypeId } from '@/config/planner-types';
import { type WeekStart, type TimeFormat, type CalendarIntegration } from '@/config/languages';
import { type DeviceId, type Orientation } from '@/config/devices';
import { buildFileKey } from '@/lib/file-utils';
import { Download, Loader2, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

type SelectionOption<T> = {
  value: T;
  label: string;
  description?: string;
};

type ThemeOption = SelectionOption<ThemeId> & { color: string };

const themeOptions: ThemeOption[] = Object.entries(themes).map(([id, theme]) => ({
  value: id as ThemeId,
  label: theme.name,
  description: theme.description,
  color: theme.previewColor,
}));

type LanguageOption = SelectionOption<LanguageId> & { flag: string };

type Step = 'language' | 'weekStart' | 'timeFormat' | 'calendar' | 'plannerType' | 'theme' | 'download';

interface StepPageProps<T> {
  question: string;
  options: SelectionOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  onBack?: () => void;
  stepNumber: number;
  totalSteps: number;
  translations: {
    stepOf: string;
    back: string;
    next: string;
  };
}

function StepPage<T extends string>({
  question,
  options,
  selected,
  onSelect,
  onBack,
  stepNumber,
  totalSteps,
  translations,
}: StepPageProps<T>) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          {translations.stepOf}
        </p>
        <h2 className="text-3xl font-bold">{question}</h2>
      </div>

      <div className="flex flex-col gap-4 max-w-md mx-auto">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              selected === option.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border hover:border-primary/50'
            }`}
          >
            <span className="text-xl font-semibold block">{option.label}</span>
            {option.description && (
              <span className={`text-sm mt-1 block ${
                selected === option.value ? 'text-primary-foreground/80' : 'text-muted-foreground'
              }`}>
                {option.description}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center max-w-md mx-auto pt-4">
        {onBack ? (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <ChevronLeft className="mr-1 h-5 w-5" />
            {translations.back}
          </Button>
        ) : (
          <div />
        )}
        <Button
          size="lg"
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
        >
          {translations.next}
          <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

interface ThemeStepPageProps {
  question: string;
  options: ThemeOption[];
  selected: ThemeId | null;
  onSelect: (value: ThemeId) => void;
  onBack?: () => void;
  stepNumber: number;
  totalSteps: number;
  translations: {
    stepOf: string;
    back: string;
    next: string;
  };
}

function ThemeStepPage({
  question,
  options,
  selected,
  onSelect,
  onBack,
  stepNumber,
  totalSteps,
  translations,
}: ThemeStepPageProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          {translations.stepOf}
        </p>
        <h2 className="text-3xl font-bold">{question}</h2>
      </div>

      <div className="flex flex-col gap-4 max-w-md mx-auto">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`p-6 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
              selected === option.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border hover:border-primary/50'
            }`}
          >
            <div
              className="w-12 h-12 rounded-full border-2 border-background shadow-md flex-shrink-0"
              style={{ backgroundColor: option.color }}
            />
            <div>
              <span className="text-xl font-semibold block">{option.label}</span>
              {option.description && (
                <span className={`text-sm mt-1 block ${
                  selected === option.value ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}>
                  {option.description}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center max-w-md mx-auto pt-4">
        {onBack ? (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <ChevronLeft className="mr-1 h-5 w-5" />
            {translations.back}
          </Button>
        ) : (
          <div />
        )}
        <Button
          size="lg"
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
        >
          {translations.next}
          <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

interface LanguageStepPageProps {
  question: string;
  options: LanguageOption[];
  selected: LanguageId | null;
  onSelect: (value: LanguageId) => void;
  onBack?: () => void;
  stepNumber: number;
  totalSteps: number;
  translations: {
    stepOf: string;
    back: string;
    next: string;
  };
}

function LanguageStepPage({
  question,
  options,
  selected,
  onSelect,
  onBack,
  stepNumber,
  totalSteps,
  translations,
}: LanguageStepPageProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          {translations.stepOf}
        </p>
        <h2 className="text-3xl font-bold">{question}</h2>
      </div>

      <div className="flex flex-col gap-4 max-w-md mx-auto">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`p-6 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
              selected === option.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border hover:border-primary/50'
            }`}
          >
            <span className="text-4xl flex-shrink-0">{option.flag}</span>
            <div>
              <span className="text-xl font-semibold block">{option.label}</span>
              {option.description && (
                <span className={`text-sm mt-1 block ${
                  selected === option.value ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}>
                  {option.description}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center max-w-md mx-auto pt-4">
        {onBack ? (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <ChevronLeft className="mr-1 h-5 w-5" />
            {translations.back}
          </Button>
        ) : (
          <div />
        )}
        <Button
          size="lg"
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
        >
          {translations.next}
          <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export function HubStepped() {
  const purchase = usePurchase();
  const pathname = usePathname();
  // Derive locale from pathname for accuracy (avoids context timing issues)
  const locale = getLocaleFromPathname(pathname);
  const t = createTranslator(locale);

  const hasAllThemes = purchase.theme === 'all';
  const hasAllLanguages = purchase.language === 'all';

  // Language logic:
  // - 'all' purchases: show language step with all options
  // - 'nl' or 'en' purchases: use URL locale as planner language (no language step)
  //   The language switcher in the header allows NL purchases to access EN files

  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(
    hasAllThemes ? null : (purchase.theme as ThemeId)
  );
  // For non-'all' purchases, use the URL locale as the language
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId | null>(
    hasAllLanguages ? null : (locale as LanguageId)
  );
  // Device and orientation come from the product, not user selection
  const productDevice = purchase.device;
  const productOrientation = purchase.orientation;

  // First step depends on whether user needs to select language
  const firstStep: Step = hasAllLanguages ? 'language' : 'weekStart';
  const [currentStep, setCurrentStep] = useState<Step>(firstStep);
  const [weekStart, setWeekStart] = useState<WeekStart | null>(null);
  const [timeFormat, setTimeFormat] = useState<TimeFormat | null>(null);
  const [calendar, setCalendar] = useState<CalendarIntegration | null>(null);
  const [plannerType, setPlannerType] = useState<PlannerTypeId | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Build steps array based on what user has access to
  const steps: Step[] = [];

  // Language step only for 'all' purchases
  if (hasAllLanguages) {
    steps.push('language');
  }

  steps.push('weekStart', 'timeFormat', 'calendar', 'plannerType');

  // Theme step if they have all themes
  if (hasAllThemes) {
    steps.push('theme');
  }

  steps.push('download');

  const totalSelectSteps = steps.length - 1; // Exclude download step
  const currentStepIndex = steps.indexOf(currentStep);
  const currentStepNumber = currentStepIndex + 1;

  const theme = selectedTheme ? themes[selectedTheme] : null;
  const language = selectedLanguage ? languages[selectedLanguage] : null;

  const goToNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleDownload = async () => {
    const langToUse = selectedLanguage || (purchase.language as LanguageId);
    const themeToUse = selectedTheme || (purchase.theme as ThemeId);

    if (!weekStart || !timeFormat || !calendar || !plannerType || !langToUse || !themeToUse || !productDevice || !productOrientation) return;

    setIsDownloading(true);
    setDownloadStatus('idle');
    setErrorMessage(null);

    try {
      // Log wizard session completion
      await fetch('/api/library/wizard/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode: purchase.code,
          language: langToUse,
          theme: themeToUse,
          plannerType,
          weekStart,
          timeFormat,
          calendarIntegration: calendar,
          device: productDevice,
          orientation: productOrientation,
          completed: true,
        }),
      });

      const fileKey = buildFileKey({
        language: langToUse,
        theme: themeToUse,
        plannerType,
        weekStart,
        timeFormat,
        calendar,
        device: productDevice,
        orientation: productOrientation,
      });

      const response = await fetch(`/api/library/download/${fileKey}`, {
        headers: {
          'x-access-code': purchase.code,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Download failed');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'planner.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadStatus('success');
    } catch (error) {
      console.error('Download error:', error);
      setDownloadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  // Build translated options
  const translatedWeekStartOptions: SelectionOption<WeekStart>[] = [
    { value: 'monday', label: t('weekDays.monday') },
    { value: 'sunday', label: t('weekDays.sunday') },
  ];

  const translatedTimeFormatOptions: SelectionOption<TimeFormat>[] = [
    { value: '24h', label: t('timeFormats.24h'), description: t('library.wizard.timeFormat.24hExample') },
    { value: 'ampm', label: t('timeFormats.ampm'), description: t('library.wizard.timeFormat.ampmExample') },
  ];

  const translatedCalendarOptions: SelectionOption<CalendarIntegration>[] = [
    { value: 'none', label: t('calendarIntegrations.none'), description: t('library.wizard.calendar.noneDescription') },
    { value: 'google', label: t('calendarIntegrations.google'), description: t('library.wizard.calendar.googleDescription') },
    { value: 'apple', label: t('calendarIntegrations.apple'), description: t('library.wizard.calendar.appleDescription') },
  ];

  const translatedPlannerTypeOptions: SelectionOption<PlannerTypeId>[] = [
    { value: 'full', label: t('plannerTypes.full'), description: t('library.wizard.plannerType.full.description') },
    { value: 'focus', label: t('plannerTypes.focus'), description: t('library.wizard.plannerType.focus.description') },
    { value: 'minimal', label: t('plannerTypes.minimal'), description: t('library.wizard.plannerType.minimal.description') },
  ];

  const translatedLanguageOptions: LanguageOption[] = Object.entries(languages).map(([id, lang]) => ({
    value: id as LanguageId,
    label: t(`languages.${id}`),
    flag: lang.flag,
  }));

  // Common translations for step pages
  const stepTranslations = {
    stepOf: t('library.wizard.progress', { current: currentStepNumber, total: totalSelectSteps }),
    back: t('common.back'),
    next: t('common.next'),
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'language':
        return (
          <LanguageStepPage
            question={t('library.wizard.language.title')}
            options={translatedLanguageOptions}
            selected={selectedLanguage}
            onSelect={(value) => {
              setSelectedLanguage(value);
              goToNext();
            }}
            onBack={goBack}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
            translations={stepTranslations}
          />
        );
      case 'weekStart':
        return (
          <StepPage
            question={t('library.wizard.weekStart.title')}
            options={translatedWeekStartOptions}
            selected={weekStart}
            onSelect={(value) => {
              setWeekStart(value);
              goToNext();
            }}
            onBack={goBack}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
            translations={stepTranslations}
          />
        );
      case 'timeFormat':
        return (
          <StepPage
            question={t('library.wizard.timeFormat.title')}
            options={translatedTimeFormatOptions}
            selected={timeFormat}
            onSelect={(value) => {
              setTimeFormat(value);
              goToNext();
            }}
            onBack={goBack}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
            translations={stepTranslations}
          />
        );
      case 'calendar':
        return (
          <StepPage
            question={t('library.wizard.calendar.title')}
            options={translatedCalendarOptions}
            selected={calendar}
            onSelect={(value) => {
              setCalendar(value);
              goToNext();
            }}
            onBack={goBack}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
            translations={stepTranslations}
          />
        );
      case 'plannerType':
        return (
          <StepPage
            question={t('library.wizard.plannerType.title')}
            options={translatedPlannerTypeOptions}
            selected={plannerType}
            onSelect={(value) => {
              setPlannerType(value);
              goToNext();
            }}
            onBack={goBack}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
            translations={stepTranslations}
          />
        );
      case 'theme':
        return (
          <ThemeStepPage
            question={t('landing.themes.title')}
            options={themeOptions}
            selected={selectedTheme}
            onSelect={(value) => {
              setSelectedTheme(value);
              goToNext();
            }}
            onBack={goBack}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
            translations={stepTranslations}
          />
        );
      case 'download':
        return (
          <div className="space-y-8 text-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">{t('library.wizard.result.title')}</h2>
              <p className="text-muted-foreground">
                {t('library.wizard.result.subtitle')}
              </p>
            </div>

            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6 space-y-3 text-left">
                {productDevice && productOrientation && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('studio.wizard.device.title')}:</span>
                    <span className="font-medium">{t(`devices.${productDevice}.${productOrientation}`)}</span>
                  </div>
                )}
                {hasAllLanguages && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('library.wizard.result.language')}:</span>
                    <span className="font-medium">{language?.flag} {language?.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('library.wizard.result.weekStarts')}:</span>
                  <span className="font-medium">{t(`weekDays.${weekStart}`)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('library.wizard.result.timeFormat')}:</span>
                  <span className="font-medium">{t(`timeFormats.${timeFormat}`)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('library.wizard.result.calendarIntegration')}:</span>
                  <span className="font-medium">{t(`calendarIntegrations.${calendar}`)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('library.wizard.plannerType.title')}:</span>
                  <span className="font-medium">{t(`plannerTypes.${plannerType}`)}</span>
                </div>
                {hasAllThemes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('landing.themes.title')}:</span>
                    <span className="font-medium">{theme?.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="max-w-md mx-auto space-y-4">
              <Button
                size="lg"
                className="w-full text-lg py-6"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    {t('library.wizard.result.downloading')}
                  </>
                ) : downloadStatus === 'success' ? (
                  <>
                    <CheckCircle className="mr-2 h-6 w-6" />
                    {t('library.wizard.result.downloaded')}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-6 w-6" />
                    {t('library.wizard.result.download')}
                  </>
                )}
              </Button>

              {downloadStatus === 'error' && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium">{t('library.wizard.result.error.title')}</p>
                    <p className="text-sm">{errorMessage || t('library.wizard.result.error.default')}</p>
                  </div>
                </div>
              )}

              <Button variant="ghost" size="lg" onClick={goBack} className="w-full">
                <ChevronLeft className="mr-1 h-5 w-5" />
                {t('library.hub.changeSelections')}
              </Button>
            </div>
          </div>
        );
    }
  };

  // For single-theme purchases, get the theme info to display
  const singleTheme = !hasAllThemes && purchase.theme !== 'all'
    ? themes[purchase.theme as ThemeId]
    : null;

  return (
    <div className="container py-8 max-w-2xl min-h-[70vh] flex flex-col">
      <div className="text-center mb-8">
        {singleTheme ? (
          <div className="flex items-center justify-center gap-3 mb-2">
            <div
              className="w-8 h-8 rounded-full border-2 border-background shadow-md"
              style={{ backgroundColor: singleTheme.previewColor }}
            />
            <h1 className="text-2xl font-bold">{singleTheme.name}</h1>
          </div>
        ) : (
          <h1 className="text-2xl font-bold mb-1">{t('library.hub.title')}</h1>
        )}
        <p className="text-muted-foreground text-sm">
          {t('library.hub.subtitle')}
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {renderStep()}
      </div>

    </div>
  );
}
