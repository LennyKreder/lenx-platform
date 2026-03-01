import type { LanguageId, WeekStart, TimeFormat, CalendarIntegration } from '@/config/languages';
import type { PlannerTypeId } from '@/config/planner-types';
import type { ThemeId } from '@/config/themes';

// Re-export config types
export type { LanguageId, WeekStart, TimeFormat, CalendarIntegration, PlannerTypeId, ThemeId };

// Wizard state for client-side
export interface WizardState {
  step: number;
  language: LanguageId | null;
  plannerType: PlannerTypeId | null;
  weekStart: WeekStart | null;
  timeFormat: TimeFormat | null;
  calendar: CalendarIntegration | null;
}

// API response types
export interface ValidateCodeResponse {
  success: boolean;
  error?: string;
  purchase?: {
    accessCode: string;
    theme: ThemeId;
    email: string;
    createdAt: string;
    expiresAt: string | null;
  };
}

export interface DownloadResponse {
  success: boolean;
  error?: string;
}

// File browsing types
export interface FileInfo {
  key: string;
  language: LanguageId;
  theme: ThemeId;
  plannerType: PlannerTypeId;
  weekStart: WeekStart;
  timeFormat: TimeFormat;
  calendar: CalendarIntegration;
  year: number;
  exists: boolean;
}

// Filter state for browse view
export interface BrowseFilters {
  language: LanguageId | 'all';
  plannerType: PlannerTypeId | 'all';
  weekStart: WeekStart | 'all';
  timeFormat: TimeFormat | 'all';
  calendar: CalendarIntegration | 'all';
}
