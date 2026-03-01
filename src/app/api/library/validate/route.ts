import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to create structured log entries
function logValidate(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'validate-api',
    message,
    ...data,
  };

  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

// Download codes are LBL + 8 hex chars (case insensitive)
function isValidDownloadCode(code: string): boolean {
  return /^LBL[0-9A-Fa-f]{8}$/i.test(code);
}

function normalizeDownloadCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const { accessCode } = body;

    logValidate('info', 'Validation request received', {
      requestId,
      accessCode: accessCode ? `${String(accessCode).slice(0, 6)}...` : null,
    });

    if (!accessCode || typeof accessCode !== 'string') {
      logValidate('warn', 'Validation rejected: missing access code', { requestId });
      return NextResponse.json(
        { success: false, error: 'Access code is required' },
        { status: 400 }
      );
    }

    const normalizedCode = normalizeDownloadCode(accessCode);

    if (!isValidDownloadCode(normalizedCode)) {
      logValidate('warn', 'Validation rejected: invalid format', { requestId });
      return NextResponse.json(
        { success: false, error: 'Invalid access code format' },
        { status: 400 }
      );
    }

    // Try to find a product with this download code
    const product = await prisma.product.findUnique({
      where: { downloadCode: normalizedCode },
      include: {
        slugs: { where: { isPrimary: true } },
        template: {
          include: {
            translations: true,
          },
        },
      },
    });

    if (product) {
      if (!product.isPublished) {
        logValidate('warn', 'Validation rejected: product not published', { requestId, productId: product.id });
        return NextResponse.json(
          { success: false, error: 'This product is not available' },
          { status: 403 }
        );
      }

      const productSlug = product.slugs.find(s => s.languageCode === 'en')?.slug || product.slugs[0]?.slug || '';
      // Get product name from template (if available) or use a default
      const productName = product.template
        ? product.template.translations.find(t => t.languageCode === 'en')?.name || product.template.translations[0]?.name || 'Unknown Product'
        : 'Standalone Product';

      logValidate('info', 'Validation successful (product)', {
        requestId,
        productId: product.id,
        productSlug,
      });

      return NextResponse.json({
        success: true,
        type: 'product',
        accessCode: {
          code: normalizedCode,
          productId: product.id,
          productSlug,
          productName,
          theme: product.theme,
          contentLanguage: product.contentLanguage,
          year: product.year,
        },
      });
    }

    // Try to find a bundle with this download code
    const bundle = await prisma.bundle.findUnique({
      where: { downloadCode: normalizedCode },
      include: {
        slugs: { where: { isPrimary: true } },
        translations: true,
      },
    });

    if (bundle) {
      if (!bundle.isPublished) {
        logValidate('warn', 'Validation rejected: bundle not published', { requestId, bundleId: bundle.id });
        return NextResponse.json(
          { success: false, error: 'This bundle is not available' },
          { status: 403 }
        );
      }

      const bundleSlug = bundle.slugs.find(s => s.languageCode === 'en')?.slug || bundle.slugs[0]?.slug || '';
      const bundleName = bundle.translations.find(t => t.languageCode === 'en')?.name || bundle.translations[0]?.name || '';

      logValidate('info', 'Validation successful (bundle)', {
        requestId,
        bundleId: bundle.id,
        bundleSlug,
        isAllAccess: bundle.isAllAccess,
      });

      return NextResponse.json({
        success: true,
        type: 'bundle',
        accessCode: {
          code: normalizedCode,
          bundleId: bundle.id,
          bundleSlug,
          bundleName,
          isAllAccess: bundle.isAllAccess,
        },
      });
    }

    // Code not found
    logValidate('warn', 'Validation rejected: code not found', { requestId });
    return NextResponse.json(
      { success: false, error: 'Access code not found' },
      { status: 404 }
    );
  } catch (error) {
    logValidate('error', 'Validation failed: unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { success: false, error: 'An error occurred while validating the code' },
      { status: 500 }
    );
  }
}
