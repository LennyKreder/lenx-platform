import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders } from '@/lib/site-context';
import { checkRateLimit } from '@/lib/rate-limit';

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
    const rateLimit = checkRateLimit(`newsletter:${clientIp}`, 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, locale = 'en', source = 'website' } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate source
    const validSources = ['website', 'free-sample'];
    const safeSource = validSources.includes(source) ? source : 'website';

    // Upsert: create new or reactivate if previously unsubscribed
    const site = await getSiteFromHeaders();
    await prisma.newsletterSubscriber.upsert({
      where: { siteId_email: { siteId: site.id, email: trimmedEmail } },
      create: {
        siteId: site.id,
        email: trimmedEmail,
        locale: locale.slice(0, 5),
        source: safeSource,
        isActive: true,
      },
      update: {
        isActive: true,
        locale: locale.slice(0, 5),
        unsubscribedAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
