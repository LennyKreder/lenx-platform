import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

export interface MenuItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface MenuConfig {
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

// GET /api/admin/menus - Get menu configuration
export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();

  const setting = await prisma.siteSetting.findUnique({
    where: { siteId_key: { siteId, key: 'menus' } },
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
}

// PUT /api/admin/menus - Update menu configuration
export async function PUT(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteId = await getAdminSiteId();
    const body = await request.json();
    const { header, footer } = body as MenuConfig;

    const menus: MenuConfig = {
      header: header || [],
      footer: footer || [],
    };

    await prisma.siteSetting.upsert({
      where: { siteId_key: { siteId, key: 'menus' } },
      create: { siteId, key: 'menus', value: JSON.stringify(menus) },
      update: { value: JSON.stringify(menus) },
    });

    return NextResponse.json(menus);
  } catch (error) {
    console.error('Error updating menus:', error);
    return NextResponse.json(
      { error: 'Failed to update menus' },
      { status: 500 }
    );
  }
}
