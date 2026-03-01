import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCustomerSession();

    if (!session) {
      return NextResponse.json({ isAuthenticated: false });
    }

    return NextResponse.json({
      isAuthenticated: true,
      email: session.email,
      customerId: session.customerId,
    });
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json({ isAuthenticated: false });
  }
}
