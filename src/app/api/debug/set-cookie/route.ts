import { NextResponse } from 'next/server';
import { COOKIE_NAMES, SESSION_MAX_AGE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const response = NextResponse.json({
    message: 'cookie-test-v2',
    timestamp: new Date().toISOString(),
  });

  // Test 1: original test cookie (previously proven to work)
  response.cookies.set('test_cookie', 'hello123', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 3600,
    path: '/',
  });

  // Test 2: the EXACT session cookie (same name, options as login flow)
  response.cookies.set(COOKIE_NAMES.CUSTOMER_SESSION, 'test-session-value', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  // Test 3: session cookie via raw header
  response.headers.append(
    'Set-Cookie',
    `${COOKIE_NAMES.CUSTOMER_SESSION}_raw=test-raw-session; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; SameSite=Lax`
  );

  return response;
}
