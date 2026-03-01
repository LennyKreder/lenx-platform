'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StarRatingInput } from '@/components/ui/star-rating-input';
import { Check, AlertCircle } from 'lucide-react';

interface ReviewFormProps {
  productId: number;
  locale: string;
  customerName?: string;
  onSuccess: () => void;
  translations: {
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

export function ReviewForm({
  productId,
  locale,
  customerName,
  onSuccess,
  translations: t,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [reviewerName, setReviewerName] = useState(customerName || '');
  const [reviewText, setReviewText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (rating === 0) {
      setError(t.errors.ratingRequired);
      return;
    }
    if (!reviewerName.trim()) {
      setError(t.errors.nameRequired);
      return;
    }
    if (reviewText.trim().length < 10) {
      setError(t.errors.reviewTooShort);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          reviewerName: reviewerName.trim(),
          reviewText: reviewText.trim(),
          language: locale,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t.errors.submitFailed);
      }

      setSuccess(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.submitFailed);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-4">
        <div className="flex items-start gap-3">
          <Check className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-400">
              {t.thankYou}
            </p>
            <p className="text-sm text-green-600 dark:text-green-500 mt-1">
              {t.reviewPending}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border bg-destructive/10 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label>{t.yourRating}</Label>
        <StarRatingInput value={rating} onChange={setRating} size="lg" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reviewerName">{t.yourName}</Label>
        <Input
          id="reviewerName"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reviewText">{t.yourReview}</Label>
        <Textarea
          id="reviewText"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience with this product..."
          rows={4}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground text-right">
          {reviewText.length}/2000
        </p>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? t.submitting : t.submitReview}
      </Button>
    </form>
  );
}
