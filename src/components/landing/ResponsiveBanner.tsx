'use client';

import { useCallback } from 'react';
import { getBannerVariants } from '@/lib/banner-utils';

interface ResponsiveBannerProps {
  baseUrl: string | null | undefined;
  locale?: string;
  alt?: string;
  className?: string;
}

/**
 * Responsive banner with dark mode support.
 *
 * Uses naming convention to load variants:
 * - {base}-{lang}.jpg - language specific
 * - {base}-dark.jpg - dark mode version
 *
 * Falls back gracefully to base URL if variants don't exist.
 * Desktop image is used on all screen sizes with object-fit: cover.
 */
export function ResponsiveBanner({
  baseUrl,
  locale,
  alt = '',
  className = 'w-full h-full object-cover',
}: ResponsiveBannerProps) {
  const variants = getBannerVariants(baseUrl, locale);

  // Handle img error by falling back to base URL
  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (baseUrl && img.src !== baseUrl) {
      img.src = baseUrl;
    }
  }, [baseUrl]);

  if (!variants || !baseUrl) return null;

  return (
    <>
      {/* Light mode banner */}
      <img
        src={variants.desktopLight}
        alt={alt}
        className={`dark:hidden block ${className}`}
        onError={handleError}
      />

      {/* Dark mode banner */}
      <img
        src={variants.desktopDark}
        alt={alt}
        className={`hidden dark:block ${className}`}
        onError={handleError}
      />
    </>
  );
}
