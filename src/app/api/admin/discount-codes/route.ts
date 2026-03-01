import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

export async function POST(request: Request) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = await getAdminSiteId();
    const data = await request.json();

    // Check if code already exists
    const existing = await prisma.discountCode.findFirst({
      where: { siteId, code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A discount code with this code already exists' },
        { status: 400 }
      );
    }

    const discountCode = await prisma.discountCode.create({
      data: {
        siteId,
        code: data.code,
        name: data.name,
        description: data.description,
        type: data.type,
        valueInCents: data.valueInCents,
        valuePercent: data.valuePercent,
        maxUses: data.maxUses,
        maxUsesPerCustomer: data.maxUsesPerCustomer,
        minOrderInCents: data.minOrderInCents,
        excludeBundles: data.excludeBundles ?? false,
        excludeAllAccessBundle: data.excludeAllAccessBundle ?? false,
        targetYear: data.targetYear ?? null,
        targetDevice: data.targetDevice ?? null,
        targetTemplateId: data.targetTemplateId ?? null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(discountCode);
  } catch (error) {
    console.error('Error creating discount code:', error);
    return NextResponse.json(
      { error: 'Failed to create discount code' },
      { status: 500 }
    );
  }
}
