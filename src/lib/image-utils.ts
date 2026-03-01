/**
 * Convert a product image URL to its thumbnail URL.
 * Original: /api/uploads/products/foo-01.jpg
 * Thumb:    /api/uploads/products/foo-01-thumb.webp
 *
 * Falls back to the original URL if the format doesn't match.
 */
export function getThumbnailUrl(imageUrl: string): string {
  const match = imageUrl.match(/^(.+\/[^/]+)\.[a-z]+$/i);
  if (!match) return imageUrl;
  return `${match[1]}-thumb.webp`;
}
