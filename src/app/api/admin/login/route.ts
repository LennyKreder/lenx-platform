import { NextResponse } from 'next/server';
import { verifyAdminCredentials, setAdminAuthenticated } from '@/lib/admin-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    // Rate limit by IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `admin-login:${ip}`;

    const { allowed, retryAfterMs } = checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.ADMIN_LOGIN.maxAttempts,
      RATE_LIMITS.ADMIN_LOGIN.windowMs
    );

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
        }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password required' },
        { status: 400 }
      );
    }

    const user = await verifyAdminCredentials(email, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await setAdminAuthenticated(user);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
