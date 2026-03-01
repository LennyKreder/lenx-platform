'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Languages } from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';

interface ReviewCardProps {
  review: {
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
  };
  locale?: string;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
}

export function ReviewCard({ review, locale = 'en' }: ReviewCardProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  // Check if we have a translation for the current locale
  const reviewLang = review.language || 'en';
  const hasTranslation = reviewLang !== locale && review.translations[locale];
  const translatedText = review.translations[locale];

  // Display translated text by default if available, or original
  const displayText = showOriginal || !hasTranslation ? review.reviewText : translatedText;

  return (
    <div className="border-b pb-4 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{review.reviewerName}</span>
            {review.verifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified Purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-xs text-muted-foreground">
              {formatRelativeDate(review.createdAt)}
            </span>
            {hasTranslation && (
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 ml-auto"
              >
                <Languages className="h-3 w-3" />
                {showOriginal
                  ? (locale === 'nl' ? 'Vertaling tonen' : 'Show translation')
                  : (locale === 'nl' ? 'Origineel tonen' : 'Show original')}
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {displayText}
          </p>
          {review.productName && review.productPath && (
            <Link
              href={`/${locale}${review.productPath}`}
              className="mt-1 text-xs text-primary hover:underline"
            >
              {review.productName}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
