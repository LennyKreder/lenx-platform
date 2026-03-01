/**
 * Banner URL utilities with naming convention support.
 *
 * Given a base URL like `/api/uploads/banners/homepage-banner.jpg`,
 * generates variant URLs for different contexts:
 * - Language: homepage-banner-nl.jpg
 * - Dark mode: homepage-banner-dark.jpg
 * - Combinations: homepage-banner-nl-dark.jpg
 *
 * Fallback order (most specific to least):
 * 1. {base}-{lang}-dark.{ext}
 * 2. {base}-{lang}.{ext}
 * 3. {base}-dark.{ext}
 * 4. {base}.{ext}
 */

export interface BannerVariants {
  desktopLight: string;
  desktopDark: string;
}

/**
 * Generate banner variant URLs from a base URL
 */
export function getBannerVariants(
  baseUrl: string | null | undefined,
  locale?: string
): BannerVariants | null {
  if (!baseUrl) return null;

  // Parse the base URL to extract path and extension
  const lastDot = baseUrl.lastIndexOf('.');
  if (lastDot === -1) return null;

  const basePath = baseUrl.substring(0, lastDot);
  const ext = baseUrl.substring(lastDot);

  // Default language is 'en', don't add suffix for it
  const langSuffix = locale && locale !== 'en' ? `-${locale}` : '';

  return {
    // Desktop light: try language-specific first, fallback to base
    desktopLight: langSuffix ? `${basePath}${langSuffix}${ext}` : baseUrl,

    // Desktop dark: try language-specific dark, fallback to base dark
    desktopDark: `${basePath}${langSuffix}-dark${ext}`,
  };
}

/**
 * Get the base banner URL (without variants) for use as fallback
 */
export function getBaseBannerUrl(baseUrl: string | null | undefined): string | null {
  return baseUrl || null;
}
