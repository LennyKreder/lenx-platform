import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId, getAdminSiteType } from '@/lib/admin-site';
import { getSettings, updateSettings } from '@/lib/settings';

export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [siteId, siteType] = await Promise.all([getAdminSiteId(), getAdminSiteType()]);
  const settings = await getSettings(siteId, siteType ?? undefined);
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [siteId, siteType] = await Promise.all([getAdminSiteId(), getAdminSiteType()]);
    const body = await request.json();
    const settings = await updateSettings(body, siteId, siteType ?? undefined);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
