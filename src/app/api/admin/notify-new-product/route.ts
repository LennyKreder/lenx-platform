import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';
import { sendNewProductNotificationEmail } from '@/lib/email';

// POST /api/admin/notify-new-product - Notify all-access bundle customers about a new product
export async function POST(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteId = await getAdminSiteId();
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Fetch the product with its translations (scoped to store)
    const product = await prisma.product.findFirst({
      where: { id: productId, siteId },
      include: {
        translations: true,
        slugs: { where: { isPrimary: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Find all customers with all-access bundle access (scoped to store)
    const allAccessCustomers = await prisma.customerAccess.findMany({
      where: {
        bundle: {
          isAllAccess: true,
          siteId,
        },
      },
      include: {
        customer: {
          select: { id: true, email: true },
        },
      },
    });

    // Deduplicate customers (a customer might have multiple all-access entries)
    const uniqueCustomers = new Map<number, string>();
    for (const access of allAccessCustomers) {
      if (access.customer) {
        uniqueCustomers.set(access.customer.id, access.customer.email);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const productSlug = product.slugs[0]?.slug || product.id.toString();
    const images = product.images as string[] | null;
    const productImage = images?.[0] || undefined;

    let sent = 0;
    let failed = 0;

    for (const [, email] of uniqueCustomers) {
      // Determine locale from customer's previous orders or default to 'en'
      const enTranslation = product.translations.find((t) => t.languageCode === 'en');
      const nlTranslation = product.translations.find((t) => t.languageCode === 'nl');
      const productName = enTranslation?.name || nlTranslation?.name || 'New Product';

      // Send in both languages - use English as default
      const shopUrl = `${baseUrl}/en/shop/${productSlug}`;

      const result = await sendNewProductNotificationEmail({
        to: email,
        productName,
        productImage,
        shopUrl,
        locale: 'en',
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      totalCustomers: uniqueCustomers.size,
      sent,
      failed,
    });
  } catch (error) {
    console.error('Error sending new product notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
