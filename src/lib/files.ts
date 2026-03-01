// Server-only file utilities (uses S3)
import 'server-only';
import path from 'path';
import type { FileParams } from './file-utils';
import { getDeviceShortCode } from '@/config/devices';
import { getThemeShortCode } from '@/config/themes';
import { listObjects } from './s3';

// Re-export client-safe utilities
export * from './file-utils';

// S3 key prefix for planners (under the files/ root in the bucket)
const PLANNERS_PREFIX = 'files/planners';

// Map planner types to template set names used in file generation
const templateSetMap: Record<string, string> = {
  full: 'full',
  focus: 'focus',
  minimal: 'minimal',
};

// Week day start abbreviations
const wdsMap: Record<string, string> = {
  monday: 'mon',
  sunday: 'sun',
};

// Time format abbreviations for filenames
const ampmShortMap: Record<string, string> = {
  '24h': '24h',
  'ampm': 'am',
};

// Calendar integration file suffixes (with hyphen prefix)
const calendarSuffixMap: Record<string, string> = {
  none: '',
  google: '-gcal',
  apple: '-ical',
};

// Template set short codes for filenames
const templateSetShortCodes: Record<string, string> = {
  full: 'full',
  focus: 'focus',
  minimal: 'min',
};

export function buildS3Prefix(params: FileParams): string {
  const year = params.year || new Date().getFullYear();
  const { language, theme, device, orientation } = params;

  // S3 key structure: files/planners/{device}/{orientation}/{year}/{language}/{theme}/
  return [PLANNERS_PREFIX, device, orientation, year.toString(), language, theme].join('/');
}

// Keep old name as alias for compatibility
export const buildFilePath = buildS3Prefix;

export async function findActualFile(params: FileParams): Promise<string | null> {
  const year = params.year || new Date().getFullYear();
  const { language, theme, plannerType, weekStart, timeFormat, calendar, device, orientation } = params;

  const wds = wdsMap[weekStart];
  const ampmShort = ampmShortMap[timeFormat];
  const calendarSuffix = calendarSuffixMap[calendar];
  const deviceShortCode = getDeviceShortCode(device, orientation);
  const themeShort = getThemeShortCode(theme);
  const templateSetShort = templateSetShortCodes[plannerType] || plannerType;

  // S3 prefix: files/planners/{device}/{orientation}/{year}/{language}/{theme}/
  const prefix = [PLANNERS_PREFIX, device, orientation, year.toString(), language, theme].join('/') + '/';

  const objects = await listObjects(prefix);

  if (objects.length === 0) {
    console.error('No objects found with prefix:', prefix);
    return null;
  }

  // Extract just filenames from full S3 keys
  const fileNames = objects.map((obj) => ({
    key: obj.key,
    name: obj.key.split('/').pop()!,
  }));

  // Build pattern to match files (same logic as before)
  const patternParts = [
    year.toString(),
    language,
    themeShort,
    deviceShortCode,
    templateSetShort,
    '\\d+p',  // pagecount varies
    ampmShort,
    wds,
  ];

  let pattern: RegExp;
  if (calendarSuffix) {
    pattern = new RegExp(`^${patternParts.join('-')}${calendarSuffix}\\.pdf$`);
  } else {
    pattern = new RegExp(`^${patternParts.join('-')}\\.pdf$`);
  }

  const matches = fileNames.filter((f) => pattern.test(f.name));

  if (matches.length === 0) {
    // Fallback: looser matching
    const loosePattern = new RegExp(
      `^${year}-${language}-.*-${deviceShortCode}-${templateSetShort}-\\d+p-${ampmShort}-${wds}${calendarSuffix || ''}\\.pdf$`
    );
    const looseMatches = fileNames.filter((f) => loosePattern.test(f.name));

    if (looseMatches.length === 0) {
      console.error('No matching PDF found with prefix:', prefix, 'Pattern:', pattern.source);
      return null;
    }
    return looseMatches[0].key;
  }

  return matches[0].key;
}

export async function fileExists(params: FileParams): Promise<boolean> {
  return (await findActualFile(params)) !== null;
}
