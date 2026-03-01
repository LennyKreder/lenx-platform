import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { ALL_SITES_CODE } from '@/lib/admin-site';

// GET: return current site code and list of accessible sites
export async function GET() {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasWildcard = user.siteAccess.includes('*');
  const sites = hasWildcard
    ? await prisma.site.findMany({ orderBy: { code: 'asc' } })
    : await prisma.site.findMany({
        where: { code: { in: user.siteAccess } },
        orderBy: { code: 'asc' },
      });

  const cookieStore = await cookies();
  const currentCode = cookieStore.get('admin_site')?.value || sites[0]?.code || 'lbl';

  // Resolve current site type
  const isAllSites = currentCode === ALL_SITES_CODE;
  const currentSite = isAllSites ? null : sites.find((s) => s.code === currentCode);
  const currentSiteType = isAllSites ? null : (currentSite?.siteType || 'digital');

  return NextResponse.json({
    currentSite: currentCode,
    currentSiteType,
    canViewAll: user.role === 'super_admin',
    sites: sites.map((s) => ({ code: s.code, name: s.name, siteType: s.siteType })),
  });
}

// POST: switch the active admin site
export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { siteCode } = body;

  if (!siteCode || typeof siteCode !== 'string') {
    return NextResponse.json({ error: 'Site code required' }, { status: 400 });
  }

  // Handle "All Sites" mode
  if (siteCode === ALL_SITES_CODE) {
    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    const cookieStore = await cookies();
    cookieStore.set('admin_site', ALL_SITES_CODE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    });
    return NextResponse.json({ success: true, siteCode: ALL_SITES_CODE });
  }

  // Validate access
  const hasWildcard = user.siteAccess.includes('*');
  if (!hasWildcard && !user.siteAccess.includes(siteCode)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Verify site exists
  const site = await prisma.site.findUnique({ where: { code: siteCode } });
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set('admin_site', siteCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return NextResponse.json({ success: true, siteCode });
}
