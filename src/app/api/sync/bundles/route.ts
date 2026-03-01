import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isAuthorized(request: NextRequest): boolean {
  const key = process.env.SYNC_API_KEY;
  if (!key) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${key}`;
}

// GET /api/sync/bundles?theme=soft_rose&language=en
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const where: Record<string, unknown> = {};

  const theme = params.get('theme');
  const language = params.get('language');

  if (theme) where.theme = theme;
  if (language) where.contentLanguage = language;

  const bundles = await prisma.bundle.findMany({
    where,
    select: {
      id: true,
      theme: true,
      contentLanguage: true,
      images: true,
      etsyListingId: true,
      items: {
        select: {
          product: {
            select: { year: true },
          },
        },
      },
    },
    orderBy: [{ theme: 'asc' }, { contentLanguage: 'asc' }],
  });

  return NextResponse.json({
    bundles: bundles.map((b) => ({
      id: b.id,
      theme: b.theme,
      contentLanguage: b.contentLanguage,
      images: (b.images as string[]) || [],
      etsyListingId: b.etsyListingId,
      years: [
        ...new Set(
          b.items
            .map((i) => i.product?.year)
            .filter((y): y is number => y != null)
        ),
      ].sort(),
    })),
  });
}
