'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { themes, type ThemeId } from '@/config/themes';
import { languages } from '@/config/languages';
import { plannerTypes } from '@/config/planner-types';
import { type DeviceId, type Orientation } from '@/config/devices';
import { buildFileKey } from '@/lib/file-utils';
import { Download, Loader2, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import type { WizardState } from './WizardContainer';

interface StepResultProps {
  state: WizardState;
  theme: ThemeId | 'all';
  accessCode: string;
  device: DeviceId | null;
  orientation: Orientation | null;
}

export function StepResult({ state, theme, accessCode, device, orientation }: StepResultProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Wizard doesn't support 'all' themes - this should not happen in normal flow
  if (theme === 'all') {
    return (
      <div className="text-center text-destructive p-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-4" />
        <p className="font-medium">Theme selection required</p>
        <p className="text-sm mt-2">Please use the main hub for all-themes access.</p>
      </div>
    );
  }

  const themeInfo = themes[theme];
  const languageInfo = state.language ? languages[state.language] : null;
  const plannerTypeInfo = state.plannerType ? plannerTypes[state.plannerType] : null;

  const isComplete =
    state.language &&
    state.plannerType &&
    state.weekStart &&
    state.timeFormat &&
    state.calendar &&
    device &&
    orientation;

  const handleDownload = async () => {
    if (!isComplete) return;

    setIsDownloading(true);
    setDownloadStatus('idle');
    setErrorMessage(null);

    try {
      const fileKey = buildFileKey({
        language: state.language!,
        theme,
        plannerType: state.plannerType!,
        weekStart: state.weekStart!,
        timeFormat: state.timeFormat!,
        calendar: state.calendar!,
        device: device!,
        orientation: orientation!,
      });

      const response = await fetch(`/api/library/download/${fileKey}`, {
        headers: {
          'x-access-code': accessCode,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Download failed');
      }

      // Get the filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'planner.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Log wizard session for analytics
      fetch('/api/library/wizard/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode,
          language: state.language,
          plannerType: state.plannerType,
          weekStart: state.weekStart,
          timeFormat: state.timeFormat,
          calendarIntegration: state.calendar,
          completed: true,
        }),
      }).catch((err) => console.warn('Analytics logging failed:', err));

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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Your planner is ready!</h2>
        <p className="text-muted-foreground mt-2">
          Review your selections and download your personalized planner.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full border-4 border-background shadow-lg flex-shrink-0"
              style={{ backgroundColor: themeInfo?.previewColor || '#666' }}
            />
            <div>
              <CardTitle className="text-xl">
                {plannerTypeInfo?.name || state.plannerType} Planner
              </CardTitle>
              <CardDescription>
                {themeInfo?.name || theme} theme
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Language:</span>
              <span className="ml-2 font-medium">
                {languageInfo?.flag} {languageInfo?.name || state.language}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Templates:</span>
              <span className="ml-2 font-medium">
                {plannerTypeInfo?.templateCount}+
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Week starts:</span>
              <span className="ml-2 font-medium capitalize">{state.weekStart}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Time format:</span>
              <span className="ml-2 font-medium">
                {state.timeFormat === '24h' ? '24-Hour' : 'AM/PM'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-sm text-muted-foreground">Calendar integration:</span>
            <Badge variant="secondary" className="ml-2">
              {state.calendar === 'none'
                ? 'None'
                : state.calendar === 'google'
                ? 'Google Calendar'
                : 'Apple Calendar'}
            </Badge>
          </div>

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
                  Preparing download...
                </>
              ) : downloadStatus === 'success' ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Downloaded! Click to download again
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Download Planner
                </>
              )}
            </Button>

            {downloadStatus === 'error' && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Download failed</p>
                  <p className="text-sm">{errorMessage || 'Please try again'}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
