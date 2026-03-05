import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { prisma } from '@/lib/prisma';

const EDITABLE_FIELDS = [
  'name',
  'logoUrl',
  'faviconUrl',
  'primaryColor',
  'accentColor',
  'footerText',
  'defaultMetaTitle',
  'defaultMetaDescription',
  'contactEmail',
  'fromEmail',
  'companyInfo',
  'gaTrackingId',
  'stripeAccountId',
  'stripeWebhookSecret',
  'hasShipping',
  'hasDigitalDelivery',
  'hasMultilingual',
  'hasBolIntegration',
  'hasBundles',
  'hasTemplates',
  'hasBlog',
  'hasReviews',
] as const;

// GET /api/admin/site/branding — return editable site fields
export async function GET() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = await getAdminSiteId();
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  return NextResponse.json({
    siteType: site.siteType,
    name: site.name,
    logoUrl: site.logoUrl,
    faviconUrl: site.faviconUrl,
    primaryColor: site.primaryColor,
    accentColor: site.accentColor,
    footerText: site.footerText,
    defaultMetaTitle: site.defaultMetaTitle,
    defaultMetaDescription: site.defaultMetaDescription,
    contactEmail: site.contactEmail,
    fromEmail: site.fromEmail,
    companyInfo: site.companyInfo || { name: '', cocNumber: '', vatNumber: '' },
    gaTrackingId: site.gaTrackingId,
    stripeAccountId: site.stripeAccountId,
    stripeWebhookSecret: site.stripeWebhookSecret,
    hasShipping: site.hasShipping,
    hasDigitalDelivery: site.hasDigitalDelivery,
    hasMultilingual: site.hasMultilingual,
    hasBolIntegration: site.hasBolIntegration,
    hasBundles: site.hasBundles,
    hasTemplates: site.hasTemplates,
    hasBlog: site.hasBlog,
    hasReviews: site.hasReviews,
  });
}

// PATCH /api/admin/site/branding — update site fields
export async function PATCH(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteId = await getAdminSiteId();
    const body = await request.json();

    // Only allow known fields
    const data: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    // Validate color fields
    if (data.primaryColor && typeof data.primaryColor === 'string' && !/^#[0-9a-fA-F]{6}$/.test(data.primaryColor)) {
      return NextResponse.json({ error: 'Invalid primary color format (use #RRGGBB)' }, { status: 400 });
    }
    if (data.accentColor && typeof data.accentColor === 'string' && !/^#[0-9a-fA-F]{6}$/.test(data.accentColor)) {
      return NextResponse.json({ error: 'Invalid accent color format (use #RRGGBB)' }, { status: 400 });
    }

    // Allow clearing colors
    if (data.primaryColor === '') data.primaryColor = null;
    if (data.accentColor === '') data.accentColor = null;
    if (data.logoUrl === '') data.logoUrl = null;
    if (data.faviconUrl === '') data.faviconUrl = null;
    if (data.footerText === '') data.footerText = null;
    if (data.defaultMetaTitle === '') data.defaultMetaTitle = null;
    if (data.defaultMetaDescription === '') data.defaultMetaDescription = null;
    if (data.contactEmail === '') data.contactEmail = null;
    if (data.fromEmail === '') data.fromEmail = null;
    if (data.gaTrackingId === '') data.gaTrackingId = null;
    if (data.stripeAccountId === '') data.stripeAccountId = null;
    if (data.stripeWebhookSecret === '') data.stripeWebhookSecret = null;

    const site = await prisma.site.update({
      where: { id: siteId },
      data,
    });

    return NextResponse.json({
      name: site.name,
      logoUrl: site.logoUrl,
      faviconUrl: site.faviconUrl,
      primaryColor: site.primaryColor,
      accentColor: site.accentColor,
      footerText: site.footerText,
      defaultMetaTitle: site.defaultMetaTitle,
      defaultMetaDescription: site.defaultMetaDescription,
      contactEmail: site.contactEmail,
      fromEmail: site.fromEmail,
      companyInfo: site.companyInfo || { name: '', cocNumber: '', vatNumber: '' },
      gaTrackingId: site.gaTrackingId,
      stripeAccountId: site.stripeAccountId,
      stripeWebhookSecret: site.stripeWebhookSecret,
      hasShipping: site.hasShipping,
      hasDigitalDelivery: site.hasDigitalDelivery,
      hasMultilingual: site.hasMultilingual,
      hasBolIntegration: site.hasBolIntegration,
      hasBundles: site.hasBundles,
      hasTemplates: site.hasTemplates,
      hasBlog: site.hasBlog,
      hasReviews: site.hasReviews,
    });
  } catch (error) {
    console.error('Error updating site branding:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
