import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-session';
import {
  validateDiscountCode,
  applyDiscountCode,
  applyDiscountCodeWithExclusions,
  CartItemForDiscount,
} from '@/lib/discounts';

interface RequestBody {
  code: string;
  orderTotalInCents: number;
  cartItems?: CartItemForDiscount[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, orderTotalInCents, cartItems } = body as RequestBody;

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Discount code is required' },
        { status: 400 }
      );
    }

    // Get customer session (optional - some discount codes work without login)
    const customerSession = await getCustomerSession();
    const customerId = customerSession?.customerId;

    // Validate the discount code
    const validation = await validateDiscountCode(
      code,
      orderTotalInCents,
      customerId
    );

    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        error: validation.error,
      });
    }

    const dc = validation.discountCode!;

    // Check if there are any exclusions and cart items provided
    const hasExclusions = dc.excludeBundles || dc.excludeAllAccessBundle || dc.excludeProducts;

    let discountAmount: number;
    let finalTotal: number;
    let eligibleTotalInCents: number | undefined;
    let excludedTotalInCents: number | undefined;

    if (hasExclusions && cartItems && cartItems.length > 0) {
      // Use exclusion-aware calculation
      const result = applyDiscountCodeWithExclusions(cartItems, dc);
      discountAmount = result.discountAmount;
      finalTotal = result.finalTotal;
      eligibleTotalInCents = result.eligibleTotalInCents;
      excludedTotalInCents = result.excludedTotalInCents;

      // If nothing is eligible for the discount, show a message
      if (eligibleTotalInCents === 0) {
        return NextResponse.json({
          valid: false,
          error: 'This discount code does not apply to the items in your cart',
        });
      }
    } else {
      // No exclusions or no cart items - apply to full total
      const result = applyDiscountCode(orderTotalInCents, dc);
      discountAmount = result.discountAmount;
      finalTotal = result.finalTotal;
    }

    return NextResponse.json({
      valid: true,
      discountCode: {
        id: dc.id,
        code: dc.code,
        name: dc.name,
        type: dc.type,
        valueInCents: dc.valueInCents,
        valuePercent: dc.valuePercent,
        discountAmount,
        finalTotal,
        eligibleTotalInCents,
        excludedTotalInCents,
        displayText:
          dc.type === 'percentage'
            ? `-${dc.valuePercent}%`
            : `-€${(dc.valueInCents! / 100).toFixed(2)}`,
      },
    });
  } catch (error) {
    console.error('Error validating discount code:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate discount code' },
      { status: 500 }
    );
  }
}
