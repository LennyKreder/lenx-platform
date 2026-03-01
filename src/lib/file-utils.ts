// Client-safe file utilities (no fs/path imports)
import { languages, type LanguageId, type WeekStart, type TimeFormat, type CalendarIntegration } from '@/config/languages';
import { type PlannerTypeId } from '@/config/planner-types';
import { themes, type ThemeId } from '@/config/themes';
import { devices, type DeviceId, type Orientation, getDeviceShortCode, parseDeviceShortCode as parseDeviceShortCodeFromConfig } from '@/config/devices';

export interface FileParams {
  language: LanguageId;
  theme: ThemeId;
  plannerType: PlannerTypeId;
  weekStart: WeekStart;
  timeFormat: TimeFormat;
  calendar: CalendarIntegration;
  device: DeviceId;
  orientation: Orientation;
  year?: number;
}

// Map planner types to template set names used in file generation
const templateSetMap: Record<PlannerTypeId, string> = {
  full: 'full',
  focus: 'focus',
  minimal: 'minimal',
};

// Week day start abbreviations
const wdsMap: Record<WeekStart, string> = {
  monday: 'mon',
  sunday: 'sun',
};

// Time format abbreviations
const ampmMap: Record<TimeFormat, string> = {
  '24h': '24h',
  'ampm': 'ampm',
};

// Calendar integration folder names
const calendarMap: Record<CalendarIntegration, string> = {
  none: 'none',
  google: 'google',
  apple: 'apple',
};

export function buildFileKey(params: FileParams): string {
  const year = params.year || new Date().getFullYear();
  const { language, theme, device, orientation, plannerType, weekStart, timeFormat, calendar } = params;

  // Full path: {device}/{orientation}/{year}/{language}/{theme}/{plannerType}/{weekStart}/{timeFormat}/{calendar}
  return `${device}/${orientation}/${year}/${language}/${theme}/${plannerType}/${weekStart}/${timeFormat}/${calendar}`;
}

export function parseFileKey(fileKey: string): FileParams | null {
  const parts = fileKey.split('/');

  // Full format: {device}/{orientation}/{year}/{language}/{theme}/{plannerType}/{weekStart}/{timeFormat}/{calendar}
  // Legacy format: {device}/{orientation}/{year}/{language}/{theme} (uses defaults)
  if (parts.length !== 5 && parts.length !== 9) return null;

  const [device, orientation, yearStr, language, theme] = parts;

  const year = parseInt(yearStr, 10);
  if (isNaN(year)) return null;

  // Validate device
  if (!devices[device as DeviceId]) return null;

  // Validate orientation
  if (!['portrait', 'landscape'].includes(orientation)) return null;

  if (parts.length === 9) {
    const [, , , , , plannerType, weekStart, timeFormat, calendar] = parts;
    return {
      language: language as LanguageId,
      theme: theme as ThemeId,
      plannerType: plannerType as PlannerTypeId,
      weekStart: weekStart as WeekStart,
      timeFormat: timeFormat as TimeFormat,
      calendar: calendar as CalendarIntegration,
      device: device as DeviceId,
      orientation: orientation as Orientation,
      year,
    };
  }

  // Legacy 5-part format - use defaults
  return {
    language: language as LanguageId,
    theme: theme as ThemeId,
    plannerType: 'full',
    weekStart: 'monday',
    timeFormat: '24h',
    calendar: 'none',
    device: device as DeviceId,
    orientation: orientation as Orientation,
    year,
  };
}

/**
 * Parse a device short code back to device and orientation.
 * Uses the mapping from devices config.
 * E.g., "ipad-port" -> { device: "ipad", orientation: "portrait" }
 */
function parseDeviceShortCode(code: string): { device: DeviceId | null; orientation: Orientation | null } {
  return parseDeviceShortCodeFromConfig(code);
}

export function getAvailableFilesForTheme(theme: ThemeId | 'all', year?: number): FileParams[] {
  const files: FileParams[] = [];
  const plannerTypes: PlannerTypeId[] = ['full', 'focus', 'minimal'];
  const calendars: CalendarIntegration[] = ['none', 'google', 'apple'];
  const currentYear = year || new Date().getFullYear();

  // If 'all', get files for all themes; otherwise just the specified theme
  const themesToInclude: ThemeId[] = theme === 'all'
    ? (Object.keys(themes) as ThemeId[])
    : [theme];

  for (const themeId of themesToInclude) {
    for (const langId of Object.keys(languages) as LanguageId[]) {
      const lang = languages[langId];
      const weekStarts: WeekStart[] = lang.hasWeekStartOption ? ['monday', 'sunday'] : ['monday'];
      const timeFormats: TimeFormat[] = lang.hasTimeFormatOption ? ['24h', 'ampm'] : ['24h'];

      // Iterate over all devices and their orientations
      for (const deviceId of Object.keys(devices) as DeviceId[]) {
        const device = devices[deviceId];
        for (const orientation of device.orientations) {
          for (const plannerType of plannerTypes) {
            for (const weekStart of weekStarts) {
              for (const timeFormat of timeFormats) {
                for (const calendar of calendars) {
                  const params: FileParams = {
                    language: langId,
                    theme: themeId,
                    plannerType,
                    weekStart,
                    timeFormat,
                    calendar,
                    device: deviceId,
                    orientation,
                    year: currentYear,
                  };
                  files.push(params);
                }
              }
            }
          }
        }
      }
    }
  }

  return files;
}
