'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { BundleTable } from '@/components/admin/bundles/BundleTable';

interface SlugRoute {
  languageCode: string;
  slug: string;
}

interface BundleTranslation {
  languageCode: string;
  name: string;
  description: string | null;
}

interface BundleItem {
  productId?: number | null;
}

interface Bundle {
  id: number;
  discountPercent: number | null;
  fixedPriceInCents: number | null;
  currency: string;
  contentLanguage: string | null;
  isAllAccess: boolean;
  isFeatured: boolean;
  downloadCode: string;
  isPublished: boolean;
  translations: BundleTranslation[];
  slugs: SlugRoute[];
  items: BundleItem[];
  _count: { orderItems: number; access: number };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface BundlesPageClientProps {
  initialBundles: Bundle[];
  initialPagination: Pagination;
}

export function BundlesPageClient({
  initialBundles,
  initialPagination,
}: BundlesPageClientProps) {
  const [bundles, setBundles] = useState<Bundle[]>(initialBundles);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedFeatured, setSelectedFeatured] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [page, setPage] = useState(initialPagination.page);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

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

  const fetchBundles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedStatus !== 'all') params.set('isPublished', selectedStatus === 'published' ? 'true' : 'false');
      if (selectedType !== 'all') params.set('isAllAccess', selectedType === 'allAccess' ? 'true' : 'false');
      if (selectedFeatured !== 'all') params.set('isFeatured', selectedFeatured === 'featured' ? 'true' : 'false');
      if (selectedLanguage !== 'all') params.set('contentLanguage', selectedLanguage);
      params.set('page', page.toString());

      const response = await fetch(`/api/admin/bundles?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBundles(data.bundles);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedStatus, selectedType, selectedFeatured, selectedLanguage, page]);

  // Fetch when filters change (skip initial mount since we have initialBundles)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchBundles();
  }, [fetchBundles]);

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setPage(1);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    setPage(1);
  };

  const handleFeaturedChange = (value: string) => {
    setSelectedFeatured(value);
    setPage(1);
  };

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    setPage(1);
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
            placeholder="Search bundles..."
            className="pl-9 w-full sm:w-[250px]"
          />
        </div>

        <Select value={selectedType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="allAccess">All Access</SelectItem>
            <SelectItem value="regular">Regular</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedFeatured} onValueChange={handleFeaturedChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Featured" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="notFeatured">Not Featured</SelectItem>
          </SelectContent>
        </Select>

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

        <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Shop" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shops</SelectItem>
            <SelectItem value="all-shops">Global</SelectItem>
            <SelectItem value="en">EN Shop</SelectItem>
            <SelectItem value="nl">NL Shop</SelectItem>
            <SelectItem value="de">DE Shop</SelectItem>
            <SelectItem value="fr">FR Shop</SelectItem>
            <SelectItem value="es">ES Shop</SelectItem>
            <SelectItem value="it">IT Shop</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {pagination.total} bundle{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Bundle Table */}
      <BundleTable
        bundles={bundles}
        pagination={pagination}
        onPageChange={setPage}
        onDelete={(id) => setBundles((prev) => prev.filter((b) => b.id !== id))}
        onFeaturedChange={(id, isFeatured) =>
          setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, isFeatured } : b)))
        }
      />
    </div>
  );
}
