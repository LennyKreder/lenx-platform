'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Search, Filter, MessageSquare, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReviewTable } from '@/components/admin/reviews/ReviewTable';
import { SeedReviewDialog } from '@/components/admin/reviews/SeedReviewDialog';
import { EditReviewDialog } from '@/components/admin/reviews/EditReviewDialog';

interface Review {
  id: number;
  productId: number;
  productName: string;
  templateId: number | null;
  templateName: string | null;
  variantInfo: string | null;
  customerId: number | null;
  customerEmail: string | null;
  rating: number;
  reviewerName: string;
  reviewText: string;
  language: string | null;
  verifiedPurchase: boolean;
  approved: boolean;
  createdAt: string;
}

interface Product {
  id: number;
  name: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface ReviewsPageClientProps {
  initialReviews: Review[];
  initialPagination: Pagination;
  products: Product[];
  stats: {
    total: number;
    pending: number;
    approved: number;
  };
}

export function ReviewsPageClient({
  initialReviews,
  initialPagination,
  products,
  stats,
}: ReviewsPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [selectedProduct, setSelectedProduct] = useState(searchParams.get('productId') || 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [page, setPage] = useState(initialPagination.page);

  // Dialog state
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isRetranslating, setIsRetranslating] = useState(false);

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

  // Fetch reviews when filters change
  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (selectedProduct !== 'all') params.set('productId', selectedProduct);
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('page', page.toString());

      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews.map((r: Review & { product?: { translations?: Array<{ name?: string }>; template?: { id?: number; translations?: Array<{ name?: string }> }; year?: number; theme?: string; contentLanguage?: string } }) => {
          const template = r.product?.template;
          const templateName = r.templateName || template?.translations?.[0]?.name || null;
          const productName = r.productName || r.product?.translations?.[0]?.name || templateName || 'Unknown';

          // Build variant info if not already present
          let variantInfo = r.variantInfo;
          if (!variantInfo && r.product) {
            const variantParts: string[] = [];
            if (r.product.year) variantParts.push(String(r.product.year));
            if (r.product.theme) variantParts.push(r.product.theme);
            if (r.product.contentLanguage) variantParts.push(r.product.contentLanguage.toUpperCase());
            variantInfo = variantParts.length > 0 ? variantParts.join(' · ') : null;
          }

          return {
            ...r,
            productName,
            templateId: r.templateId ?? template?.id ?? null,
            templateName,
            variantInfo,
          };
        }));
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [status, selectedProduct, debouncedSearch, page]);

  // Update URL when filters change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (selectedProduct !== 'all') params.set('productId', selectedProduct);
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (page > 1) params.set('page', page.toString());

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router, status, selectedProduct, debouncedSearch, page]);

  // Fetch when filters change (skip initial mount - use server data)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchReviews();
    updateUrl();
  }, [fetchReviews, updateUrl]);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleProductChange = (value: string) => {
    setSelectedProduct(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });
      if (response.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, approved: true } : r))
        );
      }
    } catch (error) {
      console.error('Failed to approve review:', error);
    }
  };

  const handleReject = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false }),
      });
      if (response.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, approved: false } : r))
        );
      }
    } catch (error) {
      console.error('Failed to reject review:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
        setPagination((prev) => ({ ...prev, totalCount: prev.totalCount - 1 }));
      }
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  };

  const handleSeedSuccess = () => {
    fetchReviews();
    router.refresh();
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = (updatedReview: Review) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === updatedReview.id ? updatedReview : r))
    );
  };

  const handleRetranslateAll = async () => {
    if (!confirm('This will delete all existing translations and re-translate every approved review. Continue?')) {
      return;
    }
    setIsRetranslating(true);
    try {
      const response = await fetch('/api/admin/reviews/retranslate', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        alert(`Done! Translated ${data.translated}/${data.total} reviews. ${data.errors.length > 0 ? `${data.errors.length} errors.` : ''}`);
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'Failed to retranslate'}`);
      }
    } catch (error) {
      console.error('Failed to retranslate:', error);
      alert('Failed to retranslate reviews');
    } finally {
      setIsRetranslating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-muted-foreground">
            Manage customer reviews and ratings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRetranslateAll}
            disabled={isRetranslating}
          >
            <Languages className="h-4 w-4 mr-2" />
            {isRetranslating ? 'Translating...' : 'Retranslate All'}
          </Button>
          <Button onClick={() => setSeedDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Review
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Reviews</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.pending}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Approved</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.approved}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or review text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedProduct} onValueChange={handleProductChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ReviewTable
        reviews={reviews}
        isLoading={isLoading}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
        onEdit={handleEdit}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* Seed Dialog */}
      <SeedReviewDialog
        open={seedDialogOpen}
        onOpenChange={setSeedDialogOpen}
        products={products}
        onSuccess={handleSeedSuccess}
      />

      {/* Edit Dialog */}
      <EditReviewDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        review={editingReview}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
