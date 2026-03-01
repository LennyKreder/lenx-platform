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

const DEFAULT_MENUS: MenuConfig = {
  header: [
    { label: 'Shop', href: '/shop' },
    { label: 'Blog', href: '/blog' },
  ],
  footer: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Blog', href: '/blog' },
    { label: 'Terms', href: '/terms' },
    { label: 'How to Import', href: '/how-to-import' },
    { label: 'Etsy', href: 'https://www.etsy.com/shop/LayoutsByLenny', external: true },
  ],
};

// GET /api/menus - Get menu configuration (public)
export async function GET() {
  try {
    const site = await getSiteFromHeaders();
    const setting = await prisma.siteSetting.findUnique({
      where: { siteId_key: { siteId: site.id, key: 'menus' } },
    });

    if (setting) {
      try {
        const menus = JSON.parse(setting.value) as MenuConfig;
        return NextResponse.json(menus);
      } catch {
        return NextResponse.json(DEFAULT_MENUS);
      }
    }

    return NextResponse.json(DEFAULT_MENUS);
  } catch {
    return NextResponse.json(DEFAULT_MENUS);
  }
}
