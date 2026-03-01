import Link from 'next/link';

const DEFAULT_BASE_URL = 'https://layoutsbylenny.com';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  locale: string;
  className?: string;
  baseUrl?: string;
}

export function Breadcrumbs({ items, locale, className = '', baseUrl }: BreadcrumbsProps) {
  const resolvedBaseUrl = baseUrl || DEFAULT_BASE_URL;

  // Build JSON-LD BreadcrumbList schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href && {
        item: item.href.startsWith('http') ? item.href : `${resolvedBaseUrl}${item.href}`,
      }),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={`mb-6 text-sm ${className}`}
      >
        <ol className="flex items-center gap-2 text-muted-foreground flex-wrap">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href ? (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
