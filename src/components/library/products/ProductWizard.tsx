'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { themes, type ThemeId } from '@/config/themes';
import { languages, type LanguageId } from '@/config/languages';
import { plannerTypes, type PlannerTypeId } from '@/config/planner-types';
import { type WeekStart, type TimeFormat, type CalendarIntegration } from '@/config/languages';
import { type DeviceId, type Orientation } from '@/config/devices';
import { buildFileKey } from '@/lib/file-utils';
import { useTranslation } from '@/contexts/I18nContext';
import {
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  ListOrdered,
  HelpCircle,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import type { AccessibleProduct } from '@/lib/customer-access';

type ViewMode = 'compact' | 'stepped';

type SelectionOption<T> = {
  value: T;
  label: string;
  description?: string;
};

type ThemeOption = SelectionOption<ThemeId> & { color: string };

const themeOptions: ThemeOption[] = Object.entries(themes).map(([id, theme]) => ({
  value: id as ThemeId,
  label: theme.name,
  color: theme.previewColor,
}));

type LanguageOption = SelectionOption<LanguageId> & { flag: string };

const languageLabels: Record<string, string> = {
  en: 'English',
  nl: 'Nederlands',
};

// ============ COMPACT MODE COMPONENTS ============

interface SelectionRowProps<T> {
  question: string;
  options: SelectionOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}

function SelectionRow<T extends string>({ question, options, selected, onSelect }: SelectionRowProps<T>) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <span className="text-sm font-medium text-muted-foreground min-w-[160px]">{question}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              selected === option.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border hover:border-primary/50'
            }`}
          >
            {option.label}
            {option.description && (
              <span className="ml-1 text-xs opacity-70">({option.description})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ThemeSelectionRowProps {
  question: string;
  options: ThemeOption[];
  selected: ThemeId | null;
  onSelect: (value: ThemeId) => void;
}

function ThemeSelectionRow({ question, options, selected, onSelect }: ThemeSelectionRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <span className="text-sm font-medium text-muted-foreground min-w-[160px]">{question}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${
              selected === option.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border hover:border-primary/50'
            }`}
          >
            <div
              className="w-5 h-5 rounded-full border border-background shadow-sm flex-shrink-0"
              style={{ backgroundColor: option.color }}
            />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface LanguageSelectionRowProps {
  question: string;
  options: LanguageOption[];
  selected: LanguageId | null;
  onSelect: (value: LanguageId) => void;
}

function LanguageSelectionRow({ question, options, selected, onSelect }: LanguageSelectionRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
      <span className="text-sm font-medium text-muted-foreground min-w-[160px]">{question}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-2 ${
              selected === option.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border hover:border-primary/50'
            }`}
          >
            <span>{option.flag}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ STEPPED MODE COMPONENTS ============

type Step = 'language' | 'weekStart' | 'timeFormat' | 'calendar' | 'plannerType' | 'theme' | 'download';

interface StepPageProps<T> {
  question: string;
  options: SelectionOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  onBack?: () => void;
  stepNumber: number;
  totalSteps: number;
}

function StepPage<T extends string>({
  question,
  options,
  selected,
  onSelect,
  onBack,
  stepNumber,
  totalSteps,
}: StepPageProps<T>) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Step {stepNumber} of {totalSteps}
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
              <span
                className={`text-sm mt-1 block ${
                  selected === option.value ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}
              >
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
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button size="lg" onClick={() => selected && onSelect(selected)} disabled={!selected}>
          Next
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
}

function ThemeStepPage({
  question,
  options,
  selected,
  onSelect,
  onBack,
  stepNumber,
  totalSteps,
}: ThemeStepPageProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Step {stepNumber} of {totalSteps}
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
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center max-w-md mx-auto pt-4">
        {onBack ? (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <ChevronLeft className="mr-1 h-5 w-5" />
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button size="lg" onClick={() => selected && onSelect(selected)} disabled={!selected}>
          Next
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
}

function LanguageStepPage({
  question,
  options,
  selected,
  onSelect,
  onBack,
  stepNumber,
  totalSteps,
}: LanguageStepPageProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Step {stepNumber} of {totalSteps}
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
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center max-w-md mx-auto pt-4">
        {onBack ? (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <ChevronLeft className="mr-1 h-5 w-5" />
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button size="lg" onClick={() => selected && onSelect(selected)} disabled={!selected}>
          Next
          <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

interface PlannerTypeStepPageProps {
  selected: PlannerTypeId | null;
  onSelect: (value: PlannerTypeId) => void;
  onBack?: () => void;
  stepNumber: number;
  totalSteps: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function PlannerTypeStepPage({
  selected,
  onSelect,
  onBack,
  stepNumber,
  totalSteps,
  t,
}: PlannerTypeStepPageProps) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const toggleExpand = (typeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Step {stepNumber} of {totalSteps}
        </p>
        <h2 className="text-2xl font-bold">{t('library.wizard.plannerType.title')}</h2>
        <p className="text-muted-foreground mt-2">
          {t('library.wizard.plannerType.subtitle')}
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-md mx-auto">
        {Object.values(plannerTypes).map((type) => {
          const isExpanded = expandedTypes.has(type.id);
          const isSelected = selected === type.id;
          return (
            <div
              key={type.id}
              className={cn(
                'rounded-xl border-2 transition-all overflow-hidden',
                isSelected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <button
                onClick={() => onSelect(type.id as PlannerTypeId)}
                className={cn(
                  'w-full p-5 text-left transition-all flex items-center justify-between',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                )}
              >
                <span className="text-lg font-semibold">
                  {type.name} ({type.templateCount} templates)
                </span>
                <div className="flex items-center gap-2">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => toggleExpand(type.id, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpand(type.id, e as unknown as React.MouseEvent);
                      }
                    }}
                    className={cn(
                      'p-1 rounded-md transition-colors cursor-pointer',
                      isSelected
                        ? 'hover:bg-primary-foreground/20'
                        : 'hover:bg-muted-foreground/20'
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 transition-transform',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </span>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary-foreground flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              </button>
              {isExpanded && (
                <div className="p-4 bg-muted/30 border-t text-sm space-y-3">
                  <p className="text-muted-foreground">{type.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {type.categories.map((category) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center max-w-md mx-auto pt-4">
        {onBack ? (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <ChevronLeft className="mr-1 h-5 w-5" />
            Back
          </Button>
        ) : (
          <div />
        )}
        <Button size="lg" onClick={() => selected && onSelect(selected)} disabled={!selected}>
          Next
          <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

type AuthMode = 'accessCode' | 'session';

interface ProductWizardProps {
  product: AccessibleProduct;
  locale: string;
  device: DeviceId | null;
  orientation: Orientation | null;
  /** Authentication mode - 'accessCode' uses x-access-code header, 'session' uses x-product-id header */
  authMode: AuthMode;
  /** Required when authMode is 'accessCode' */
  accessCode?: string;
  /** URL for the back button */
  backUrl: string;
  /** Label for the back button */
  backLabel: string;
  /** Whether to track wizard session progress (only for access code mode) */
  trackWizardSession?: boolean;
  /** Additional className for the container */
  containerClassName?: string;
}

export function ProductWizard({
  product,
  locale,
  device,
  orientation,
  authMode,
  accessCode,
  backUrl,
  backLabel,
  trackWizardSession = false,
  containerClassName,
}: ProductWizardProps) {
  const t = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('stepped');

  // Determine if theme/language are fixed for this product
  const hasFixedTheme = product.theme !== null;
  const hasFixedLanguage = product.contentLanguage !== null;

  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(
    hasFixedTheme ? (product.theme as ThemeId) : null
  );
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId | null>(
    hasFixedLanguage ? (product.contentLanguage as LanguageId) : (locale as LanguageId)
  );
  const [weekStart, setWeekStart] = useState<WeekStart | null>(null);
  const [timeFormat, setTimeFormat] = useState<TimeFormat | null>(null);
  const [calendar, setCalendar] = useState<CalendarIntegration | null>(null);
  const [plannerType, setPlannerType] = useState<PlannerTypeId | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stepped mode state
  const showLanguageSelector = !hasFixedLanguage || (hasFixedLanguage && product.contentLanguage !== 'en');
  const showThemeSelector = !hasFixedTheme;

  // Build steps array
  const steps: Step[] = [];
  if (showLanguageSelector && !hasFixedLanguage) {
    steps.push('language');
  }
  steps.push('weekStart', 'timeFormat', 'calendar', 'plannerType');
  if (showThemeSelector) {
    steps.push('theme');
  }
  steps.push('download');

  const [currentStep, setCurrentStep] = useState<Step>(steps[0]);
  const totalSelectSteps = steps.length - 1;
  const currentStepIndex = steps.indexOf(currentStep);
  const currentStepNumber = currentStepIndex + 1;

  const themeConfig = product.theme ? themes[product.theme as keyof typeof themes] : null;
  const selectedThemeConfig = selectedTheme ? themes[selectedTheme] : null;

  // Get localized product name
  const translation = product.translations.find((t) => t.languageCode === locale);
  const productName = translation?.name || product.templateName || 'Unnamed Product';
  const productDescription = translation?.description || '';

  // Build options
  const weekStartOptions: SelectionOption<WeekStart>[] = [
    { value: 'monday', label: t('library.wizard.weekStart.monday') },
    { value: 'sunday', label: t('library.wizard.weekStart.sunday') },
  ];

  const timeFormatOptions: SelectionOption<TimeFormat>[] = [
    { value: '24h', label: t('library.wizard.timeFormat.24h'), description: t('library.wizard.timeFormat.24hExample') },
    { value: 'ampm', label: t('library.wizard.timeFormat.ampm'), description: t('library.wizard.timeFormat.ampmExample') },
  ];

  const calendarOptions: SelectionOption<CalendarIntegration>[] = [
    { value: 'none', label: t('library.wizard.calendar.none') },
    { value: 'google', label: t('library.wizard.calendar.google') },
    { value: 'apple', label: t('library.wizard.calendar.apple') },
  ];

  const plannerTypeOptions: SelectionOption<PlannerTypeId>[] = [
    { value: 'full', label: `${t('library.wizard.plannerType.full.name')} (${plannerTypes.full.templateCount} templates)` },
    { value: 'focus', label: `${t('library.wizard.plannerType.focus.name')} (${plannerTypes.focus.templateCount} templates)` },
    { value: 'minimal', label: `${t('library.wizard.plannerType.minimal.name')} (${plannerTypes.minimal.templateCount} templates)` },
  ];

  const languageOptions: LanguageOption[] = Object.entries(languages).map(([id, lang]) => ({
    value: id as LanguageId,
    label: languageLabels[id] || id,
    flag: lang.flag,
  }));

  // Determine which language options to show
  const availableLanguageOptions: LanguageOption[] = hasFixedLanguage
    ? product.contentLanguage === 'en'
      ? languageOptions.filter((l) => l.value === 'en')
      : languageOptions.filter((l) => l.value === product.contentLanguage || l.value === 'en')
    : languageOptions;

  // Check if all required fields are filled
  const effectiveDevice = device || 'ipad';
  const effectiveOrientation = orientation || 'landscape';

  const isComplete = weekStart && timeFormat && calendar && plannerType && selectedTheme && selectedLanguage;

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
    if (!isComplete) return;

    setIsDownloading(true);
    setDownloadStatus('idle');
    setErrorMessage(null);

    try {
      // Track wizard session if enabled (only for access code mode)
      if (trackWizardSession && authMode === 'accessCode' && accessCode) {
        await fetch('/api/library/wizard/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessCode: accessCode,
            productId: product.id,
            language: selectedLanguage,
            theme: selectedTheme,
            plannerType,
            weekStart,
            timeFormat,
            calendarIntegration: calendar,
            completed: true,
          }),
        });
      }

      const fileKey = buildFileKey({
        language: selectedLanguage!,
        theme: selectedTheme!,
        plannerType: plannerType!,
        weekStart: weekStart!,
        timeFormat: timeFormat!,
        calendar: calendar!,
        device: effectiveDevice as DeviceId,
        orientation: effectiveOrientation as Orientation,
        year: product.year || undefined,
      });

      // Use different auth headers based on auth mode
      const headers: Record<string, string> =
        authMode === 'accessCode'
          ? { 'x-access-code': accessCode! }
          : { 'x-product-id': String(product.id) };

      const response = await fetch(`/api/library/download/${fileKey}`, {
        headers,
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

  const renderSteppedMode = () => {
    switch (currentStep) {
      case 'language':
        return (
          <LanguageStepPage
            question={t('library.wizard.language.title')}
            options={availableLanguageOptions}
            selected={selectedLanguage}
            onSelect={(value) => {
              setSelectedLanguage(value);
              goToNext();
            }}
            onBack={currentStepIndex > 0 ? goBack : undefined}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
          />
        );
      case 'weekStart':
        return (
          <StepPage
            question={t('library.wizard.weekStart.title')}
            options={weekStartOptions}
            selected={weekStart}
            onSelect={(value) => {
              setWeekStart(value);
              goToNext();
            }}
            onBack={currentStepIndex > 0 ? goBack : undefined}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
          />
        );
      case 'timeFormat':
        return (
          <StepPage
            question={t('library.wizard.timeFormat.title')}
            options={timeFormatOptions}
            selected={timeFormat}
            onSelect={(value) => {
              setTimeFormat(value);
              goToNext();
            }}
            onBack={goBack}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
          />
        );
      case 'calendar':
        return (
          <StepPage
            question={t('library.wizard.calendar.title')}
            options={calendarOptions}
            selected={calendar}
            onSelect={(value) => {
              setCalendar(value);
              goToNext();
            }}
            onBack={goBack}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
          />
        );
      case 'plannerType':
        return (
          <PlannerTypeStepPage
            selected={plannerType}
            onSelect={(value) => {
              setPlannerType(value);
              goToNext();
            }}
            onBack={goBack}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
            t={t}
          />
        );
      case 'theme':
        return (
          <ThemeStepPage
            question={t('library.hub.compact.theme')}
            options={themeOptions}
            selected={selectedTheme}
            onSelect={(value) => {
              setSelectedTheme(value);
              goToNext();
            }}
            onBack={goBack}
            stepNumber={currentStepNumber}
            totalSteps={totalSelectSteps}
          />
        );
      case 'download':
        return (
          <div className="space-y-8 text-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">{t('library.wizard.result.title')}</h2>
              <p className="text-muted-foreground">{t('library.wizard.result.subtitle')}</p>
            </div>

            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6 space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('library.wizard.result.weekStarts')}:</span>
                  <span className="font-medium">{weekStart === 'monday' ? t('library.wizard.weekStart.monday') : t('library.wizard.weekStart.sunday')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('library.wizard.result.timeFormat')}:</span>
                  <span className="font-medium">{timeFormat === '24h' ? t('library.wizard.timeFormat.24h') : t('library.wizard.timeFormat.ampm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('library.wizard.result.calendarIntegration')}:</span>
                  <span className="font-medium">{calendar === 'none' ? t('library.wizard.calendar.none') : calendar === 'google' ? t('library.wizard.calendar.google') : t('library.wizard.calendar.apple')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('library.wizard.result.templates')}:</span>
                  <span className="font-medium">{plannerType ? t(`library.wizard.plannerType.${plannerType}.name`) : ''}</span>
                </div>
                {showThemeSelector && selectedThemeConfig && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('library.hub.compact.theme')}:</span>
                    <span className="font-medium">{selectedThemeConfig.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              <span>
                {locale === 'nl' ? 'Hulp nodig bij het importeren?' : 'Need help importing?'}
              </span>
              <Link
                href={`/${locale}/how-to-import`}
                className="text-primary hover:underline"
                target="_blank"
              >
                {locale === 'nl' ? 'Bekijk onze handleiding' : 'View our guide'}
              </Link>
            </div>

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

  const renderCompactMode = () => (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <h2 className="text-lg font-semibold">{t('library.hub.subtitle')}</h2>

        <SelectionRow
          question={t('library.hub.compact.weekStart')}
          options={weekStartOptions}
          selected={weekStart}
          onSelect={setWeekStart}
        />

        <SelectionRow
          question={t('library.hub.compact.timeFormat')}
          options={timeFormatOptions}
          selected={timeFormat}
          onSelect={setTimeFormat}
        />

        <SelectionRow
          question={t('library.hub.compact.calendar')}
          options={calendarOptions}
          selected={calendar}
          onSelect={setCalendar}
        />

        <SelectionRow
          question={t('library.hub.compact.plannerType')}
          options={plannerTypeOptions}
          selected={plannerType}
          onSelect={setPlannerType}
        />

        {showThemeSelector && (
          <ThemeSelectionRow
            question={t('library.hub.compact.theme')}
            options={themeOptions}
            selected={selectedTheme}
            onSelect={setSelectedTheme}
          />
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span>
            {locale === 'nl' ? 'Hulp nodig bij het importeren?' : 'Need help importing?'}
          </span>
          <Link
            href={`/${locale}/how-to-import`}
            className="text-primary hover:underline"
            target="_blank"
          >
            {locale === 'nl' ? 'Bekijk onze handleiding' : 'View our guide'}
          </Link>
        </div>

        <div className="pt-4 border-t">
          <Button
            size="lg"
            className="w-full"
            onClick={handleDownload}
            disabled={!isComplete || isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('library.wizard.result.downloading')}
              </>
            ) : downloadStatus === 'success' ? (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                {t('library.wizard.result.downloaded')}
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                {t('library.wizard.result.download')}
              </>
            )}
          </Button>

          {downloadStatus === 'error' && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{t('library.wizard.result.error.title')}</p>
                <p className="text-sm">{errorMessage || t('library.wizard.result.error.default')}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn('max-w-3xl', containerClassName)}>
      {/* Back navigation and View Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild>
          <Link href={backUrl}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            {backLabel}
          </Link>
        </Button>

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === 'stepped' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('stepped')}
            className="gap-2"
          >
            <ListOrdered className="h-4 w-4" />
            <span className="hidden sm:inline">{t('library.hub.viewMode.stepByStep')}</span>
          </Button>
          <Button
            variant={viewMode === 'compact' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('compact')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">{t('library.hub.viewMode.compact')}</span>
          </Button>
        </div>
      </div>

      {/* Product Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2">{productName}</h1>

        {/* Variant badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-3">
          {product.year && <Badge variant="secondary">{product.year}</Badge>}
          {themeConfig && (
            <Badge variant="outline">
              <span
                className="w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: themeConfig.previewColor }}
              />
              {themeConfig.name}
            </Badge>
          )}
          {product.contentLanguage && (
            <Badge variant="outline">{languageLabels[product.contentLanguage] || product.contentLanguage}</Badge>
          )}
        </div>

        {productDescription && <p className="text-muted-foreground text-sm">{productDescription}</p>}
      </div>

      {/* Wizard Content */}
      {viewMode === 'compact' ? renderCompactMode() : renderSteppedMode()}
    </div>
  );
}
