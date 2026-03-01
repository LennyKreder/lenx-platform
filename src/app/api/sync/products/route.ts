import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isAuthorized(request: NextRequest): boolean {
  const key = process.env.SYNC_API_KEY;
  if (!key) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${key}`;
}

// GET /api/sync/products?template=Minimalist+Planner&year=2027&theme=soft_rose&language=en&device=ipad
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const templateName = params.get('template');
  const year = params.get('year');

  if (!templateName || !year) {
    return NextResponse.json(
      { error: 'Required query params: template, year' },
      { status: 400 }
    );
  }

  // Find the ProductTemplate by English name
  const template = await prisma.productTemplate.findFirst({
    where: {
      translations: {
        some: { languageCode: 'en', name: templateName },
      },
    },
    select: { id: true },
  });

  if (!template) {
    return NextResponse.json(
      { error: `Template not found: ${templateName}` },
      { status: 404 }
    );
  }

  // Build filters
  const where: Record<string, unknown> = {
    templateId: template.id,
    year: parseInt(year, 10),
  };

  const theme = params.get('theme');
  const language = params.get('language');
  const device = params.get('device');

  if (theme) where.theme = theme;
  if (language) where.contentLanguage = language;
  if (device) where.device = device;

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      theme: true,
      contentLanguage: true,
      device: true,
      orientation: true,
      images: true,
      videoUrl: true,
    },
    orderBy: [{ theme: 'asc' }, { contentLanguage: 'asc' }],
  });

  return NextResponse.json({
    templateId: template.id,
    templateName,
    products: products.map((p) => ({
      id: p.id,
      theme: p.theme,
      contentLanguage: p.contentLanguage,
      device: p.device || 'ipad',
      orientation: p.orientation || 'portrait',
      images: (p.images as string[]) || [],
      videoUrl: p.videoUrl,
    })),
  });
}
