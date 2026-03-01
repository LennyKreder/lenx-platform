'use client';

import { Star, Check, X, Trash2, ChevronLeft, ChevronRight, BadgeCheck, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InlineConfirm } from '@/components/admin/shared/ConfirmDialog';

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

interface ReviewGroup {
  groupKey: string;
  groupName: string;
  reviews: Review[];
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface ReviewTableProps {
  reviews: Review[];
  isLoading: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (review: Review) => void;
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Group reviews by template (or productId for standalone products)
function groupReviews(reviews: Review[]): ReviewGroup[] {
  const groups = new Map<string, ReviewGroup>();

  for (const review of reviews) {
    // Use templateId for templated products, productId for standalone
    const groupKey = review.templateId
      ? `template-${review.templateId}`
      : `product-${review.productId}`;
    const groupName = review.templateName || review.productName;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupKey,
        groupName,
        reviews: [],
      });
    }
    groups.get(groupKey)!.reviews.push(review);
  }

  return Array.from(groups.values());
}

export function ReviewTable({
  reviews,
  isLoading,
  onApprove,
  onReject,
  onDelete,
  onEdit,
  pagination,
  onPageChange,
}: ReviewTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="p-8 text-center text-muted-foreground">
          No reviews found.
        </div>
      </div>
    );
  }

  const reviewGroups = groupReviews(reviews);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Product / Variant
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Reviewer
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Rating
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Review
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {reviewGroups.map((group) => (
              <>
                {/* Group header row */}
                <tr key={group.groupKey} className="bg-muted/30">
                  <td colSpan={7} className="px-4 py-2">
                    <span className="font-semibold text-sm">{group.groupName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({group.reviews.length} review{group.reviews.length !== 1 ? 's' : ''})
                    </span>
                  </td>
                </tr>
                {/* Reviews in this group */}
                {group.reviews.map((review) => (
                  <tr key={review.id} className="border-b last:border-0">
                    <td className="px-4 py-3 pl-8">
                      {review.variantInfo ? (
                        <div className="text-sm text-muted-foreground">
                          {review.variantInfo}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          (no variant)
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{review.reviewerName}</span>
                        {review.verifiedPurchase && (
                          <span title="Verified Purchase">
                            <BadgeCheck className="h-4 w-4 text-green-500" />
                          </span>
                        )}
                      </div>
                      {review.customerEmail && (
                        <div className="text-xs text-muted-foreground">
                          {review.customerEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={review.rating} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm line-clamp-2 max-w-[300px]">
                        {review.reviewText}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {review.approved ? (
                        <Badge variant="default" className="bg-green-500">
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(review)}
                          title="Edit"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!review.approved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onApprove(review.id)}
                            title="Approve"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {review.approved && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onReject(review.id)}
                            title="Unapprove"
                            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <InlineConfirm onConfirm={() => onDelete(review.id)}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </InlineConfirm>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
            {pagination.totalCount} reviews
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
