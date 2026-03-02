import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

// GET /api/admin/channels - List channels for current site
export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const channels = await prisma.salesChannel.findMany({
    where: { siteId },
    include: {
      _count: { select: { listings: true, syncLogs: true } },
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ channels });
}

// POST /api/admin/channels - Create a new channel
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  try {
    const body = await request.json();
    const { type, name, country, apiClientId, apiClientSecret, isLvb } = body as {
      type: string;
      name: string;
      country?: string | null;
      apiClientId?: string | null;
      apiClientSecret?: string | null;
      isLvb?: boolean;
    };

    if (!type || !name) {
      return NextResponse.json({ error: 'type and name are required' }, { status: 400 });
    }

    if (type === 'webshop') {
      return NextResponse.json({ error: 'Webshop channel is auto-created per site' }, { status: 400 });
    }

    // Generate code from site code + type + country
    const site = await prisma.site.findUnique({ where: { id: siteId }, select: { code: true } });
    const code = `${site?.code || 'site'}_${type}${country ? `_${country.toLowerCase()}` : ''}`;

    const channel = await prisma.salesChannel.create({
      data: {
        siteId,
        type,
        code,
        name,
        country: country || null,
        apiClientId: apiClientId || null,
        apiClientSecret: apiClientSecret || null,
        isLvb: isLvb ?? false,
      },
      include: {
        _count: { select: { listings: true, syncLogs: true } },
      },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
  }
}
