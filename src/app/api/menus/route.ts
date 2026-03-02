import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders } from '@/lib/site-context';

interface MenuItem {
  label: string;
  href: string;
  external?: boolean;
}

interface MenuConfig {
  header: MenuItem[];
  footer: MenuItem[];
}

function getDefaultMenus(site: { hasBlog: boolean; hasDigitalDelivery: boolean }): MenuConfig {
  return {
    header: [
      { label: 'Shop', href: '/shop' },
      ...(site.hasBlog ? [{ label: 'Blog', href: '/blog' }] : []),
    ],
    footer: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      ...(site.hasBlog ? [{ label: 'Blog', href: '/blog' }] : []),
      { label: 'Terms', href: '/terms' },
      ...(site.hasDigitalDelivery ? [{ label: 'How to Import', href: '/how-to-import' }] : []),
    ],
  };
}

// GET /api/menus - Get menu configuration (public)
export async function GET() {
  try {
    const site = await getSiteFromHeaders();
    const defaults = getDefaultMenus(site);
    const setting = await prisma.siteSetting.findUnique({
      where: { siteId_key: { siteId: site.id, key: 'menus' } },
    });

    if (setting) {
      try {
        const raw = setting.value;
        const menus = (typeof raw === 'string' ? JSON.parse(raw) : raw) as MenuConfig;
        return NextResponse.json(menus);
      } catch {
        return NextResponse.json(defaults);
      }
    }

    return NextResponse.json(defaults);
  } catch {
    const defaults = getDefaultMenus({ hasBlog: false, hasDigitalDelivery: false });
    return NextResponse.json(defaults);
  }
}
