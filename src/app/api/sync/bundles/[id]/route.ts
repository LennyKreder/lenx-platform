import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isAuthorized(request: NextRequest): boolean {
  const key = process.env.SYNC_API_KEY;
  if (!key) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${key}`;
}

// PATCH /api/sync/bundles/[id]
// Body: { images?: string[] }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid bundle ID' }, { status: 400 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) {
      return NextResponse.json(
        { error: 'images must be an array' },
        { status: 400 }
      );
    }
    data.images = body.images;
  }

  if (Object.keys(data).length <= 1) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    const bundle = await prisma.bundle.update({
      where: { id },
      data,
      select: { id: true, images: true },
    });

    return NextResponse.json({ bundle });
  } catch {
    return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
  }
}
