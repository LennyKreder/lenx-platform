import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import type { Site } from '../../generated/prisma/client';

// LBL site ID (matches migration and seed)
export const LBL_SITE_ID = '00000000-0000-0000-0000-000000000001';

// In-memory cache: domain -> Site (TTL: 5 minutes)
const siteCache = new Map<string, { site: Site; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function resolveSiteByDomain(hostname: string): Promise<Site | null> {
  // Strip port
  const domain = hostname.split(':')[0].toLowerCase();

  // Check cache
  const cached = siteCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.site;
  }

  // Query all sites and find one whose domains array contains this domain
  const sites = await prisma.site.findMany();
  for (const site of sites) {
    const domains = site.domains as string[];
    if (domains.some((d: string) => d.toLowerCase() === domain)) {
      siteCache.set(domain, { site, expiresAt: Date.now() + CACHE_TTL });
      return site;
    }
  }

  return null;
}

export async function resolveSiteByCode(code: string): Promise<Site | null> {
  return prisma.site.findUnique({ where: { code } });
}

export async function getSiteFromHeaders(): Promise<Site> {
  const headerList = await headers();

  // Check x-site-id header (set by proxy)
  const siteId = headerList.get('x-site-id');
  if (siteId) {
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (site) return site;
  }

  // Try hostname-based resolution
  const host = headerList.get('host') || headerList.get('x-forwarded-host') || 'localhost';
  const site = await resolveSiteByDomain(host);
  if (site) return site;

  // Fall back to LBL site (development / localhost)
  const fallback = await prisma.site.findUnique({ where: { id: LBL_SITE_ID } });
  if (!fallback) throw new Error('LBL site not found in database');
  return fallback;
}

export async function getAllSites(): Promise<Site[]> {
  return prisma.site.findMany({ orderBy: { code: 'asc' } });
}

export function getSiteBaseUrl(site: Site): string {
  const domains = site.domains as string[];
  return domains[0] ? `https://${domains[0]}` : 'https://layoutsbylenny.com';
}
