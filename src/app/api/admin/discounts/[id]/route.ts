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
    const discountId = parseInt(id, 10);
    const data = await request.json();

    // Verify discount belongs to this store
    const existing = await prisma.discount.findFirst({
      where: { id: discountId, siteId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    const discount = await prisma.discount.update({
      where: { id: discountId },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        valueInCents: data.valueInCents,
        valuePercent: data.valuePercent,
        scope: data.scope,
        product: data.productId
          ? { connect: { id: data.productId } }
          : { disconnect: true },
        bundle: data.bundleId
          ? { connect: { id: data.bundleId } }
          : { disconnect: true },
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
        priority: data.priority,
      },
    });

    return NextResponse.json(discount);
  } catch (error) {
    console.error('Error updating discount:', error);
    return NextResponse.json(
      { error: 'Failed to update discount' },
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
    const discountId = parseInt(id, 10);

    // Verify discount belongs to this store
    const existing = await prisma.discount.findFirst({
      where: { id: discountId, siteId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    await prisma.discount.delete({
      where: { id: discountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting discount:', error);
    return NextResponse.json(
      { error: 'Failed to delete discount' },
      { status: 500 }
    );
  }
}
