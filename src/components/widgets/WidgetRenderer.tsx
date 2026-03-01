'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { splitByWidgets, isValidWidgetType, type WidgetMatch } from '@/lib/widgets';

interface WidgetRendererProps {
  html: string;
  locale: string;
  className?: string;
}

// Dynamic imports with ssr: false to prevent hydration mismatches
const FeaturedProductsWidget = dynamic(
  () => import('./FeaturedProductsWidget').then((mod) => mod.FeaturedProductsWidget),
  { ssr: false, loading: () => <div className="min-h-[200px] animate-pulse bg-muted/30 rounded-lg" /> }
);

const LatestProductsWidget = dynamic(
  () => import('./LatestProductsWidget').then((mod) => mod.LatestProductsWidget),
  { ssr: false, loading: () => <div className="min-h-[200px] animate-pulse bg-muted/30 rounded-lg" /> }
);

const ProductsByCategoryWidget = dynamic(
  () => import('./ProductsByCategoryWidget').then((mod) => mod.ProductsByCategoryWidget),
  { ssr: false, loading: () => <div className="min-h-[200px] animate-pulse bg-muted/30 rounded-lg" /> }
);

const CategoriesWidget = dynamic(
  () => import('./CategoriesWidget').then((mod) => mod.CategoriesWidget),
  { ssr: false, loading: () => <div className="min-h-[100px] animate-pulse bg-muted/30 rounded-lg" /> }
);

const CTAWidget = dynamic(
  () => import('./CTAWidget').then((mod) => mod.CTAWidget),
  { ssr: false }
);

const NewsletterWidget = dynamic(
  () => import('./NewsletterWidget').then((mod) => mod.NewsletterWidget),
  { ssr: false, loading: () => <div className="min-h-[100px] animate-pulse bg-muted/30 rounded-lg" /> }
);

const ReviewsWidget = dynamic(
  () => import('./ReviewsWidget').then((mod) => mod.ReviewsWidget),
  { ssr: false, loading: () => <div className="min-h-[200px] animate-pulse bg-muted/30 rounded-lg" /> }
);

function renderWidget(widget: WidgetMatch, locale: string): React.ReactNode {
  const { type, attributes } = widget;

  if (!isValidWidgetType(type)) {
    console.warn(`Unknown widget type: ${type}`);
    return null;
  }

  switch (type) {
    case 'featured-products':
      return (
        <FeaturedProductsWidget
          qty={attributes.qty ? parseInt(attributes.qty, 10) : undefined}
          locale={locale}
          title={attributes.title}
        />
      );

    case 'latest-products':
      return (
        <LatestProductsWidget
          qty={attributes.qty ? parseInt(attributes.qty, 10) : undefined}
          locale={locale}
          title={attributes.title}
        />
      );

    case 'products':
      if (!attributes.category) {
        console.warn('Products widget requires a category attribute');
        return null;
      }
      return (
        <ProductsByCategoryWidget
          category={attributes.category}
          qty={attributes.qty ? parseInt(attributes.qty, 10) : undefined}
          locale={locale}
          title={attributes.title}
        />
      );

    case 'categories':
      return (
        <CategoriesWidget
          locale={locale}
          title={attributes.title}
        />
      );

    case 'cta':
      if (!attributes.href || !attributes.text) {
        console.warn('CTA widget requires href and text attributes');
        return null;
      }
      return (
        <CTAWidget
          href={attributes.href}
          text={attributes.text}
          locale={locale}
          variant={attributes.variant as 'default' | 'outline' | 'secondary' | undefined}
          size={attributes.size as 'default' | 'sm' | 'lg' | undefined}
          fullWidth={attributes.fullwidth === 'true'}
        />
      );

    case 'newsletter':
      return (
        <NewsletterWidget
          locale={locale}
          title={attributes.title}
          description={attributes.description}
          compact={attributes.compact === 'true'}
        />
      );

    case 'reviews':
      return (
        <ReviewsWidget
          qty={attributes.qty ? parseInt(attributes.qty, 10) : undefined}
          locale={locale}
          title={attributes.title}
        />
      );

    default:
      return null;
  }
}

// Check if content has any widget shortcodes
function hasWidgets(html: string): boolean {
  return /\[[a-z-]+[^\]]*\]/i.test(html);
}

/**
 * WidgetRenderer - Renders HTML content with embedded widgets
 */
export function WidgetRenderer({ html, locale, className }: WidgetRendererProps) {
  const [mounted, setMounted] = useState(false);
  const containsWidgets = hasWidgets(html);

  useEffect(() => {
    if (containsWidgets) {
      setMounted(true);
    }
  }, [containsWidgets]);

  // If no widgets, just render the HTML directly (works on both server and client)
  if (!containsWidgets) {
    return (
      <div
        className={className}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // For content with widgets: render plain HTML on server, then hydrate with widgets on client
  if (!mounted) {
    // Server/initial render: just show the HTML without processing widgets
    // Remove shortcode syntax for cleaner display during loading
    const cleanHtml = html.replace(/\[[a-z-]+[^\]]*\]/gi, '<div class="min-h-[200px] animate-pulse bg-muted/30 rounded-lg"></div>');
    return (
      <div
        className={className}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  }

  // Client render: process widgets
  const segments = splitByWidgets(html);

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'html') {
          return (
            <div
              key={index}
              dangerouslySetInnerHTML={{ __html: segment.content }}
            />
          );
        }

        if (segment.type === 'widget' && segment.widget) {
          return (
            <div key={index}>
              {renderWidget(segment.widget, locale)}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
