import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders } from '@/lib/site-context';
import { checkRateLimit } from '@/lib/rate-limit';
import { createSampleDownloadToken, sendFreeSampleEmail } from '@/lib/email';

const VALID_THEMES = [
  'brown', 'dark_mode_blue', 'dark_mode_brown', 'dark_mode_essential',
  'dark_mode_olive', 'dark_mode_purple', 'dark_mode_rose', 'dark_mode_terminal',
  'earth_natural', 'grey_neutral', 'navy_professional', 'patina_blue',
  'pink', 'purple', 'royal_blue', 'soft_pastel', 'soft_rose',
];

const VALID_LANGUAGES = ['en', 'nl'];

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    // Rate limit: 5 requests per hour per IP
    const rateLimit = checkRateLimit(`sample-request:${clientIp}`, 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, locale = 'en', theme, language, month, year } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate sample parameters
    if (!theme || !VALID_THEMES.includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
    }

    if (!language || !VALID_LANGUAGES.includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
    }

    if (isNaN(yearNum) || yearNum < 2025 || yearNum > 2030) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    // Only allow requesting the current month's sample
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    if (yearNum !== currentYear || monthNum !== currentMonth) {
      return NextResponse.json(
        { error: 'Samples are only available for the current month' },
        { status: 400 }
      );
    }

    // Store subscriber as inactive (activated when they click the download link)
    const site = await getSiteFromHeaders();
    await prisma.newsletterSubscriber.upsert({
      where: { siteId_email: { siteId: site.id, email: trimmedEmail } },
      create: {
        siteId: site.id,
        email: trimmedEmail,
        locale: locale.slice(0, 5),
        source: 'free-sample',
        isActive: false,
      },
      update: {
        locale: locale.slice(0, 5),
      },
    });

    // Create signed download token (includes email for activation on click)
    const token = createSampleDownloadToken({
      email: trimmedEmail,
      theme,
      language,
      month: monthNum,
      year: yearNum,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const downloadUrl = `${baseUrl}/${locale}/free-sample/download?token=${token}`;

    // Send email with download link
    const result = await sendFreeSampleEmail({
      to: trimmedEmail,
      downloadUrl,
      locale,
    });

    if (!result.success) {
      console.error('Failed to send sample email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sample request error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
