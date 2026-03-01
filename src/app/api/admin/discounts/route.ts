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

    const discount = await prisma.discount.create({
      data: {
        siteId,
        name: data.name,
        description: data.description,
        type: data.type,
        valueInCents: data.valueInCents,
        valuePercent: data.valuePercent,
        scope: data.scope,
        productId: data.productId ?? null,
        bundleId: data.bundleId ?? null,
        excludeBundles: data.excludeBundles ?? false,
        excludeAllAccessBundle: data.excludeAllAccessBundle ?? false,
        targetYear: data.targetYear ?? null,
        targetDevice: data.targetDevice ?? null,
        targetTemplateId: data.targetTemplateId ?? null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive,
        priority: data.priority,
      },
    });

    return NextResponse.json(discount);
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json(
      { error: 'Failed to create discount' },
      { status: 500 }
    );
  }
}
