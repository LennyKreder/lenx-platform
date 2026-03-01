'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShopFilters } from './ShopFilters';
import { ProductGrid } from './ProductGrid';
import { ProductCard } from './ProductCard';
import { BundleCard } from './BundleCard';
import { RecentlyViewed } from './RecentlyViewed';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Sparkles, Package, ArrowRight } from 'lucide-react';

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
  currency: string;
  images: string[];
  tags?: { id: number; name: string }[];
  template: {
    id: number;
    name: string;
  } | null;
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
  currency: string;
  images: string[];
  isAllAccess: boolean;
  isFeatured?: boolean;
}

interface ShopData {
  products: Product[];
  featuredProducts?: Product[];
  bundles: Bundle[];
  totalBundleCount?: number;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  filters: {
    years: number[];
    themes: string[];
    devices: string[];
    productTypes: string[];
    priceRange?: { min: number; max: number };
  };
}

export interface FilterVisibility {
  year?: boolean;
  theme?: boolean;
  themeMode?: boolean;
  device?: boolean;
  itemType?: boolean;
  productType?: boolean;
  onSale?: boolean;
}

interface ShopPageClientProps {
  locale: string;
  initialData?: ShopData;
  showRecentlyViewed?: boolean;
  recentlyViewedMaxQty?: number;
  visibleFilters?: FilterVisibility;
}

export function ShopPageClient({ locale, initialData, showRecentlyViewed = true, recentlyViewedMaxQty, visibleFilters }: ShopPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial filter values from URL
  const [selectedYear, setSelectedYear] = useState(
    searchParams.get('year') || 'all'
  );
  const [selectedTheme, setSelectedTheme] = useState(
    searchParams.get('theme') || 'all'
  );
  const [selectedDevice, setSelectedDevice] = useState(
    searchParams.get('device') || 'all'
  );
  const [selectedThemeMode, setSelectedThemeMode] = useState(
    searchParams.get('themeMode') || 'all'
  );
  const [selectedItemType, setSelectedItemType] = useState(
    searchParams.get('type') || 'all'
  );
  const [selectedProductType, setSelectedProductType] = useState(
    searchParams.get('productType') || 'all'
  );
  const [onSale, setOnSale] = useState(
    searchParams.get('onSale') === 'true'
  );
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || ''
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [debouncedMinPrice, setDebouncedMinPrice] = useState(minPrice);
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState(maxPrice);
  const [page, setPage] = useState(
    parseInt(searchParams.get('page') || '1', 10)
  );

  const [data, setData] = useState<ShopData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search and price inputs
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setDebouncedMinPrice(minPrice);
      setDebouncedMaxPrice(maxPrice);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, minPrice, maxPrice]);

  // Fetch products when filters change
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('locale', locale);
      if (selectedYear !== 'all') params.set('year', selectedYear);
      if (selectedTheme !== 'all') params.set('theme', selectedTheme);
      if (selectedThemeMode !== 'all') params.set('themeMode', selectedThemeMode);
      if (selectedDevice !== 'all') params.set('device', selectedDevice);
      if (selectedItemType !== 'all') params.set('type', selectedItemType);
      if (selectedProductType !== 'all') params.set('productType', selectedProductType);
      if (onSale) params.set('onSale', 'true');
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (debouncedMinPrice) params.set('minPrice', String(Math.round(parseFloat(debouncedMinPrice) * 100)));
      if (debouncedMaxPrice) params.set('maxPrice', String(Math.round(parseFloat(debouncedMaxPrice) * 100)));
      params.set('page', page.toString());

      const response = await fetch(`/api/shop/products?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [locale, selectedYear, selectedTheme, selectedThemeMode, selectedDevice, selectedItemType, selectedProductType, onSale, debouncedSearch, debouncedMinPrice, debouncedMaxPrice, page]);

  // Update URL when filters change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedYear !== 'all') params.set('year', selectedYear);
    if (selectedTheme !== 'all') params.set('theme', selectedTheme);
    if (selectedThemeMode !== 'all') params.set('themeMode', selectedThemeMode);
    if (selectedDevice !== 'all') params.set('device', selectedDevice);
    if (selectedItemType !== 'all') params.set('type', selectedItemType);
    if (selectedProductType !== 'all') params.set('productType', selectedProductType);
    if (onSale) params.set('onSale', 'true');
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (debouncedMinPrice) params.set('minPrice', debouncedMinPrice);
    if (debouncedMaxPrice) params.set('maxPrice', debouncedMaxPrice);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router, selectedYear, selectedTheme, selectedThemeMode, selectedDevice, selectedItemType, selectedProductType, onSale, debouncedSearch, debouncedMinPrice, debouncedMaxPrice, page]);

  useEffect(() => {
    fetchProducts();
    updateUrl();
  }, [fetchProducts, updateUrl]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setPage(1);
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    setPage(1);
  };

  const handleDeviceChange = (device: string) => {
    setSelectedDevice(device);
    setPage(1);
  };

  const handleThemeModeChange = (mode: string) => {
    setSelectedThemeMode(mode);
    setPage(1);
  };

  const handleItemTypeChange = (type: string) => {
    setSelectedItemType(type);
    setPage(1);
  };

  const handleProductTypeChange = (productType: string) => {
    setSelectedProductType(productType);
    setPage(1);
  };

  const handleOnSaleChange = (value: boolean) => {
    setOnSale(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedYear('all');
    setSelectedTheme('all');
    setSelectedThemeMode('all');
    setSelectedDevice('all');
    setSelectedItemType('all');
    setSelectedProductType('all');
    setOnSale(false);
    setSearchQuery('');
    setDebouncedSearch('');
    setMinPrice('');
    setMaxPrice('');
    setDebouncedMinPrice('');
    setDebouncedMaxPrice('');
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters =
    selectedYear !== 'all' ||
    selectedTheme !== 'all' ||
    selectedThemeMode !== 'all' ||
    selectedDevice !== 'all' ||
    selectedItemType !== 'all' ||
    selectedProductType !== 'all' ||
    onSale ||
    searchQuery !== '' ||
    minPrice !== '' ||
    maxPrice !== '';

  const isNL = locale === 'nl';

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <ShopFilters
          years={data?.filters.years || []}
          availableThemes={data?.filters.themes || []}
          availableDevices={data?.filters.devices || []}
          availableProductTypes={data?.filters.productTypes || []}
          selectedYear={selectedYear}
          selectedTheme={selectedTheme}
          selectedThemeMode={selectedThemeMode}
          selectedDevice={selectedDevice}
          selectedItemType={selectedItemType}
          selectedProductType={selectedProductType}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onYearChange={handleYearChange}
          onThemeChange={handleThemeChange}
          onThemeModeChange={handleThemeModeChange}
          onDeviceChange={handleDeviceChange}
          onItemTypeChange={handleItemTypeChange}
          onProductTypeChange={handleProductTypeChange}
          onSale={onSale}
          onSaleChange={handleOnSaleChange}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onClearFilters={handleClearFilters}
          locale={locale}
          visibleFilters={visibleFilters}
        />

      </div>

      {/* Result count - only shown when filters are active */}
      {hasActiveFilters && data && !isLoading && (
        <p className="text-sm text-muted-foreground">
          {data.pagination.totalCount === 0 && debouncedSearch ? (
            isNL
              ? `Geen producten gevonden voor "${debouncedSearch}"`
              : `No products found for "${debouncedSearch}"`
          ) : (
            isNL
              ? `${data.pagination.totalCount} product${data.pagination.totalCount !== 1 ? 'en' : ''} gevonden`
              : `${data.pagination.totalCount} product${data.pagination.totalCount !== 1 ? 's' : ''} found`
          )}
        </p>
      )}

      {/* Mobile bundle pill - compact link to bundles page */}
      {page === 1 && ((data?.bundles && data.bundles.length > 0) || (data?.totalBundleCount ?? 0) > 0) && (
        <Link
          href={`/${locale}/shop/bundles`}
          className="md:hidden flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-accent transition-colors w-fit"
        >
          <Package className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium">
            {isNL ? 'Bekijk bundels' : 'View bundles'}
          </span>
          {(data?.totalBundleCount ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground">
              ({data?.totalBundleCount})
            </span>
          )}
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      )}

      {/* Combined Featured + Bundles section */}
      {page === 1 && !hasActiveFilters && ((data?.bundles && data.bundles.length > 0) || (data?.featuredProducts && data.featuredProducts.length > 0)) && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              {isNL ? 'Uitgelicht' : 'Featured'}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Bundle card - hidden on mobile (pill shown instead) */}
            {data?.bundles?.slice(0, 1).map((bundle) => (
              <div key={`bundle-${bundle.id}`} className="hidden md:block">
                <BundleCard bundle={bundle} locale={locale} />
              </div>
            ))}
            {/* Featured products */}
            {data?.featuredProducts?.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} isFeatured />
            ))}
          </div>
        </div>
      )}

      {/* Bundles Grid - shown when type=bundles */}
      {selectedItemType === 'bundles' && data?.bundles && data.bundles.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.bundles.map((bundle) => (
            <BundleCard key={`bundle-${bundle.id}`} bundle={bundle} locale={locale} />
          ))}
        </div>
      )}

      {/* Product Grid - hidden when type=bundles */}
      {selectedItemType !== 'bundles' && (
        <ProductGrid
          products={data?.products || []}
          locale={locale}
          isLoading={isLoading}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Empty state for bundles when type=bundles and no bundles found */}
      {selectedItemType === 'bundles' && (!data?.bundles || data.bundles.length === 0) && !isLoading && (
        <div className="text-center py-16">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {isNL ? 'Geen bundels gevonden' : 'No bundles found'}
          </h3>
          <p className="text-muted-foreground">
            {isNL
              ? 'Probeer je filters aan te passen of kom later terug.'
              : 'Try adjusting your filters or check back later.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground px-4">
            Page {page} of {data.pagination.totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= data.pagination.totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Recently Viewed */}
      {showRecentlyViewed && <RecentlyViewed locale={locale} maxQty={recentlyViewedMaxQty} />}
    </div>
  );
}
