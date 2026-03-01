import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { getAdminSiteId } from '@/lib/admin-site';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = await getAdminSiteId();
    const { id } = await context.params;
    const discountCodeId = parseInt(id, 10);
    const data = await request.json();

    // Verify discount code belongs to this store
    const existing = await prisma.discountCode.findFirst({
      where: { id: discountCodeId, siteId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
    }

    const discountCode = await prisma.discountCode.update({
      where: { id: discountCodeId },
      data: {
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
        targetTemplate: data.targetTemplateId
          ? { connect: { id: data.targetTemplateId } }
          : { disconnect: true },
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(discountCode);
  } catch (error) {
    console.error('Error updating discount code:', error);
    return NextResponse.json(
      { error: 'Failed to update discount code' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const isAuthenticated = await isAdminAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = await getAdminSiteId();
    const { id } = await context.params;
    const discountCodeId = parseInt(id, 10);

    // Verify discount code belongs to this store
    const existing = await prisma.discountCode.findFirst({
      where: { id: discountCodeId, siteId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 });
    }

    await prisma.discountCode.delete({
      where: { id: discountCodeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    return NextResponse.json(
      { error: 'Failed to delete discount code' },
      { status: 500 }
    );
  }
}
