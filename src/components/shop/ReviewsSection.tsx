'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { ReviewCard } from './ReviewCard';
import { ReviewForm } from './ReviewForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Review {
  id: number;
  rating: number;
  reviewerName: string;
  reviewText: string;
  language: string | null;
  translations: Record<string, string>;
  verifiedPurchase: boolean;
  createdAt: string;
  productName: string | null;
  productPath: string | null;
}

interface Aggregate {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface ReviewsSectionProps {
  productId: number;
  locale: string;
  isLoggedIn: boolean;
  isOwned: boolean;
  customerName?: string;
  translations: {
    title: string;
    writeReview: string;
    noReviews: string;
    basedOn: string;
    sortBy: string;
    sortRecent: string;
    sortHighest: string;
    sortLowest: string;
    loginToReview: string;
    alreadyReviewed: string;
    yourRating: string;
    yourName: string;
    yourReview: string;
    submitReview: string;
    submitting: string;
    thankYou: string;
    reviewPending: string;
    errors: {
      ratingRequired: string;
      nameRequired: string;
      reviewTooShort: string;
      submitFailed: string;
    };
  };
}

export function ReviewsSection({
  productId,
  locale,
  isLoggedIn,
  isOwned,
  customerName,
  translations: t,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const fetchReviews = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const response = await fetch(
        `/api/reviews/product/${productId}?page=${currentPage}&sortBy=${sortBy}`
      );
      if (response.ok) {
        const data = await response.json();
        if (reset) {
          setReviews(data.reviews);
        } else {
          setReviews((prev) => [...prev, ...data.reviews]);
        }
        setAggregate(data.aggregate);
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [productId, sortBy, page]);

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    fetchReviews(true);
  }, [productId, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  useEffect(() => {
    if (page > 1) {
      fetchReviews(false);
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReviewSuccess = () => {
    setHasReviewed(true);
    setShowForm(false);
    // Refresh reviews
    setPage(1);
    fetchReviews(true);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  return (
    <div className="mt-12 border-t pt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t.title}
        </h2>
        {isLoggedIn && !hasReviewed && !showForm && (
          <Button variant="outline" onClick={() => setShowForm(true)}>
            {t.writeReview}
          </Button>
        )}
      </div>

      {/* Aggregate Rating */}
      {aggregate && aggregate.count > 0 && (
        <div className="flex items-center gap-6 mb-6 p-4 rounded-lg bg-muted/50">
          <div className="text-center">
            <div className="text-3xl font-bold">{aggregate.average}</div>
            <StarRating rating={aggregate.average} size="md" />
            <p className="text-sm text-muted-foreground mt-1">
              {t.basedOn.replace('{count}', aggregate.count.toString())}
            </p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = aggregate.distribution[star as keyof typeof aggregate.distribution];
              const percentage = aggregate.count > 0 ? (count / aggregate.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-3">{star}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-muted-foreground text-xs">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review Form */}
      {showForm && (
        <div className="mb-6 p-4 rounded-lg border">
          <ReviewForm
            productId={productId}
            locale={locale}
            customerName={customerName}
            onSuccess={handleReviewSuccess}
            translations={{
              yourRating: t.yourRating,
              yourName: t.yourName,
              yourReview: t.yourReview,
              submitReview: t.submitReview,
              submitting: t.submitting,
              thankYou: t.thankYou,
              reviewPending: t.reviewPending,
              errors: t.errors,
            }}
          />
        </div>
      )}

      {/* Login prompt */}
      {!isLoggedIn && (
        <p className="text-sm text-muted-foreground mb-4">{t.loginToReview}</p>
      )}

      {/* Already reviewed message */}
      {hasReviewed && (
        <p className="text-sm text-muted-foreground mb-4">{t.alreadyReviewed}</p>
      )}

      {/* Sort and Reviews List */}
      {!isLoading && reviews.length > 0 && (
        <>
          <div className="flex justify-end mb-4">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t.sortBy} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t.sortRecent}</SelectItem>
                <SelectItem value="highest">{t.sortHighest}</SelectItem>
                <SelectItem value="lowest">{t.sortLowest}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} locale={locale} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={handleLoadMore}>
                <ChevronDown className="h-4 w-4 mr-2" />
                Load More
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!isLoading && reviews.length === 0 && (
        <p className="text-center text-muted-foreground py-8">{t.noReviews}</p>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      )}
    </div>
  );
}
