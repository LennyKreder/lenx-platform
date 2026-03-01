import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { Prisma } from '@/lib/prisma';
import { translateReview } from '@/lib/translate-review';

// GET /api/admin/reviews - List all reviews with filters
export async function GET(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const status = searchParams.get('status'); // 'pending', 'approved', 'rejected'
  const productId = searchParams.get('productId');
  const search = searchParams.get('search');

  // Build where clause
  const where: Prisma.ReviewWhereInput = { siteId };

  if (status === 'pending') {
    where.approved = false;
  } else if (status === 'approved') {
    where.approved = true;
  }

  if (productId) {
    where.productId = parseInt(productId, 10);
  }

  if (search && search.trim()) {
    where.OR = [
      { reviewerName: { contains: search.trim(), mode: 'insensitive' } },
      { reviewText: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  const [reviews, totalCount, products] = await Promise.all([
    prisma.review.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
    // Get products for filter dropdown
    prisma.product.findMany({
      where: { isPublished: true, siteId },
      include: {
        translations: { where: { languageCode: 'en' } },
        template: {
          include: {
            translations: { where: { languageCode: 'en' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Transform reviews with product names and template info
  const transformedReviews = reviews.map((review) => {
    const template = review.product.template;
    const templateName = template?.translations[0]?.name || null;
    const productName = review.product.translations[0]?.name || templateName || 'Unknown Product';

    // Build variant info string (year, theme, language)
    const variantParts: string[] = [];
    if (review.product.year) variantParts.push(String(review.product.year));
    if (review.product.theme) variantParts.push(review.product.theme);
    if (review.product.contentLanguage) variantParts.push(review.product.contentLanguage.toUpperCase());
    const variantInfo = variantParts.length > 0 ? variantParts.join(' · ') : null;

    return {
      ...review,
      productName,
      templateId: template?.id || null,
      templateName,
      variantInfo,
    };
  });

  // Transform products for filter dropdown
  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.translations[0]?.name || p.template?.translations[0]?.name || 'Unknown',
  }));

  return NextResponse.json({
    reviews: transformedReviews,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
    filters: {
      products: productOptions,
    },
  });
}

// POST /api/admin/reviews - Seed a new review (admin only)
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteId = await getAdminSiteId();
    const body = await request.json();
    const { productId, rating, reviewerName, reviewText, verifiedPurchase, approved, createdAt, language } = body as {
      productId: number;
      rating: number;
      reviewerName: string;
      reviewText: string;
      verifiedPurchase?: boolean;
      approved?: boolean;
      createdAt?: string;
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
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Check product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const review = await prisma.review.create({
      data: {
        siteId,
        productId,
        rating,
        reviewerName: reviewerName.trim(),
        reviewText: reviewText.trim(),
        language: language || 'en',
        verifiedPurchase: verifiedPurchase ?? false,
        approved: approved ?? true, // Seeded reviews are approved by default
        createdAt: createdAt ? new Date(createdAt) : undefined,
      },
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
      },
    });

    // Trigger translation for approved reviews
    if (review.approved) {
      try {
        await translateReview(review.id);
      } catch (err) {
        console.error(`Failed to translate review ${review.id}:`, err);
      }
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
