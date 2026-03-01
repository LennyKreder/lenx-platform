# Discount System

This document explains how discounts work in the shop.

## Two Types of Discounts

### 1. Automatic Discounts (Discounts)

These apply automatically to products/bundles in the shop. Customers see the discounted price immediately.

**Scopes:**
- **Product** - Applies to a specific product
- **Category** - Applies to all products in a category
- **Bundle** - Applies to a specific bundle
- **All** - Applies to everything (with optional exclusions)

**Priority (most specific wins):**
1. Product discount (highest priority)
2. Bundle discount
3. Category discount
4. All discount (lowest priority)

If a product has both a product-specific discount and an "all" discount, only the product-specific one applies. Discounts do NOT stack.

**Exclusions (for "All" scope only):**
- Exclude all bundles
- Exclude all-access bundle only

### 2. Discount Codes

Customers enter these at checkout. They apply on top of automatic discounts.

**Features:**
- Usage limits (total uses, per customer)
- Minimum order value
- Validity period (start/end dates)
- Can exclude bundles or all-access bundle

## Database Models

### Discount
```
- name, description
- type: "percentage" | "fixed"
- valuePercent / valueInCents
- scope: "product" | "category" | "bundle" | "all"
- productId / categoryId / bundleId (based on scope)
- excludeBundles, excludeAllAccessBundle
- startsAt, endsAt
- isActive
- priority (for same-scope tiebreaker)
```

### DiscountCode
```
- code (unique, uppercase)
- name, description
- type: "percentage" | "fixed"
- valuePercent / valueInCents
- maxUses, usedCount
- maxUsesPerCustomer
- minOrderInCents
- excludeBundles, excludeAllAccessBundle
- startsAt, endsAt
- isActive
```

## Admin UI

Located at `/admin/discounts` and `/admin/discount-codes`.

## Code Location

- `src/lib/discounts.ts` - Core discount logic
- `src/app/api/admin/discounts/` - Admin CRUD APIs
- `src/app/api/admin/discount-codes/` - Admin CRUD APIs
- `src/app/api/checkout/validate-discount/` - Validate discount code at checkout
- `src/components/admin/discounts/` - Admin form components

## Examples

**Product on sale:**
- Create discount with scope "product", select the product, set percentage

**Site-wide sale (excluding bundles):**
- Create discount with scope "all", enable "Exclude all bundles"

**Promo code for 10% off (not on all-access bundle):**
- Create discount code with 10% value, enable "Exclude all-access bundle only"
