'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProductTable } from '@/components/admin/products/ProductTable';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Eye, EyeOff, Star, StarOff, Trash2, X, Loader2, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { devices } from '@/config/devices';
import { themes } from '@/config/themes';
import { productTypes } from '@/config/product-types';

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface ProductTranslation {
  languageCode: string;
  name: string | null;
  description: string | null;
}

interface TemplateTranslation {
  languageCode: string;
  name: string;
}

interface Product {
  id: number;
  year: number | null;
  theme: string | null;
  contentLanguage: string | null;
  productType: string | null;
  device: string | null;
  priceInCents: number;
  currency: string;
  downloadCode: string;
  isPublished: boolean;
  isFeatured: boolean;
  translations: ProductTranslation[];
  slugs: SlugRoute[];
  template: {
    translations: TemplateTranslation[];
    slugs: SlugRoute[];
  } | null;
  _count: { files: number; tags: number };
  imageCount: number;
  hasVideo: boolean;
}

interface TemplateOption {
  id: number;
  name: string;
  device: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ProductsPageClientProps {
  initialProducts: Product[];
  initialPagination: Pagination;
  showSiteColumn?: boolean;
  showDigitalFilters?: boolean;
}

const FILTERS_STORAGE_KEY = 'admin-products-filters';

interface SavedFilters {
  search: string;
  template: string;
  status: string;
  device: string;
  theme: string;
  language: string;
  year: string;
  productType: string;
}

function loadSavedFilters(): SavedFilters | null {
  try {
    const saved = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveFilters(filters: SavedFilters) {
  try {
    sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage errors
  }
}

function clearSavedFilters() {
  try {
    sessionStorage.removeItem(FILTERS_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function ProductsPageClient({
  initialProducts,
  initialPagination,
  showSiteColumn,
  showDigitalFilters = true,
}: ProductsPageClientProps) {
  const saved = useRef(loadSavedFilters());

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState(saved.current?.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(saved.current?.search || '');
  const [selectedTemplate, setSelectedTemplate] = useState(saved.current?.template || 'all');
  const [selectedStatus, setSelectedStatus] = useState(saved.current?.status || 'all');
  const [selectedDevice, setSelectedDevice] = useState(saved.current?.device || 'all');
  const [selectedTheme, setSelectedTheme] = useState(saved.current?.theme || 'all');
  const [selectedLanguage, setSelectedLanguage] = useState(saved.current?.language || 'all');
  const [selectedYear, setSelectedYear] = useState(saved.current?.year || 'all');
  const [selectedProductType, setSelectedProductType] = useState(saved.current?.productType || 'all');
  const [page, setPage] = useState(initialPagination.page);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const hasRestoredFilters = useRef(!!saved.current);

  // Save filters to sessionStorage whenever they change
  useEffect(() => {
    saveFilters({
      search: searchQuery,
      template: selectedTemplate,
      status: selectedStatus,
      device: selectedDevice,
      theme: selectedTheme,
      language: selectedLanguage,
      year: selectedYear,
      productType: selectedProductType,
    });
  }, [searchQuery, selectedTemplate, selectedStatus, selectedDevice, selectedTheme, selectedLanguage, selectedYear, selectedProductType]);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedTemplate !== 'all') params.set('templateId', selectedTemplate);
      if (selectedStatus !== 'all') params.set('isPublished', selectedStatus === 'published' ? 'true' : 'false');
      if (selectedDevice !== 'all') params.set('device', selectedDevice);
      if (selectedTheme !== 'all') params.set('theme', selectedTheme);
      if (selectedLanguage !== 'all') params.set('contentLanguage', selectedLanguage);
      if (selectedYear !== 'all') params.set('year', selectedYear);
      if (selectedProductType !== 'all') params.set('productType', selectedProductType);
      params.set('page', page.toString());

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products || []);
        setPagination(data.pagination);
        if (data.filters?.templates) {
          setTemplates(data.filters.templates);
        }
        if (data.filters?.years) {
          setAvailableYears(data.filters.years);
        }
      } else {
        console.error('API error:', data.error || 'Unknown error');
        // Still update with empty results on error
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // Clear products on network error
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedTemplate, selectedStatus, selectedDevice, selectedTheme, selectedLanguage, selectedYear, selectedProductType, page]);

  // Fetch when filters change (skip initial mount unless we have restored filters)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (hasRestoredFilters.current) {
        // Restored filters from session - fetch with those filters
        fetchProducts();
      } else {
        // No saved filters - just fetch filter options
        fetch('/api/admin/products?page=1&pageSize=1')
          .then((res) => res.json())
          .then((data) => {
            if (data.filters?.templates) {
              setTemplates(data.filters.templates);
            }
            if (data.filters?.years) {
              setAvailableYears(data.filters.years);
            }
          })
          .catch(() => {});
      }
      return;
    }
    fetchProducts();
  }, [fetchProducts]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setPage(1);
  };

  const handleDeviceChange = (value: string) => {
    setSelectedDevice(value);
    setPage(1);
  };

  const handleThemeChange = (value: string) => {
    setSelectedTheme(value);
    setPage(1);
  };

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    setPage(1);
  };

  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    setPage(1);
  };

  const handleProductTypeChange = (value: string) => {
    setSelectedProductType(value);
    setPage(1);
  };

  const hasActiveFilters = searchQuery !== '' ||
    selectedTemplate !== 'all' ||
    selectedStatus !== 'all' ||
    selectedDevice !== 'all' ||
    selectedTheme !== 'all' ||
    selectedLanguage !== 'all' ||
    selectedYear !== 'all' ||
    selectedProductType !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedTemplate('all');
    setSelectedStatus('all');
    setSelectedDevice('all');
    setSelectedTheme('all');
    setSelectedLanguage('all');
    setSelectedYear('all');
    setSelectedProductType('all');
    setPage(1);
    clearSavedFilters();
  };

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'delete') => {
    if (selectedIds.size === 0) return;

    const confirmMessages: Record<string, string> = {
      publish: `Publish ${selectedIds.size} product(s)?`,
      unpublish: `Unpublish ${selectedIds.size} product(s)?`,
      feature: `Mark ${selectedIds.size} product(s) as featured?`,
      unfeature: `Remove featured status from ${selectedIds.size} product(s)?`,
      delete: `Delete ${selectedIds.size} product(s)? Products with orders will be skipped.`,
    };

    if (!confirm(confirmMessages[action])) return;

    setBulkActionLoading(action);
    try {
      const response = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          productIds: Array.from(selectedIds),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.error) {
          alert(`Completed with note: ${data.error}`);
        }
        setSelectedIds(new Set());
        fetchProducts();
      } else {
        alert(data.error || 'Bulk action failed');
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
      alert('Bulk action failed');
    } finally {
      setBulkActionLoading(null);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="pl-9 w-full sm:w-[250px]"
          />
        </div>

        {showDigitalFilters && (
          <>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDevice} onValueChange={handleDeviceChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {Object.entries(devices).map(([id, d]) => (
                  <SelectItem key={id} value={id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTheme} onValueChange={handleThemeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Themes</SelectItem>
                {Object.entries(themes).map(([id, t]) => (
                  <SelectItem key={id} value={id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: t.previewColor }}
                      />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="nl">Nederlands</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedProductType} onValueChange={handleProductTypeChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(productTypes).map(([id, type]) => (
                  <SelectItem key={id} value={id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        <Select value={selectedStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground"
            >
              <FilterX className="h-4 w-4" />
              Clear filters
            </Button>
          )}
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {pagination.total} product{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('publish')}
            disabled={bulkActionLoading !== null}
          >
            {bulkActionLoading === 'publish' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Publish
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('unpublish')}
            disabled={bulkActionLoading !== null}
          >
            {bulkActionLoading === 'unpublish' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            Unpublish
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('feature')}
            disabled={bulkActionLoading !== null}
          >
            {bulkActionLoading === 'feature' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Star className="h-4 w-4" />
            )}
            Featured
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction('unfeature')}
            disabled={bulkActionLoading !== null}
          >
            {bulkActionLoading === 'unfeature' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
            Unfeatured
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleBulkAction('delete')}
            disabled={bulkActionLoading !== null}
          >
            {bulkActionLoading === 'delete' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Product Table */}
      <ProductTable
        products={products}
        pagination={pagination}
        onPageChange={handlePageChange}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        showSiteColumn={showSiteColumn}
      />
    </div>
  );
}
