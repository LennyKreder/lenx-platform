import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidDownloadCode, normalizeDownloadCode } from '@/lib/download-code';

// Helper to create structured log entries
function logWizard(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'wizard-api',
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

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const { accessCode, language, theme, plannerType, weekStart, timeFormat, calendarIntegration, completed } = body;

    logWizard('info', 'Wizard session request received', {
      requestId,
      accessCode: accessCode ? `${String(accessCode).slice(0, 6)}...` : null,
      language,
      theme,
      plannerType,
      weekStart,
      timeFormat,
      calendarIntegration,
      completed,
    });

    if (!accessCode) {
      logWizard('warn', 'Wizard session rejected: missing access code', { requestId });
      return NextResponse.json(
        { success: false, error: 'Access code required' },
        { status: 400 }
      );
    }

    const normalizedCode = normalizeDownloadCode(accessCode);

    if (!isValidDownloadCode(normalizedCode)) {
      logWizard('warn', 'Wizard session rejected: invalid access code format', { requestId });
      return NextResponse.json(
        { success: false, error: 'Invalid access code format' },
        { status: 400 }
      );
    }

    // Verify the access code exists (in product or bundle)
    const product = await prisma.product.findUnique({
      where: { downloadCode: normalizedCode },
    });

    const bundle = !product ? await prisma.bundle.findUnique({
      where: { downloadCode: normalizedCode },
    }) : null;

    if (!product && !bundle) {
      logWizard('warn', 'Wizard session rejected: access code not found', { requestId });
      return NextResponse.json(
        { success: false, error: 'Access code not found' },
        { status: 404 }
      );
    }

    // Log wizard session info (without storing in deprecated wizardSession table)
    logWizard('info', 'Wizard session completed', {
      requestId,
      accessCode: `${normalizedCode.slice(0, 6)}...`,
      entityType: product ? 'product' : 'bundle',
      entityId: product?.id || bundle?.id,
      language,
      theme,
      plannerType,
      weekStart,
      timeFormat,
      calendarIntegration,
      completed,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logWizard('error', 'Wizard session failed: unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to log wizard session' },
      { status: 500 }
    );
  }
}
