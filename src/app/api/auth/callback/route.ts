import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COOKIE_NAMES, SESSION_MAX_AGE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/callback?token=...&returnTo=...
 *
 * Sets the session cookie via cookies() API (same as admin login)
 * and redirects to the account page via Refresh header.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const returnTo = searchParams.get('returnTo') || '/en/account';

  // Validate returnTo is a relative path (prevent open redirect)
  const safePath = returnTo.startsWith('/') ? returnTo : '/en/account';

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  // Validate the token exists in the database
  const session = await prisma.customerSession.findUnique({
    where: { token },
  });

  if (!session || new Date(session.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 400 });
  }

  // Mark session as used
  await prisma.customerSession.update({
    where: { id: session.id },
    data: { usedAt: new Date() },
  });

  // Build redirect URL using forwarded headers from the reverse proxy.
  // request.url is the internal container address (0.0.0.0:3000), not the
  // external domain, so we must reconstruct the real origin.
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const redirectUrl = new URL(safePath, `${proto}://${host}`);
  const response = NextResponse.redirect(redirectUrl);

  // Set cookie via raw header — response.cookies.set() does not work
  // reliably in Next.js standalone mode behind a reverse proxy.
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieParts = [
    `${COOKIE_NAMES.CUSTOMER_SESSION}=${token}`,
    'HttpOnly',
    isProduction ? 'Secure' : '',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE}`,
    'Path=/',
  ].filter(Boolean).join('; ');
  response.headers.set('Set-Cookie', cookieParts);

  return response;
}
