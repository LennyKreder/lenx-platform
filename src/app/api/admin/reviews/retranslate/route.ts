import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { prisma } from '@/lib/prisma';
import { translateReview } from '@/lib/translate-review';

// POST /api/admin/reviews/retranslate - Re-translate all approved reviews
export async function POST() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteId = await getAdminSiteId();

    // Delete all existing translations for this store's reviews first (they may be garbled)
    const deleted = await prisma.reviewTranslation.deleteMany({
      where: { review: { siteId } },
    });

    // Get all approved reviews for this store
    const reviews = await prisma.review.findMany({
      where: { approved: true, siteId },
      select: { id: true, reviewerName: true, language: true },
    });

    let translated = 0;
    const errors: string[] = [];

    for (const review of reviews) {
      try {
        await translateReview(review.id);
        translated++;
      } catch (err) {
        const msg = `Review ${review.id} (${review.reviewerName}): ${err instanceof Error ? err.message : 'Unknown error'}`;
        errors.push(msg);
        console.error(msg);
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deleted.count,
      total: reviews.length,
      translated,
      errors,
    });
  } catch (error) {
    console.error('Error retranslating reviews:', error);
    return NextResponse.json({ error: 'Failed to retranslate reviews' }, { status: 500 });
  }
}
