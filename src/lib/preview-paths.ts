/**
 * Utility functions for building preview image paths.
 *
 * Preview images are organized in the following structure:
 *
 * Calendar pages (vary by template set, week start, time format):
 *   /previews/{year}/{language}/{theme}/{category}/{subcategory}/{page}/{templateSet}/{weekStart}/{timeFormat}.png
 *   Example: /previews/2026/en/default/calendar/daily/daily_overview/full/sun/ampm.png
 *
 * Standalone pages (same across variants):
 *   /previews/{year}/{language}/{theme}/{category}/{subcategory}/{page}.png
 *   Example: /previews/2026/en/default/standalone/notes_paper/cornell_ruled.png
 */

export type WeekStart = 'sun' | 'mon';
export type TimeFormat = 'ampm' | '24h';
export type TemplateSet = 'full' | 'focus' | 'minimal';

interface CalendarPreviewOptions {
  year: number;
  language: string;
  theme: string;
  /** Template path without .json, e.g., "calendar/daily/daily_overview" */
  templatePath: string;
  templateSet: TemplateSet;
  weekStart: WeekStart;
  timeFormat: TimeFormat;
}

interface StandalonePreviewOptions {
  year: number;
  language: string;
  theme: string;
  /** Template path without .json, e.g., "standalone/notes_paper/cornell_ruled" */
  templatePath: string;
}

/**
 * Build the preview image path for a calendar page.
 * Calendar pages vary by template set, week start day, and time format.
 */
export function getCalendarPreviewPath(options: CalendarPreviewOptions): string {
  const { year, language, theme, templatePath, templateSet, weekStart, timeFormat } = options;
  return `/previews/${year}/${language}/${theme}/${templatePath}/${templateSet}/${weekStart}/${timeFormat}.png`;
}

/**
 * Build the preview image path for a standalone page.
 * Standalone pages are the same across all variants.
 */
export function getStandalonePreviewPath(options: StandalonePreviewOptions): string {
  const { year, language, theme, templatePath } = options;
  return `/previews/${year}/${language}/${theme}/${templatePath}.png`;
}

/**
 * Check if a template path is a calendar page (varies by variant).
 */
export function isCalendarTemplate(templatePath: string): boolean {
  return (
    templatePath.startsWith('calendar/') ||
    templatePath.startsWith('layout/title/') ||
    templatePath.startsWith('layout/menu/') ||
    templatePath.startsWith('layout/setup/') ||
    templatePath.startsWith('layout/extras/')
  );
}

/**
 * Check if a template path is a standalone page.
 */
export function isStandaloneTemplate(templatePath: string): boolean {
  return templatePath.startsWith('standalone/');
}

/**
 * Get the appropriate preview path based on template type.
 */
export function getPreviewPath(
  templatePath: string,
  options: {
    year: number;
    language: string;
    theme: string;
    templateSet?: TemplateSet;
    weekStart?: WeekStart;
    timeFormat?: TimeFormat;
  }
): string {
  const { year, language, theme, templateSet = 'full', weekStart = 'mon', timeFormat = '24h' } = options;

  if (isCalendarTemplate(templatePath)) {
    return getCalendarPreviewPath({
      year,
      language,
      theme,
      templatePath,
      templateSet,
      weekStart,
      timeFormat,
    });
  }

  return getStandalonePreviewPath({
    year,
    language,
    theme,
    templatePath,
  });
}
