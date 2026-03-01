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
import { Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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

export function HubChoice() {
  const purchase = usePurchase();
  const pathname = usePathname();
  // Derive locale from pathname for accuracy (avoids context timing issues)
  const locale = getLocaleFromPathname(pathname);
  const t = createTranslator(locale);

  const hasAllThemes = purchase.theme === 'all';
  const hasAllLanguages = purchase.language === 'all';
  // Non-English purchases include English for free
  const hasEnglishIncluded = purchase.language !== 'en' && purchase.language !== 'all';

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
  const [weekStart, setWeekStart] = useState<WeekStart | null>(null);
  const [timeFormat, setTimeFormat] = useState<TimeFormat | null>(null);
  const [calendar, setCalendar] = useState<CalendarIntegration | null>(null);
  const [plannerType, setPlannerType] = useState<PlannerTypeId | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Build translated options
  const weekStartOptions: SelectionOption<WeekStart>[] = [
    { value: 'monday', label: t('weekDays.monday') },
    { value: 'sunday', label: t('weekDays.sunday') },
  ];

  const timeFormatOptions: SelectionOption<TimeFormat>[] = [
    { value: '24h', label: t('timeFormats.24h'), description: '14:00' },
    { value: 'ampm', label: t('timeFormats.ampm'), description: '2:00 PM' },
  ];

  const calendarOptions: SelectionOption<CalendarIntegration>[] = [
    { value: 'none', label: t('calendarIntegrations.none') },
    { value: 'google', label: t('calendarIntegrations.google') },
    { value: 'apple', label: t('calendarIntegrations.apple') },
  ];

  const plannerTypeOptions: SelectionOption<PlannerTypeId>[] = [
    { value: 'full', label: t('plannerTypes.full'), description: t('library.hub.compact.templates', { count: plannerTypes.full.templateCount }) },
    { value: 'focus', label: t('plannerTypes.focus'), description: t('library.hub.compact.templates', { count: plannerTypes.focus.templateCount }) },
    { value: 'minimal', label: t('plannerTypes.minimal'), description: t('library.hub.compact.templates', { count: plannerTypes.minimal.templateCount }) },
  ];

  const languageOptions: LanguageOption[] = Object.entries(languages).map(([id, lang]) => ({
    value: id as LanguageId,
    label: t(`languages.${id}`),
    flag: lang.flag,
  }));

  // Build available language options based on purchase
  const availableLanguageOptions: LanguageOption[] = hasAllLanguages
    ? languageOptions
    : hasEnglishIncluded
      ? languageOptions.filter(l => l.value === purchase.language || l.value === 'en')
      : languageOptions.filter(l => l.value === purchase.language);

  const showLanguageSelector = availableLanguageOptions.length > 1;

  const isComplete = weekStart && timeFormat && calendar && plannerType && selectedTheme && selectedLanguage && productDevice && productOrientation;

  const handleDownload = async () => {
    if (!isComplete) return;

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
          language: selectedLanguage,
          theme: selectedTheme,
          plannerType,
          weekStart,
          timeFormat,
          calendarIntegration: calendar,
          completed: true,
        }),
      });

      const fileKey = buildFileKey({
        language: selectedLanguage!,
        theme: selectedTheme!,
        plannerType: plannerType!,
        weekStart: weekStart!,
        timeFormat: timeFormat!,
        calendar: calendar!,
        device: productDevice as DeviceId,
        orientation: productOrientation as Orientation,
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

  return (
    <div className="container py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-1">{t('library.hub.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('library.hub.subtitle')}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {showLanguageSelector && (
            <LanguageSelectionRow
              question={t('library.hub.compact.language')}
              options={availableLanguageOptions}
              selected={selectedLanguage}
              onSelect={setSelectedLanguage}
            />
          )}

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

          {hasAllThemes && (
            <ThemeSelectionRow
              question={t('library.hub.compact.theme')}
              options={themeOptions}
              selected={selectedTheme}
              onSelect={setSelectedTheme}
            />
          )}

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

    </div>
  );
}
