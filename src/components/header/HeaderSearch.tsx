'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { getLocaleFromPathname } from '@/lib/i18n';

interface HeaderSearchProps {
  placeholder?: string;
  onSearch?: () => void;
  variant?: 'desktop' | 'mobile';
}

export function HeaderSearch({
  placeholder = 'Search products...',
  onSearch,
  variant = 'desktop'
}: HeaderSearchProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/${locale}/shop?search=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setIsExpanded(false);
      onSearch?.();
    }
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setQuery('');
  };

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        handleCollapse();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Desktop variant - inline search bar
  if (variant === 'desktop') {
    return (
      <form onSubmit={handleSearch} className="flex items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4 w-[200px] lg:w-[280px] xl:w-[320px] h-9"
          />
        </div>
      </form>
    );
  }

  // Mobile variant - icon that expands to fullscreen search
  return (
    <>
      {!isExpanded ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExpand}
          className="h-9 w-9"
        >
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>
      ) : (
        <form
          onSubmit={handleSearch}
          className="fixed inset-x-0 top-0 z-[60] bg-background border-b p-3 flex items-center gap-2 animate-in slide-in-from-top"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-4 w-full h-10"
              autoFocus
            />
          </div>
          <Button type="submit" size="sm" disabled={!query.trim()}>
            Search
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleCollapse}
            className="h-10 w-10 shrink-0"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </form>
      )}
    </>
  );
}
