'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { themes } from '@/config/themes';
import { X } from 'lucide-react';

const languageLabels: Record<string, string> = {
  en: 'English',
  nl: 'Nederlands',
};

export interface FilterState {
  year: string | null;
  theme: string | null;
  language: string | null;
  mode: string | null;
}

interface LibraryFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableYears: number[];
  availableThemes: string[];
  availableLanguages: string[];
  availableModes: string[];
}

const modeLabels: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
};

export function LibraryFilters({
  filters,
  onFiltersChange,
  availableYears,
  availableThemes,
  availableLanguages,
  availableModes,
}: LibraryFiltersProps) {
  const hasActiveFilters = filters.year || filters.theme || filters.language || filters.mode;

  const resetFilters = () => {
    onFiltersChange({ year: null, theme: null, language: null, mode: null });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Year Filter */}
      {availableYears.length > 1 && (
        <Select
          value={filters.year || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, year: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Mode Filter (Light/Dark) */}
      {availableModes.length > 1 && (
        <Select
          value={filters.mode || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, mode: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            {availableModes.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {modeLabels[mode] || mode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Theme Filter */}
      {availableThemes.length > 1 && (
        <Select
          value={filters.theme || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, theme: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Themes</SelectItem>
            {[...availableThemes]
              .sort((a, b) => {
                const nameA = themes[a as keyof typeof themes]?.name || a;
                const nameB = themes[b as keyof typeof themes]?.name || b;
                return nameA.localeCompare(nameB);
              })
              .map((themeId) => {
                const themeConfig = themes[themeId as keyof typeof themes];
                return (
                  <SelectItem key={themeId} value={themeId}>
                    <div className="flex items-center gap-2">
                      {themeConfig && (
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: themeConfig.previewColor }}
                        />
                      )}
                      {themeConfig?.name || themeId}
                    </div>
                  </SelectItem>
                );
              })}
          </SelectContent>
        </Select>
      )}

      {/* Language Filter */}
      {availableLanguages.length > 1 && (
        <Select
          value={filters.language || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, language: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {languageLabels[lang] || lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
