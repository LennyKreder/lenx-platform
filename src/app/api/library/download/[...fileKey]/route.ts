import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { parseFileKey, findActualFile } from '@/lib/files';
import { getObject } from '@/lib/s3';
import { isValidDownloadCode, normalizeDownloadCode } from '@/lib/download-code';
import { getCustomerSession } from '@/lib/customer-session';
import { hasAccessToProduct } from '@/lib/customer-access';

// Helper to create structured log entries
function logDownload(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'download-api',
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileKey: string[] }> }
) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ipAddress = forwardedFor?.split(',')[0] || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || null;

  try {
    const { fileKey } = await params;
    const fileKeyString = fileKey.join('/');

    // Get access code from header or check customer session
    const accessCode = headersList.get('x-access-code');
    const productIdHeader = headersList.get('x-product-id');
    const customerSession = await getCustomerSession();

    logDownload('info', 'Download request received', {
      requestId,
      fileKey: fileKeyString,
      accessCode: accessCode ? `${accessCode.slice(0, 6)}...` : null,
      hasCustomerSession: !!customerSession,
      productId: productIdHeader,
      ipAddress,
    });

    // Build normalized access data from whichever auth method is used
    let accessData: {
      id: number;
      source: 'product' | 'bundle' | 'customer';
      theme: string;
      contentLanguage: string;
      isActive: boolean;
      customerId?: number;
    } | null = null;

    // Method 1: Customer session + product ID
    if (customerSession && productIdHeader) {
      const productId = parseInt(productIdHeader, 10);
      if (!isNaN(productId)) {
        const hasAccess = await hasAccessToProduct(productId, { customerId: customerSession.customerId });
        if (hasAccess) {
          // Get product details for theme/language restrictions
          const product = await prisma.product.findUnique({
            where: { id: productId },
          });
          if (product && product.isPublished) {
            accessData = {
              id: product.id,
              source: 'customer',
              theme: product.theme || 'all',
              contentLanguage: product.contentLanguage || 'all',
              isActive: true,
              customerId: customerSession.customerId,
            };
          }
        }
      }
    }

    // Method 2: Download code (Product or Bundle)
    if (!accessData && accessCode) {
      const normalizedCode = normalizeDownloadCode(accessCode);

      if (!isValidDownloadCode(normalizedCode)) {
        logDownload('warn', 'Download rejected: invalid access code format', { requestId, fileKey: fileKeyString });
        return NextResponse.json(
          { success: false, error: 'Invalid access code format' },
          { status: 400 }
        );
      }

      // Validate download code against Product and Bundle tables
      const [product, bundle] = await Promise.all([
        prisma.product.findUnique({
          where: { downloadCode: normalizedCode },
        }),
        prisma.bundle.findUnique({
          where: { downloadCode: normalizedCode },
        }),
      ]);

      if (product) {
        accessData = {
          id: product.id,
          source: 'product',
          theme: product.theme || 'all',
          contentLanguage: product.contentLanguage || 'all',
          isActive: product.isPublished,
        };
      } else if (bundle) {
        accessData = {
          id: bundle.id,
          source: 'bundle',
          theme: bundle.isAllAccess ? 'all' : 'all', // Bundles give access to all themes
          contentLanguage: 'all', // Bundles give access to all languages
          isActive: bundle.isPublished,
        };
      }
    }

    if (!accessData) {
      logDownload('warn', 'Download rejected: no valid authentication', { requestId, fileKey: fileKeyString });
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!accessData.isActive) {
      logDownload('warn', 'Download rejected: access deactivated', { requestId, fileKey: fileKeyString, accessId: accessData.id, source: accessData.source });
      return NextResponse.json(
        { success: false, error: 'Product not available' },
        { status: 403 }
      );
    }

    // Parse the file key to extract theme
    const fileParams = parseFileKey(fileKeyString);

    if (!fileParams) {
      logDownload('warn', 'Download rejected: invalid file path', { requestId, fileKey: fileKeyString, accessId: accessData.id, source: accessData.source });
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Verify the requested theme matches the access theme
    // 'all' means access to all themes
    const hasThemeAccess = accessData.theme === 'all' || fileParams.theme === accessData.theme;
    if (!hasThemeAccess) {
      logDownload('warn', 'Download rejected: theme access denied', {
        requestId,
        fileKey: fileKeyString,
        accessId: accessData.id,
        source: accessData.source,
        requestedTheme: fileParams.theme,
        accessTheme: accessData.theme,
      });
      return NextResponse.json(
        { success: false, error: 'You do not have access to this theme' },
        { status: 403 }
      );
    }

    // Verify language access
    // - 'all' means access to all languages
    // - 'nl' means access to both 'nl' and 'en' (Dutch purchases include English)
    // - 'en' means access to 'en' only
    const hasLanguageAccess =
      accessData.contentLanguage === 'all' ||
      fileParams.language === accessData.contentLanguage ||
      (accessData.contentLanguage === 'nl' && fileParams.language === 'en');

    if (!hasLanguageAccess) {
      logDownload('warn', 'Download rejected: language access denied', {
        requestId,
        fileKey: fileKeyString,
        accessId: accessData.id,
        source: accessData.source,
        requestedLanguage: fileParams.language,
        accessContentLanguage: accessData.contentLanguage,
      });
      return NextResponse.json(
        { success: false, error: 'You do not have access to this language' },
        { status: 403 }
      );
    }

    // Find the actual file in S3
    const s3Key = await findActualFile(fileParams);

    if (!s3Key) {
      logDownload('error', 'Download failed: file not found in S3', {
        requestId,
        fileKey: fileKeyString,
        accessId: accessData.id,
        source: accessData.source,
        fileParams,
      });
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Log the download to database
    if (accessData.source === 'customer') {
      // Log customer download
      await prisma.downloadLog.create({
        data: {
          customerId: accessData.customerId,
          productId: accessData.id,
          fileKey: fileKeyString,
          ipAddress,
          userAgent,
        },
      });
    } else {
      // Log to DownloadLog for products/bundles accessed via download code
      await prisma.downloadLog.create({
        data: {
          accessCode: accessCode ? normalizeDownloadCode(accessCode) : undefined,
          fileKey: fileKeyString,
          ipAddress,
          userAgent,
        },
      });
    }

    // Fetch file from S3
    const { buffer: fileBuffer, size } = await getObject(s3Key);
    const fileName = s3Key.split('/').pop()!;

    logDownload('info', 'Download successful', {
      requestId,
      fileKey: fileKeyString,
      accessId: accessData.id,
      source: accessData.source,
      fileName,
      fileSize: size,
    });

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': size.toString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logDownload('error', 'Download failed: unexpected error', {
      requestId,
      error: errorMessage,
      stack: errorStack,
    });

    // In development, return more detailed error info
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        success: false,
        error: isDev ? errorMessage : 'An error occurred during download',
        ...(isDev && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}
