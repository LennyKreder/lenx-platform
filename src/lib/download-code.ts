import crypto from 'crypto';

/**
 * Generate a unique download code for products and bundles.
 * Format: LBL + 8 hex characters (e.g., LBL1A2B3C4D)
 */
export function generateDownloadCode(): string {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `LBL${hex}`;
}

/**
 * Validate that a string matches the download code format.
 */
export function isValidDownloadCode(code: string): boolean {
  return /^LBL[0-9A-F]{8}$/i.test(code);
}

/**
 * Normalize a download code to uppercase.
 */
export function normalizeDownloadCode(code: string): string {
  return code.toUpperCase().trim();
}
