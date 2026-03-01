import crypto from 'crypto';
import { prisma } from './prisma';
import { getSiteFromHeaders } from './site-context';

const SESSION_EXPIRY_DAYS = 30;
const TOKEN_LENGTH = 32;

export function generateSessionToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

export async function getOrCreateCustomerByEmail(email: string, overrideStoreId?: string): Promise<{ id: number; isNew: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();
  const siteId = overrideStoreId ?? (await getSiteFromHeaders()).id;

  const existingCustomer = await prisma.customer.findFirst({
    where: { email: normalizedEmail, siteId },
  });

  if (existingCustomer) {
    return { id: existingCustomer.id, isNew: false };
  }

  const newCustomer = await prisma.customer.create({
    data: { email: normalizedEmail, siteId },
  });

  return { id: newCustomer.id, isNew: true };
}

export async function createCustomerSession(customerId: number): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.customerSession.create({
    data: {
      customerId,
      token,
      expiresAt,
    },
  });

  // Update customer's last login
  await prisma.customer.update({
    where: { id: customerId },
    data: { lastLoginAt: new Date() },
  });

  return token;
}

export async function validateCustomerSession(token: string): Promise<{ valid: boolean; customerId?: number; email?: string }> {
  const session = await prisma.customerSession.findUnique({
    where: { token },
    include: { customer: true },
  });

  if (!session) {
    return { valid: false };
  }

  // Check if session has expired
  if (new Date(session.expiresAt) < new Date()) {
    // Clean up expired session
    await prisma.customerSession.delete({ where: { id: session.id } });
    return { valid: false };
  }

  // Mark session as used (for tracking)
  if (!session.usedAt) {
    await prisma.customerSession.update({
      where: { id: session.id },
      data: { usedAt: new Date() },
    });
  }

  return {
    valid: true,
    customerId: session.customerId,
    email: session.customer.email,
  };
}

export async function getCustomerById(customerId: number) {
  return prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, email: true, createdAt: true, lastLoginAt: true },
  });
}

export async function getCustomerAccessProducts(customerId: number) {
  const access = await prisma.customerAccess.findMany({
    where: { customerId },
    include: {
      product: {
        include: {
          template: {
            include: {
              translations: true,
            },
          },
          translations: true,
          files: true,
        },
      },
      bundle: {
        include: {
          translations: true,
          items: {
            include: {
              product: {
                include: {
                  template: {
                    include: {
                      translations: true,
                    },
                  },
                  translations: true,
                  files: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return access;
}

// Clean up expired sessions (can be called periodically)
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.customerSession.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}
