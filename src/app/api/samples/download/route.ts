import { NextRequest, NextResponse } from 'next/server';
import { getObject, headObject } from '@/lib/s3';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifySampleDownloadToken } from '@/lib/email';
import { prisma } from '@/lib/prisma';

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);

  // Rate limit: 20 downloads per hour per IP
  const rateLimit = checkRateLimit(`sample-download:${clientIp}`, 20, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many downloads. Please try again later.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/not-found', request.url));
  }

  // Verify the signed token
  const tokenData = verifySampleDownloadToken(token);
  if (!tokenData.valid) {
    return NextResponse.redirect(new URL('/not-found', request.url));
  }

  const { email, theme, language, month, year } = tokenData;

  // Activate subscriber — clicking the link confirms the email is real
  if (email) {
    await prisma.newsletterSubscriber.updateMany({
      where: { email, isActive: false },
      data: { isActive: true },
    });
  }

  const monthStr = month!.toString().padStart(2, '0');
  const filename = `sample-${theme}-${language}-${monthStr}-${year}.pdf`;
  const s3Key = `files/samples/planners/${year}/${monthStr}/${filename}`;

  try {
    // Check if file exists
    const head = await headObject(s3Key);
    if (!head) {
      return NextResponse.redirect(new URL('/not-found', request.url));
    }

    // Fetch the PDF
    const { buffer } = await getObject(s3Key);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('Sample download error:', error);
    return NextResponse.json(
      { error: 'Failed to download sample' },
      { status: 500 }
    );
  }
}
