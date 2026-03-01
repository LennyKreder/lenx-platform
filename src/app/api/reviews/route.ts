import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders } from '@/lib/site-context';
import { getCustomerSession, customerOwnsProduct } from '@/lib/customer-session';

// POST /api/reviews - Submit a new review (customer auth required)
export async function POST(request: NextRequest) {
  try {
    // Check customer session
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Please sign in to submit a review' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, rating, reviewerName, reviewText, language } = body as {
      productId: number;
      rating: number;
      reviewerName: string;
      reviewText: string;
      language?: string;
    };

    // Validate required fields
    if (!productId || !rating || !reviewerName || !reviewText) {
      return NextResponse.json(
        { error: 'productId, rating, reviewerName, and reviewText are required' },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Validate review text length
    if (reviewText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Review must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (reviewText.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Review must be less than 2000 characters' },
        { status: 400 }
      );
    }

    // Validate reviewer name length
    if (reviewerName.trim().length < 1 || reviewerName.trim().length > 100) {
      return NextResponse.json(
        { error: 'Reviewer name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // Check product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if customer already reviewed this product
    const existingReview = await prisma.review.findFirst({
      where: { productId, customerId: session.customerId },
    });
    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 400 }
      );
    }

    // Check if customer owns the product (for verified purchase badge)
    const isVerified = await customerOwnsProduct(session.customerId, productId);

    // Create the review (pending approval)
    const site = await getSiteFromHeaders();
    const review = await prisma.review.create({
      data: {
        siteId: site.id,
        productId,
        customerId: session.customerId,
        rating,
        reviewerName: reviewerName.trim(),
        reviewText: reviewText.trim(),
        language: language || null,
        verifiedPurchase: isVerified,
        approved: false, // Pending moderation
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your review! It will be visible after moderation.',
        review: {
          id: review.id,
          rating: review.rating,
          reviewerName: review.reviewerName,
          verifiedPurchase: review.verifiedPurchase,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}
