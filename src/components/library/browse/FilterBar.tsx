'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { languages, type LanguageId, type WeekStart, type TimeFormat, type CalendarIntegration } from '@/config/languages';
import { plannerTypes, type PlannerTypeId } from '@/config/planner-types';
import type { BrowseFilters } from '@/types';

interface FilterBarProps {
  filters: BrowseFilters;
  onFilterChange: (filters: BrowseFilters) => void;
  resultCount: number;
}

export function FilterBar({ filters, onFilterChange, resultCount }: FilterBarProps) {
  const updateFilter = <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="sticky top-0 z-10 bg-background border-b py-4">
      <div className="container">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="language-filter">Language</Label>
            <Select
              value={filters.language}
              onValueChange={(value) => updateFilter('language', value as LanguageId | 'all')}
            >
              <SelectTrigger id="language-filter" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {Object.values(languages).map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type-filter">Planner Type</Label>
            <Select
              value={filters.plannerType}
              onValueChange={(value) => updateFilter('plannerType', value as PlannerTypeId | 'all')}
            >
              <SelectTrigger id="type-filter" className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.values(plannerTypes).map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weekstart-filter">Week Start</Label>
            <Select
              value={filters.weekStart}
              onValueChange={(value) => updateFilter('weekStart', value as WeekStart | 'all')}
            >
              <SelectTrigger id="weekstart-filter" className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="time-filter">Time Format</Label>
            <Select
              value={filters.timeFormat}
              onValueChange={(value) => updateFilter('timeFormat', value as TimeFormat | 'all')}
            >
              <SelectTrigger id="time-filter" className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="24h">24-Hour</SelectItem>
                <SelectItem value="ampm">AM/PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calendar-filter">Calendar</Label>
            <Select
              value={filters.calendar}
              onValueChange={(value) => updateFilter('calendar', value as CalendarIntegration | 'all')}
            >
              <SelectTrigger id="calendar-filter" className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="apple">Apple</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto text-sm text-muted-foreground">
            {resultCount} {resultCount === 1 ? 'file' : 'files'} found
          </div>
        </div>
      </div>
    </div>
  );
}
