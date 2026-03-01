import { headers } from 'next/headers';
import { prisma } from './prisma';
import { COOKIE_NAMES } from './constants';
import { validateCustomerSession } from './customer-auth';

/**
 * Parse a specific cookie from the raw Cookie header.
 * Uses headers() instead of cookies() because cookies() in Next.js
 * standalone mode emits Set-Cookie headers that clear cookies on the response.
 */
function parseCookieFromHeader(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

export async function getCustomerSession(): Promise<{ customerId: number; email: string } | null> {
  const headerStore = await headers();
  const cookieHeader = headerStore.get('cookie') || '';
  const token = parseCookieFromHeader(cookieHeader, COOKIE_NAMES.CUSTOMER_SESSION);

  if (!token) {
    return null;
  }

  const session = await validateCustomerSession(token);

  if (!session.valid || !session.customerId || !session.email) {
    return null;
  }

  return {
    customerId: session.customerId,
    email: session.email,
  };
}

export async function isCustomerAuthenticated(): Promise<boolean> {
  const session = await getCustomerSession();
  return session !== null;
}

// For client-side usage - check if session cookie exists (not validated)
export function getSessionCookieName(): string {
  return COOKIE_NAMES.CUSTOMER_SESSION;
}

/**
 * Check if a customer owns a specific product (directly or via bundle)
 * Uses a single query with OR conditions to avoid N+1 pattern.
 */
export async function customerOwnsProduct(
  customerId: number,
  productId: number
): Promise<boolean> {
  // Build OR conditions for all access paths
  const orConditions: Array<Record<string, unknown>> = [
    // Direct product ownership
    { productId },
    // All-access bundle
    { bundle: { isAllAccess: true } },
    // Bundle containing this product
    { bundleId: { not: null }, bundle: { items: { some: { productId } } } },
  ];

  const access = await prisma.customerAccess.findFirst({
    where: {
      customerId,
      OR: orConditions,
    },
  });

  return !!access;
}

/**
 * Check if a customer owns a specific bundle
 */
export async function customerOwnsBundle(
  customerId: number,
  bundleId: number
): Promise<boolean> {
  const access = await prisma.customerAccess.findUnique({
    where: {
      customerId_bundleId: {
        customerId,
        bundleId,
      },
    },
  });

  return !!access;
}
