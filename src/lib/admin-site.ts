import { cookies } from 'next/headers';
import { getAdminUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { LBL_SITE_ID } from '@/lib/site-context';

const ADMIN_SITE_COOKIE = 'admin_site';
export const ALL_SITES_CODE = '__all__';

/**
 * Get the currently selected site code for the admin panel.
 * Returns '__all__' for the global view (super_admin only).
 * Falls back to first accessible site or 'lbl'.
 */
export async function getAdminSiteCode(): Promise<string> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(ADMIN_SITE_COOKIE)?.value;
  const user = await getAdminUser();

  if (!user) return 'lbl';

  const access = user.siteAccess;
  const hasWildcard = access.includes('*');

  // Validate stored cookie against user's access
  if (stored) {
    // '__all__' is only valid for super_admin
    if (stored === ALL_SITES_CODE && user.role === 'super_admin') {
      return ALL_SITES_CODE;
    }
    if (hasWildcard || access.includes(stored)) {
      return stored;
    }
  }

  // Default to first accessible site
  if (hasWildcard) return 'lbl';
  return access[0] || 'lbl';
}

/**
 * Get the siteId (UUID) for the currently selected admin site.
 * In "All Sites" mode, defaults to LBL_SITE_ID. Callers needing
 * cross-site behavior should check getAdminSiteCode() === ALL_SITES_CODE.
 */
export async function getAdminSiteId(): Promise<string> {
  const code = await getAdminSiteCode();
  if (code === ALL_SITES_CODE) return LBL_SITE_ID;

  const site = await prisma.site.findUnique({
    where: { code },
    select: { id: true },
  });
  return site?.id || LBL_SITE_ID;
}

/**
 * Get the siteType for the currently selected admin site.
 * Returns null when in "All Sites" mode.
 */
export async function getAdminSiteType(): Promise<string | null> {
  const code = await getAdminSiteCode();
  if (code === ALL_SITES_CODE) return null;

  const site = await prisma.site.findUnique({
    where: { code },
    select: { siteType: true },
  });
  return site?.siteType || 'digital';
}

/**
 * Get all sites the current admin user has access to.
 */
export async function getAdminAccessibleSites() {
  const user = await getAdminUser();
  if (!user) return [];

  const hasWildcard = user.siteAccess.includes('*');
  if (hasWildcard) {
    return prisma.site.findMany({ orderBy: { code: 'asc' } });
  }

  return prisma.site.findMany({
    where: { code: { in: user.siteAccess } },
    orderBy: { code: 'asc' },
  });
}
