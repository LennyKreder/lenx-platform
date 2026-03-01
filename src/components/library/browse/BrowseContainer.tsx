'use client';

import { useState, useMemo } from 'react';
import { usePurchase } from '@/contexts/PurchaseContext';
import { FilterBar } from './FilterBar';
import { FileGrid } from './FileGrid';
import { getAvailableFilesForTheme, buildFileKey } from '@/lib/file-utils';
import { languages } from '@/config/languages';
import type { BrowseFilters, FileInfo } from '@/types';

export function BrowseContainer() {
  const purchase = usePurchase();
  const [filters, setFilters] = useState<BrowseFilters>({
    language: 'all',
    plannerType: 'all',
    weekStart: 'all',
    timeFormat: 'all',
    calendar: 'all',
  });

  const allFiles = useMemo(() => {
    const fileParams = getAvailableFilesForTheme(purchase.theme);
    return fileParams.map((params): FileInfo => ({
      key: buildFileKey(params),
      language: params.language,
      theme: params.theme,
      plannerType: params.plannerType,
      weekStart: params.weekStart,
      timeFormat: params.timeFormat,
      calendar: params.calendar,
      year: params.year || new Date().getFullYear(),
      exists: true, // We'll assume files exist for display; actual check happens on download
    }));
  }, [purchase.theme]);

  const filteredFiles = useMemo(() => {
    return allFiles.filter((file) => {
      // Filter by language
      if (filters.language !== 'all' && file.language !== filters.language) {
        return false;
      }

      // Filter by planner type
      if (filters.plannerType !== 'all' && file.plannerType !== filters.plannerType) {
        return false;
      }

      // Filter by week start
      if (filters.weekStart !== 'all' && file.weekStart !== filters.weekStart) {
        return false;
      }

      // Filter by time format
      if (filters.timeFormat !== 'all' && file.timeFormat !== filters.timeFormat) {
        return false;
      }

      // Filter by calendar
      if (filters.calendar !== 'all' && file.calendar !== filters.calendar) {
        return false;
      }

      // For non-English languages, only show valid combinations
      const lang = languages[file.language];
      if (!lang.hasWeekStartOption && file.weekStart !== lang.defaultWeekStart) {
        return false;
      }
      if (!lang.hasTimeFormatOption && file.timeFormat !== lang.defaultTimeFormat) {
        return false;
      }

      return true;
    });
  }, [allFiles, filters]);

  return (
    <div>
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        resultCount={filteredFiles.length}
      />
      <div className="container py-6">
        <FileGrid files={filteredFiles} accessCode={purchase.code} />
      </div>
    </div>
  );
}
