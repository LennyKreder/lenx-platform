'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface CTAWidgetProps {
  href: string;
  text: string;
  locale: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  fullWidth?: boolean;
}

export function CTAWidget({
  href,
  text,
  locale,
  variant = 'default',
  size = 'lg',
  fullWidth = false,
}: CTAWidgetProps) {
  // If href is relative and doesn't start with locale, add it
  const fullHref = href.startsWith('http') || href.startsWith(`/${locale}`)
    ? href
    : `/${locale}${href.startsWith('/') ? href : `/${href}`}`;

  const isExternal = href.startsWith('http');

  return (
    <div className={`my-6 ${fullWidth ? 'w-full' : 'inline-block'}`}>
      {isExternal ? (
        <a href={fullHref} target="_blank" rel="noopener noreferrer">
          <Button variant={variant} size={size} className={fullWidth ? 'w-full' : ''}>
            {text}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </a>
      ) : (
        <Link href={fullHref}>
          <Button variant={variant} size={size} className={fullWidth ? 'w-full' : ''}>
            {text}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}
