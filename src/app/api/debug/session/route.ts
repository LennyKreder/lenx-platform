import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAMES } from '@/lib/constants';
import { getCustomerSession } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Parse cookies from raw header to avoid cookies() from next/headers
  // which causes Set-Cookie side effects in standalone mode
  const rawCookieHeader = request.headers.get('cookie') || '';
  const cookiePairs = rawCookieHeader.split(';').map(s => s.trim()).filter(Boolean);
  const cookieNames = cookiePairs.map(pair => pair.split('=')[0]);
  const sessionValue = cookiePairs
    .find(pair => pair.startsWith(`${COOKIE_NAMES.CUSTOMER_SESSION}=`))
    ?.split('=')[1];

  const session = await getCustomerSession();

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    proto: request.headers.get('x-forwarded-proto'),
    host: request.headers.get('host'),
    url: request.url,
    cookieCount: cookiePairs.length,
    cookieNames,
    hasSessionCookie: !!sessionValue,
    sessionCookieLength: sessionValue?.length || 0,
    session: session
      ? { customerId: session.customerId, email: session.email }
      : null,
    rawCookieHeader,
  });
}
