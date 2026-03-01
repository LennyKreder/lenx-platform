/**
 * Order Number Generation
 *
 * Format: PREFIX-BASENUM-SUFFIX (e.g., LBL-10423-K7)
 *
 * - PREFIX: Configurable brand prefix (default: "LBL")
 * - BASENUM: Sequential number with offset (starts at 10000+)
 * - SUFFIX: Random 2-char string for uniqueness
 *
 * Strategy: Generate AFTER insert using the DB-assigned `id` + offset.
 * This ensures sequential ordering while the suffix handles any edge cases.
 */

// Safe charset - excludes ambiguous characters (0, O, 1, I, L)
const SAFE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Configuration
const ORDER_NUMBER_CONFIG = {
  prefix: 'LBL',
  offset: 10000,      // id=1 becomes 10001
  suffixLength: 2,
};

/**
 * Generate a random suffix using safe characters
 */
function generateSuffix(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += SAFE_CHARSET[Math.floor(Math.random() * SAFE_CHARSET.length)];
  }
  return result;
}

/**
 * Generate a customer-facing order number
 *
 * @param id - The database auto-increment ID
 * @param options - Optional overrides for prefix, offset, suffixLength
 * @returns Order number string (e.g., "LBL-10423-K7")
 */
export function generateOrderNumber(
  id: number,
  options?: {
    prefix?: string;
    offset?: number;
    suffixLength?: number;
  }
): string {
  const prefix = options?.prefix ?? ORDER_NUMBER_CONFIG.prefix;
  const offset = options?.offset ?? ORDER_NUMBER_CONFIG.offset;
  const suffixLength = options?.suffixLength ?? ORDER_NUMBER_CONFIG.suffixLength;

  const baseNumber = id + offset;
  const suffix = generateSuffix(suffixLength);

  return `${prefix}-${baseNumber}-${suffix}`;
}

/**
 * Parse an order number back to its components
 * Useful for debugging or displaying parts separately
 */
export function parseOrderNumber(orderNumber: string): {
  prefix: string;
  baseNumber: number;
  suffix: string;
} | null {
  const match = orderNumber.match(/^([A-Z]+)-(\d+)-([A-Z0-9]+)$/);
  if (!match) return null;

  return {
    prefix: match[1],
    baseNumber: parseInt(match[2], 10),
    suffix: match[3],
  };
}

/**
 * Validate order number format
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  return /^[A-Z]+-\d+-[A-Z0-9]+$/.test(orderNumber);
}
