'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PhysicalProductTable, type PhysicalProduct } from './PhysicalProductTable';
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

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface PhysicalProductsPageClientProps {
  initialProducts: PhysicalProduct[];
  initialPagination: Pagination;
  showSiteColumn?: boolean;
}

const FILTERS_STORAGE_KEY = 'admin-physical-products-filters';

interface SavedFilters {
  search: string;
  status: string;
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

export function PhysicalProductsPageClient({
  initialProducts,
  initialPagination,
  showSiteColumn,
}: PhysicalProductsPageClientProps) {
  const saved = useRef(loadSavedFilters());

  const [products, setProducts] = useState<PhysicalProduct[]>(initialProducts);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState(saved.current?.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(saved.current?.search || '');
  const [selectedStatus, setSelectedStatus] = useState(saved.current?.status || 'all');
  const [page, setPage] = useState(initialPagination.page);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const hasRestoredFilters = useRef(!!saved.current);

  useEffect(() => {
    saveFilters({
      search: searchQuery,
      status: selectedStatus,
    });
  }, [searchQuery, selectedStatus]);

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
      if (selectedStatus !== 'all') params.set('isPublished', selectedStatus === 'published' ? 'true' : 'false');
      params.set('page', page.toString());

      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products || []);
        setPagination(data.pagination);
      } else {
        console.error('API error:', data.error || 'Unknown error');
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedStatus, page]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (hasRestoredFilters.current) {
        fetchProducts();
      }
      return;
    }
    fetchProducts();
  }, [fetchProducts]);

  const hasActiveFilters = searchQuery !== '' || selectedStatus !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedStatus('all');
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

        <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setPage(1); }}>
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
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Product Table */}
      <PhysicalProductTable
        products={products}
        pagination={pagination}
        onPageChange={(newPage) => setPage(newPage)}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        showSiteColumn={showSiteColumn}
      />
    </div>
  );
}
