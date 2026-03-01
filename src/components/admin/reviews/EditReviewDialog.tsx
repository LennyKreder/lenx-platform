'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

const LANGUAGES = [
  { code: 'nl', label: 'Dutch (NL)' },
  { code: 'en', label: 'English (EN)' },
  { code: 'de', label: 'German (DE)' },
  { code: 'fr', label: 'French (FR)' },
  { code: 'es', label: 'Spanish (ES)' },
  { code: 'it', label: 'Italian (IT)' },
];

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

interface EditReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: Review | null;
  onSuccess: (updatedReview: Review) => void;
}

export function EditReviewDialog({
  open,
  onOpenChange,
  review,
  onSuccess,
}: EditReviewDialogProps) {
  const [rating, setRating] = useState(5);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [language, setLanguage] = useState('nl');
  const [reviewDate, setReviewDate] = useState('');
  const [verifiedPurchase, setVerifiedPurchase] = useState(false);
  const [approved, setApproved] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when review changes
  useEffect(() => {
    if (review) {
      setRating(review.rating);
      setReviewerName(review.reviewerName);
      setReviewText(review.reviewText);
      setLanguage(review.language || 'nl');
      setVerifiedPurchase(review.verifiedPurchase);
      setApproved(review.approved);
      // Format date for input (YYYY-MM-DD)
      const date = new Date(review.createdAt);
      setReviewDate(date.toISOString().split('T')[0]);
      setError(null);
    }
  }, [review]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          reviewerName: reviewerName.trim(),
          reviewText: reviewText.trim(),
          language,
          verifiedPurchase,
          approved,
          createdAt: reviewDate || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update review');
      }

      onOpenChange(false);
      onSuccess({
        ...review,
        rating,
        reviewerName: reviewerName.trim(),
        reviewText: reviewText.trim(),
        language,
        verifiedPurchase,
        approved,
        createdAt: reviewDate ? new Date(reviewDate).toISOString() : review.createdAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Review</DialogTitle>
          <DialogDescription>
            {review ? `Editing review for ${review.productName}` : 'Edit review details'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating}/5
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewerName">Reviewer Name</Label>
            <Input
              id="reviewerName"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="John D."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewText">Review Text</Label>
            <Textarea
              id="reviewText"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write the review content..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Language the review is written in. Changing this will re-translate to all other languages.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewDate">Review Date</Label>
            <Input
              id="reviewDate"
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verifiedPurchase"
                checked={verifiedPurchase}
                onCheckedChange={(checked) =>
                  setVerifiedPurchase(checked === true)
                }
              />
              <Label htmlFor="verifiedPurchase" className="text-sm font-normal">
                Verified Purchase
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="approved"
                checked={approved}
                onCheckedChange={(checked) => setApproved(checked === true)}
              />
              <Label htmlFor="approved" className="text-sm font-normal">
                Approved
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
