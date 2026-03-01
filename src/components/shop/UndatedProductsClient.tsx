'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ProductGrid } from './ProductGrid';
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
import { devices } from '@/config/devices';
import { type UndatedProductType, buildUndatedProductUrl } from '@/lib/routing';

interface Product {
  id: number;
  name: string;
  description: string;
  slug: string;
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
  productType: string | null;
  device: string | null;
  priceInCents: number;
  discountedPriceInCents?: number;
  hasDiscount?: boolean;
  discountPercent?: number;
  currency: string;
  images: string[];
  tags?: { id: number; name: string }[];
  template: { id: number; name: string } | null;
}

interface UndatedProductsClientProps {
  locale: string;
  productType: UndatedProductType;
}

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

export function UndatedProductsClient({
  locale,
  productType,
}: UndatedProductsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedTheme, setSelectedTheme] = useState(searchParams.get('theme') || 'all');
  const [selectedThemeMode, setSelectedThemeMode] = useState(
    searchParams.get('mode') || 'all'
  );
  const [selectedDevice, setSelectedDevice] = useState(
    searchParams.get('device') || 'all'
  );

  // Debounce search
  const debouncedSearch = useDebounce(searchQuery, 300);

  const isNL = locale === 'nl';

  // Update URL with filters
  const updateUrl = useCallback(
    (params: { search?: string; theme?: string; mode?: string; device?: string }) => {
      const newParams = new URLSearchParams(searchParams.toString());

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (value && value !== 'all') {
            newParams.set(key, value);
          } else {
            newParams.delete(key);
          }
        }
      });

      const query = newParams.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Fetch products
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          locale,
          type: productType,
        });

        if (debouncedSearch) params.set('search', debouncedSearch);
        if (selectedTheme && selectedTheme !== 'all') params.set('theme', selectedTheme);
        if (selectedThemeMode && selectedThemeMode !== 'all')
          params.set('themeMode', selectedThemeMode);
        if (selectedDevice && selectedDevice !== 'all')
          params.set('device', selectedDevice);

        const response = await fetch(`/api/shop/products?${params}`);
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
          setAvailableThemes(data.filters?.themes || []);
          setAvailableDevices(data.filters?.devices || []);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, [locale, productType, debouncedSearch, selectedTheme, selectedThemeMode, selectedDevice]);

  // Sync URL params to state on mount/change
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSelectedTheme(searchParams.get('theme') || 'all');
    setSelectedThemeMode(searchParams.get('mode') || 'all');
    setSelectedDevice(searchParams.get('device') || 'all');
  }, [searchParams]);

  // Update URL when debounced search changes
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (debouncedSearch !== currentSearch) {
      updateUrl({ search: debouncedSearch });
    }
  }, [debouncedSearch, searchParams, updateUrl]);

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedTheme !== 'all' ||
    selectedThemeMode !== 'all' ||
    selectedDevice !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTheme('all');
    setSelectedThemeMode('all');
    setSelectedDevice('all');
    router.push(pathname, { scroll: false });
  };

  // Transform products for ProductGrid
  const gridProducts = products.map((p) => ({
    ...p,
    // Build the URL for the new routing structure (no year segment)
    href: buildUndatedProductUrl(locale, productType, p.slug),
    // Ensure required properties for ProductGrid
    template: p.template || null,
  }));

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
            placeholder={isNL ? 'Zoeken...' : 'Search...'}
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

        {/* Device Filter */}
        {availableDevices.length > 0 && (
          <Select
            value={selectedDevice}
            onValueChange={(value) => {
              setSelectedDevice(value);
              updateUrl({ device: value });
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={isNL ? 'Apparaat' : 'Device'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {isNL ? 'Alle apparaten' : 'All Devices'}
              </SelectItem>
              {availableDevices.map((deviceId) => {
                const device = devices[deviceId as keyof typeof devices];
                return (
                  <SelectItem key={deviceId} value={deviceId}>
                    {device?.name || deviceId}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}

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

      {/* Results count */}
      {hasActiveFilters && !isLoading && (
        <p className="text-sm text-muted-foreground">
          {isNL
            ? `${products.length} product${products.length !== 1 ? 'en' : ''} gevonden`
            : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
        </p>
      )}

      {/* Products Grid */}
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
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? isNL
                ? 'Geen producten gevonden met deze filters.'
                : 'No products found matching your filters.'
              : isNL
                ? 'Geen producten beschikbaar.'
                : 'No products available.'}
          </p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              {isNL ? 'Filters wissen' : 'Clear filters'}
            </Button>
          )}
        </div>
      ) : (
        <ProductGrid products={gridProducts} locale={locale} />
      )}
    </div>
  );
}
