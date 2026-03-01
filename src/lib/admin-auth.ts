import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { compareSync } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { COOKIE_NAMES } from '@/lib/constants';

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || 'dev-secret-change-me'
);

const JWT_MAX_AGE = 60 * 60 * 24; // 24 hours

interface AdminJwtPayload {
  userId: number;
  email: string;
  role: string;
  siteAccess: string[];
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const user = await getAdminUser();
  return user !== null;
}

export async function getAdminUser(): Promise<AdminJwtPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAMES.ADMIN_AUTH)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as unknown as AdminJwtPayload;

    if (!p.userId || !p.email || !p.role) return null;

    return {
      userId: p.userId,
      email: p.email,
      role: p.role,
      siteAccess: p.siteAccess || [],
    };
  } catch {
    return null;
  }
}

export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<AdminJwtPayload | null> {
  const user = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!user || !user.isActive) return null;
  if (!compareSync(password, user.passwordHash)) return null;

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    siteAccess: (user.siteAccess as string[]) || [],
  };
}

export async function setAdminAuthenticated(payload: AdminJwtPayload): Promise<void> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    siteAccess: payload.siteAccess,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_MAX_AGE}s`)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.ADMIN_AUTH, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: JWT_MAX_AGE,
  });
}

export async function clearAdminAuthentication(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAMES.ADMIN_AUTH);
}
