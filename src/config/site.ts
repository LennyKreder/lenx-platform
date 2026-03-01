/**
 * Site-wide configuration
 */
export const siteConfig = {
  /** Site/brand name used in meta titles */
  name: 'Layouts by Lenny',

  /** Separator between page title and site name */
  separator: ' - ',

  /** Maximum length for meta titles before truncation */
  maxTitleLength: 60,

  /** Default meta description for pages without one */
  defaultDescription: 'Beautiful digital planners and calendars for iPad, reMarkable, and other devices.',
} as const;

/**
 * Build a meta title with optional brand suffix.
 * Automatically omits brand if result would exceed max length.
 *
 * @param pageTitle - The page-specific title
 * @param options - Configuration options
 * @returns The formatted meta title
 */
export function buildMetaTitle(
  pageTitle: string,
  options: {
    includeBrand?: boolean;
    separator?: string;
    maxLength?: number;
  } = {}
): string {
  const {
    includeBrand = true,
    separator = siteConfig.separator,
    maxLength = siteConfig.maxTitleLength,
  } = options;

  if (!includeBrand) {
    return pageTitle;
  }

  const fullTitle = `${pageTitle}${separator}${siteConfig.name}`;

  // If too long, return without brand
  if (fullTitle.length > maxLength) {
    return pageTitle;
  }

  return fullTitle;
}

/**
 * Check if a meta title needs the brand appended.
 * Used when the title might already include the brand.
 */
export function shouldAppendBrand(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  const lowerBrand = siteConfig.name.toLowerCase();

  // Don't append if title already contains brand name
  return !lowerTitle.includes(lowerBrand);
}
