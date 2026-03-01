/**
 * Generate a URL-safe slug from text
 * Works on both client and server
 * Transliterates accented characters (ü→u, ö→o, ñ→n, etc.)
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/ß/g, 'ss') // German sharp s
    .replace(/æ/g, 'ae') // Ligatures
    .replace(/œ/g, 'oe')
    .normalize('NFD') // Decompose accented chars (ü → u + combining diaeresis)
    .replace(/[\u0300-\u036f]/g, '') // Strip combining diacritical marks
    .replace(/_/g, '-') // Replace underscores with hyphens
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validate that a slug is properly formatted
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
