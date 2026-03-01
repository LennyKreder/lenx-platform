import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-session';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { InvoiceDocument, type InvoiceData } from '@/lib/invoice';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orderId: orderIdParam } = await params;
  const orderId = parseInt(orderIdParam, 10);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  // Get locale from query params or default to 'en'
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'en';

  // Check authentication - either customer or admin
  const customerSession = await getCustomerSession();
  const isAdmin = await isAdminAuthenticated();

  if (!customerSession && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch the order with items
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: {
              translations: true,
            },
          },
          bundle: {
            include: {
              translations: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // If customer, verify they own this order
  if (customerSession && !isAdmin) {
    if (order.customerId !== customerSession.customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  // Only allow invoice download for completed orders
  if (order.status !== 'completed') {
    return NextResponse.json(
      { error: 'Invoice only available for completed orders' },
      { status: 400 }
    );
  }

  // Build invoice data
  const invoiceItems = order.items.map((item) => {
    let name = 'Product';

    if (item.product) {
      const translation = item.product.translations.find(
        (t) => t.languageCode === locale
      );
      name = translation?.name || item.product.translations[0]?.name || 'Product';
    } else if (item.bundle) {
      const translation = item.bundle.translations.find(
        (t) => t.languageCode === locale
      );
      name = translation?.name || item.bundle.translations[0]?.name || 'Bundle';
    }

    return {
      name,
      quantity: item.quantity,
      priceInCents: item.priceInCents,
    };
  });

  const invoiceData: InvoiceData = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerEmail: order.customerEmail,
    billingCountry: order.billingCountry,
    items: invoiceItems,
    subtotalInCents: order.subtotalInCents,
    discountInCents: order.discountInCents,
    totalInCents: order.totalInCents,
    currency: order.currency,
    createdAt: order.createdAt,
    locale,
  };

  try {
    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      InvoiceDocument({ data: invoiceData })
    );

    // Return PDF as downloadable file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${order.orderNumber || order.id}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to generate invoice PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
