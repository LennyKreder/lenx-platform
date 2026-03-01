import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { translateReview } from '@/lib/translate-review';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/reviews/[id] - Get single review
export async function GET(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const reviewId = parseInt(id, 10);

  if (isNaN(reviewId)) {
    return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 });
  }

  const review = await prisma.review.findFirst({
    where: { id: reviewId, siteId },
    include: {
      product: {
        include: {
          translations: { where: { languageCode: 'en' } },
          template: {
            include: {
              translations: { where: { languageCode: 'en' } },
            },
          },
        },
      },
      customer: {
        select: { id: true, email: true },
      },
    },
  });

  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  return NextResponse.json(review);
}

// PATCH /api/admin/reviews/[id] - Update review (approve/reject, edit)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const reviewId = parseInt(id, 10);

  if (isNaN(reviewId)) {
    return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { approved, reviewText, rating, reviewerName, verifiedPurchase, createdAt, language } = body as {
      approved?: boolean;
      reviewText?: string;
      rating?: number;
      reviewerName?: string;
      verifiedPurchase?: boolean;
      createdAt?: string;
      language?: string;
    };

    // Check review exists and belongs to store
    const existing = await prisma.review.findFirst({ where: { id: reviewId, siteId } });
    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Build update data
    const updateData: {
      approved?: boolean;
      reviewText?: string;
      rating?: number;
      reviewerName?: string;
      verifiedPurchase?: boolean;
      createdAt?: Date;
      language?: string;
    } = {};

    if (typeof approved === 'boolean') {
      updateData.approved = approved;
    }
    if (reviewText !== undefined) {
      updateData.reviewText = reviewText.trim();
    }
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
      }
      updateData.rating = rating;
    }
    if (reviewerName !== undefined) {
      updateData.reviewerName = reviewerName.trim();
    }
    if (typeof verifiedPurchase === 'boolean') {
      updateData.verifiedPurchase = verifiedPurchase;
    }
    if (createdAt) {
      updateData.createdAt = new Date(createdAt);
    }
    if (language) {
      updateData.language = language;
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        product: {
          include: {
            translations: { where: { languageCode: 'en' } },
            template: {
              include: {
                translations: { where: { languageCode: 'en' } },
              },
            },
          },
        },
        customer: {
          select: { id: true, email: true },
        },
      },
    });

    // Trigger translation if review is approved and:
    // - just got approved, or text changed, or language changed, or has no translations yet
    const existingTranslations = await prisma.reviewTranslation.count({ where: { reviewId } });
    const shouldTranslate =
      (updateData.approved === true && !existing.approved) || // Newly approved
      (updateData.reviewText && updateData.reviewText !== existing.reviewText) || // Text changed
      (updateData.language && updateData.language !== existing.language) || // Language changed
      existingTranslations === 0; // Never been translated

    if (shouldTranslate && review.approved) {
      try {
        await translateReview(reviewId);
      } catch (err) {
        console.error(`Failed to translate review ${reviewId}:`, err);
      }
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

// DELETE /api/admin/reviews/[id] - Delete review
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const reviewId = parseInt(id, 10);

  if (isNaN(reviewId)) {
    return NextResponse.json({ error: 'Invalid review ID' }, { status: 400 });
  }

  try {
    // Check review exists and belongs to store
    const existing = await prisma.review.findFirst({ where: { id: reviewId, siteId } });
    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await prisma.review.delete({ where: { id: reviewId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
