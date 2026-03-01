/**
 * Widget system for embedding dynamic content in CMS pages
 *
 * Shortcode syntax: [widget-name attr="value" attr2="value2"]
 *
 * Available widgets:
 * - [featured-products qty="6"] - Featured products grid
 * - [latest-products qty="4"] - Latest products grid
 * - [products category="planners" qty="3"] - Products by category
 * - [categories] - Category cards grid
 * - [cta href="/shop" text="Browse Shop"] - Call to action button
 * - [newsletter] - Newsletter signup form
 * - [reviews qty="4"] - Random customer reviews
 */

export interface WidgetMatch {
  fullMatch: string;
  type: string;
  attributes: Record<string, string>;
  index: number;
}

// Parse shortcode attributes like: attr="value" attr2="value2"
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /(\w+)=["']([^"']*)["']/g;
  let match;
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

// Find all shortcodes in HTML content
export function findWidgets(html: string): WidgetMatch[] {
  const widgets: WidgetMatch[] = [];
  // Match [widget-name ...attributes]
  const regex = /\[([a-z-]+)([^\]]*)\]/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const type = match[1].toLowerCase();
    const attrString = match[2].trim();

    widgets.push({
      fullMatch: match[0],
      type,
      attributes: parseAttributes(attrString),
      index: match.index,
    });
  }

  return widgets;
}

// Split HTML content by widgets, returning alternating HTML and widget segments
export function splitByWidgets(html: string): Array<{ type: 'html' | 'widget'; content: string; widget?: WidgetMatch }> {
  const widgets = findWidgets(html);

  if (widgets.length === 0) {
    return [{ type: 'html', content: html }];
  }

  const segments: Array<{ type: 'html' | 'widget'; content: string; widget?: WidgetMatch }> = [];
  let lastIndex = 0;

  for (const widget of widgets) {
    // Add HTML before the widget
    if (widget.index > lastIndex) {
      const htmlContent = html.slice(lastIndex, widget.index);
      if (htmlContent.trim()) {
        segments.push({ type: 'html', content: htmlContent });
      }
    }

    // Add the widget
    segments.push({ type: 'widget', content: widget.fullMatch, widget });

    lastIndex = widget.index + widget.fullMatch.length;
  }

  // Add remaining HTML after the last widget
  if (lastIndex < html.length) {
    const htmlContent = html.slice(lastIndex);
    if (htmlContent.trim()) {
      segments.push({ type: 'html', content: htmlContent });
    }
  }

  return segments;
}

// Supported widget types
export const WIDGET_TYPES = [
  'featured-products',
  'latest-products',
  'products',
  'categories',
  'cta',
  'newsletter',
  'reviews',
] as const;

export type WidgetType = typeof WIDGET_TYPES[number];

export function isValidWidgetType(type: string): type is WidgetType {
  return WIDGET_TYPES.includes(type as WidgetType);
}
