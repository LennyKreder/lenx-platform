import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/admin/channels/[id] - Update a channel
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const channelId = parseInt(id, 10);

  if (isNaN(channelId)) {
    return NextResponse.json({ error: 'Invalid channel ID' }, { status: 400 });
  }

  try {
    const existing = await prisma.salesChannel.findFirst({
      where: { id: channelId, siteId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, apiClientId, apiClientSecret, isLvb, isActive } = body as {
      name?: string;
      apiClientId?: string | null;
      apiClientSecret?: string | null;
      isLvb?: boolean;
      isActive?: boolean;
    };

    const channel = await prisma.salesChannel.update({
      where: { id: channelId },
      data: {
        ...(name !== undefined && { name }),
        ...(apiClientId !== undefined && { apiClientId: apiClientId || null }),
        ...(apiClientSecret !== undefined && { apiClientSecret: apiClientSecret || null }),
        ...(isLvb !== undefined && { isLvb }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        _count: { select: { listings: true, syncLogs: true } },
      },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error('Error updating channel:', error);
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
  }
}

// DELETE /api/admin/channels/[id] - Delete a channel
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const { id } = await params;
  const channelId = parseInt(id, 10);

  if (isNaN(channelId)) {
    return NextResponse.json({ error: 'Invalid channel ID' }, { status: 400 });
  }

  try {
    const existing = await prisma.salesChannel.findFirst({
      where: { id: channelId, siteId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    if (existing.type === 'webshop') {
      return NextResponse.json({ error: 'Cannot delete the webshop channel' }, { status: 400 });
    }

    await prisma.salesChannel.delete({ where: { id: channelId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting channel:', error);
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
  }
}
