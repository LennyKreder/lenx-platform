'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, BadgeCheck, Languages, Loader2 } from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';

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

interface ReviewsWidgetProps {
  qty?: number;
  locale: string;
  title?: string;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

function ReviewWidgetCard({ review, locale }: { review: Review; locale: string }) {
  const [showOriginal, setShowOriginal] = useState(false);

  const reviewLang = review.language || 'en';
  const hasTranslation = reviewLang !== locale && review.translations[locale];
  const translatedText = review.translations[locale];
  const displayText = showOriginal || !hasTranslation ? review.reviewText : translatedText;

  // Truncate long reviews
  const maxLength = 200;
  const truncated = displayText.length > maxLength;
  const shownText = truncated ? displayText.slice(0, maxLength) + '...' : displayText;

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{review.reviewerName}</span>
          {review.verifiedPurchase && (
            <BadgeCheck className="h-3.5 w-3.5 text-green-600" />
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatRelativeDate(review.createdAt)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <StarRating rating={review.rating} size="sm" />
        {hasTranslation && (
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 ml-auto shrink-0"
          >
            <Languages className="h-3 w-3" />
            {showOriginal
              ? (locale === 'nl' ? 'Vertaling tonen' : 'Show translation')
              : (locale === 'nl' ? 'Origineel tonen' : 'Show original')}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
        {shownText}
      </p>
      {review.productName && review.productPath && (
        <Link
          href={`/${locale}${review.productPath}`}
          className="text-xs text-primary hover:underline truncate mt-auto"
        >
          {review.productName}
        </Link>
      )}
    </div>
  );
}

export function ReviewsWidget({ qty = 4, locale, title }: ReviewsWidgetProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isNL = locale === 'nl';

  useEffect(() => {
    async function fetchReviews() {
      try {
        const response = await fetch(`/api/reviews/random?qty=${qty}&locale=${locale}`);
        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews || []);
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReviews();
  }, [locale, qty]);

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="my-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">
          {title || (isNL ? 'Wat klanten zeggen' : 'What customers say')}
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reviews.map((review) => (
          <ReviewWidgetCard key={review.id} review={review} locale={locale} />
        ))}
      </div>
    </div>
  );
}
