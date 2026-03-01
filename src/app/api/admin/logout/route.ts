import { NextResponse } from 'next/server';
import { clearAdminAuthentication } from '@/lib/admin-auth';

export async function POST() {
  await clearAdminAuthentication();
  return NextResponse.redirect(new URL('/library/admin-login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
