import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { getSiteFromHeaders } from '@/lib/site-context';

export async function GET() {
  const site = await getSiteFromHeaders();
  const settings = await getSettings(site.id, site.siteType ?? undefined);
  return NextResponse.json(settings);
}
