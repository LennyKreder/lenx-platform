import { NextResponse } from 'next/server';
import { COOKIE_NAMES } from '@/lib/constants';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = NextResponse.redirect(`${baseUrl}/${locale}`);

  // Delete cookie on the response object directly
  response.cookies.set(COOKIE_NAMES.CUSTOMER_SESSION, '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'en';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const response = NextResponse.redirect(`${baseUrl}/${locale}`);

  // Delete cookie on the response object directly
  response.cookies.set(COOKIE_NAMES.CUSTOMER_SESSION, '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
