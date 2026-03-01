import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSiteFromHeaders } from '@/lib/site-context';
import { createCustomerSession } from '@/lib/customer-auth';
import { COOKIE_NAMES, SESSION_MAX_AGE } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find customer
    const site = await getSiteFromHeaders();
    const customer = await prisma.customer.findFirst({
      where: { email: normalizedEmail, siteId: site.id },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid email or code' },
        { status: 401 }
      );
    }

    // Find valid verification code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        customerId: customer.id,
        code,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 401 }
      );
    }

    // Delete used code
    await prisma.verificationCode.delete({
      where: { id: verificationCode.id },
    });

    // Create session
    const sessionToken = await createCustomerSession(customer.id);

    // Set cookie via raw header — response.cookies.set() does not work
    // reliably in Next.js standalone mode behind a reverse proxy.
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieParts = [
      `${COOKIE_NAMES.CUSTOMER_SESSION}=${sessionToken}`,
      'HttpOnly',
      isProduction ? 'Secure' : '',
      'SameSite=Lax',
      `Max-Age=${SESSION_MAX_AGE}`,
      'Path=/',
    ].filter(Boolean).join('; ');

    const response = NextResponse.json({
      success: true,
      email: normalizedEmail,
    });

    response.headers.set('Set-Cookie', cookieParts);

    return response;
  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
