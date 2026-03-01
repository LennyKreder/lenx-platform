'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { BundleCard } from './BundleCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { themes, getThemeName } from '@/config/themes';

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface Bundle {
  id: number;
  type: 'bundle';
  name: string;
  description: string;
  shortDescription?: string | null;
  slug: string;
  priceInCents: number;
  discountedPriceInCents?: number;
  hasDiscount?: boolean;
  discountPercent?: number;
  totalProductValueInCents?: number;
  currency: string;
  images: string[];
  isAllAccess: boolean;
  isFeatured?: boolean;
  theme?: string | null;
}

interface BundlesPageClientProps {
  locale: string;
}

export function BundlesPageClient({ locale }: BundlesPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedTheme, setSelectedTheme] = useState(searchParams.get('theme') || 'all');
  const [selectedThemeMode, setSelectedThemeMode] = useState(searchParams.get('mode') || 'all');

  // Debounce search for API calls (300ms delay)
  const debouncedSearch = useDebounce(searchQuery, 300);

  const isNL = locale === 'nl';

  // Update URL with filters
  const updateUrl = useCallback(
    (params: { search?: string; theme?: string; mode?: string }) => {
      const newParams = new URLSearchParams(searchParams.toString());

      if (params.search !== undefined) {
        if (params.search) {
          newParams.set('search', params.search);
        } else {
          newParams.delete('search');
        }
      }

      if (params.theme !== undefined) {
        if (params.theme && params.theme !== 'all') {
          newParams.set('theme', params.theme);
        } else {
          newParams.delete('theme');
        }
      }

      if (params.mode !== undefined) {
        if (params.mode && params.mode !== 'all') {
          newParams.set('mode', params.mode);
        } else {
          newParams.delete('mode');
        }
      }

      const query = newParams.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Fetch bundles with filters (uses debounced search)
  useEffect(() => {
    async function fetchBundles() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ locale });
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (selectedTheme && selectedTheme !== 'all') params.set('theme', selectedTheme);
        if (selectedThemeMode && selectedThemeMode !== 'all') params.set('mode', selectedThemeMode);

        const response = await fetch(`/api/shop/bundles?${params}`);
        if (response.ok) {
          const data = await response.json();
          setBundles(data.bundles || []);
          setAvailableThemes(data.availableThemes || []);
        }
      } catch (error) {
        console.error('Failed to fetch bundles:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBundles();
  }, [locale, debouncedSearch, selectedTheme, selectedThemeMode]);

  // Sync URL params to state on mount/change
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSelectedTheme(searchParams.get('theme') || 'all');
    setSelectedThemeMode(searchParams.get('mode') || 'all');
  }, [searchParams]);

  // Update URL when debounced search changes
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (debouncedSearch !== currentSearch) {
      updateUrl({ search: debouncedSearch });
    }
  }, [debouncedSearch, searchParams, updateUrl]);

  const hasActiveFilters = searchQuery !== '' || selectedTheme !== 'all' || selectedThemeMode !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTheme('all');
    setSelectedThemeMode('all');
    router.push(pathname, { scroll: false });
  };

  // Sort: All Access first, then featured, then by name
  const sortedBundles = [...bundles].sort((a, b) => {
    if (a.isAllAccess && !b.isAllAccess) return -1;
    if (!a.isAllAccess && b.isAllAccess) return 1;
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isNL ? 'Bundels zoeken...' : 'Search bundles...'}
            className="pl-9 w-full sm:w-[200px]"
          />
        </div>

        {/* Theme Filter */}
        {availableThemes.length > 0 && (
          <Select
            value={selectedTheme}
            onValueChange={(value) => {
              setSelectedTheme(value);
              updateUrl({ theme: value });
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={isNL ? 'Thema' : 'Theme'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isNL ? "Alle thema's" : 'All Themes'}</SelectItem>
              {[...availableThemes]
                .sort((a, b) => {
                  const nameA = getThemeName(a, locale);
                  const nameB = getThemeName(b, locale);
                  return nameA.localeCompare(nameB);
                })
                .map((themeId) => {
                  const theme = themes[themeId as keyof typeof themes];
                  return (
                    <SelectItem key={themeId} value={themeId}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: theme?.previewColor || '#888' }}
                        />
                        {getThemeName(themeId, locale)}
                      </span>
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        )}

        {/* Theme Mode Filter */}
        <Select
          value={selectedThemeMode}
          onValueChange={(value) => {
            setSelectedThemeMode(value);
            updateUrl({ mode: value });
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={isNL ? 'Modus' : 'Mode'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isNL ? 'Alle modi' : 'All Modes'}</SelectItem>
            <SelectItem value="light">{isNL ? 'Licht' : 'Light'}</SelectItem>
            <SelectItem value="dark">{isNL ? 'Donker' : 'Dark'}</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            {isNL ? 'Wissen' : 'Clear'}
          </Button>
        )}
      </div>

      {/* Results count - only shown when filters are active */}
      {hasActiveFilters && !isLoading && (
        <p className="text-sm text-muted-foreground">
          {isNL
            ? `${bundles.length} bundel${bundles.length !== 1 ? 's' : ''} gevonden`
            : `${bundles.length} bundle${bundles.length !== 1 ? 's' : ''} found`}
        </p>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border bg-card overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-6 bg-muted rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? isNL
                ? 'Geen bundels gevonden met deze filters.'
                : 'No bundles found matching your filters.'
              : isNL
              ? 'Geen bundels beschikbaar.'
              : 'No bundles available.'}
          </p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              {isNL ? 'Filters wissen' : 'Clear filters'}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedBundles.map((bundle) => (
            <BundleCard key={bundle.id} bundle={bundle} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
