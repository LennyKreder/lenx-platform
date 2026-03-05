/**
 * Routing constants and validation utilities for the shop URL structure.
 *
 * URL Pattern: /[locale]/shop/[type]/[year?]/[slug]
 *
 * Dated types (planners, printables): /shop/planners/2026/soft-rose-ipad
 * Undated types (notebooks, templates): /shop/notebooks/dotted-ipad
 * Bundles: /shop/bundles/all-access-2026
 */

// Valid year segments for dated product types
export const VALID_YEAR_SEGMENTS = [
  '2025',
  '2026',
  '2027',
  '2028',
  '2029',
  '2030',
  'undated',
] as const;

// Reserved segments that cannot be used as product slugs
export const RESERVED_SEGMENTS = [
  'latest',
  'current',
  'all',
  'new',
  'featured',
  'sale',
] as const;

// Product types that require a year segment in the URL
export const DATED_PRODUCT_TYPES = ['planners', 'printables'] as const;

// Product types that do NOT have a year segment
export const UNDATED_PRODUCT_TYPES = ['notebooks', 'templates'] as const;

// All product types
export const PRODUCT_TYPES = [
  ...DATED_PRODUCT_TYPES,
  ...UNDATED_PRODUCT_TYPES,
] as const;

// Type definitions
export type YearSegment = (typeof VALID_YEAR_SEGMENTS)[number];
export type DatedProductType = (typeof DATED_PRODUCT_TYPES)[number];
export type UndatedProductType = (typeof UNDATED_PRODUCT_TYPES)[number];
export type ProductType = (typeof PRODUCT_TYPES)[number];

/**
 * Check if a segment is a valid year (from allowlist)
 */
export function isValidYearSegment(segment: string): segment is YearSegment {
  return VALID_YEAR_SEGMENTS.includes(segment as YearSegment);
}

/**
 * Check if a segment is reserved and cannot be used as a slug
 */
export function isReservedSegment(segment: string): boolean {
  return RESERVED_SEGMENTS.includes(segment as (typeof RESERVED_SEGMENTS)[number]);
}

/**
 * Check if a product type requires a year segment
 */
export function isDatedProductType(type: string): type is DatedProductType {
  return DATED_PRODUCT_TYPES.includes(type as DatedProductType);
}

/**
 * Check if a product type does NOT have a year segment
 */
export function isUndatedProductType(type: string): type is UndatedProductType {
  return UNDATED_PRODUCT_TYPES.includes(type as UndatedProductType);
}

/**
 * Check if a string is a valid product type
 */
export function isValidProductType(type: string): type is ProductType {
  return PRODUCT_TYPES.includes(type as ProductType);
}

/**
 * Validate that a slug doesn't conflict with reserved words or year patterns
 */
export function isValidProductSlug(slug: string): boolean {
  // Must not be empty
  if (!slug || slug.trim() === '') return false;

  // Must not be a reserved segment
  if (isReservedSegment(slug)) return false;

  // Must not look like a year (4 digits)
  if (/^\d{4}$/.test(slug)) return false;

  // Must not be "undated"
  if (slug === 'undated') return false;

  // Basic slug format validation (lowercase, hyphens, alphanumeric)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return false;

  return true;
}

/**
 * Build a product URL for a dated product type
 */
export function buildDatedProductUrl(
  locale: string,
  type: DatedProductType,
  year: YearSegment,
  slug: string
): string {
  return `/${locale}/shop/${type}/${year}/${slug}`;
}

/**
 * Build a product URL for an undated product type
 */
export function buildUndatedProductUrl(
  locale: string,
  type: UndatedProductType,
  slug: string
): string {
  return `/${locale}/shop/${type}/${slug}`;
}

/**
 * Build a category URL for a dated product type
 */
export function buildDatedCategoryUrl(
  locale: string,
  type: DatedProductType,
  year: YearSegment
): string {
  return `/${locale}/shop/${type}/${year}`;
}

/**
 * Build a category URL for an undated product type
 */
export function buildUndatedCategoryUrl(
  locale: string,
  type: UndatedProductType
): string {
  return `/${locale}/shop/${type}`;
}

/**
 * Build a simple product URL (for physical products without a productType)
 */
export function buildProductUrl(locale: string, slug: string): string {
  return `/${locale}/shop/product/${slug}`;
}

/**
 * Build a bundle URL
 */
export function buildBundleUrl(locale: string, slug: string): string {
  return `/${locale}/shop/bundles/${slug}`;
}

/**
 * Build the main shop URL
 */
export function buildShopUrl(locale: string): string {
  return `/${locale}/shop`;
}

/**
 * Build a type listing URL (all products of a type)
 */
export function buildTypeUrl(locale: string, type: ProductType): string {
  return `/${locale}/shop/${type}`;
}
