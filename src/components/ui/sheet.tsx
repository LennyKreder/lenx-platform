'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface SheetContentProps {
  children: React.ReactNode;
  className?: string;
  side?: 'left' | 'right';
}

const SheetContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  children,
  asChild,
  className,
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error('SheetTrigger must be used within Sheet');

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => context.onOpenChange(true),
    });
  }

  return (
    <button className={className} onClick={() => context.onOpenChange(true)}>
      {children}
    </button>
  );
}

export function SheetContent({
  children,
  className,
  side = 'right',
}: SheetContentProps) {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error('SheetContent must be used within Sheet');

  const { open, onOpenChange } = context;
  const [mounted, setMounted] = React.useState(false);

  // Wait for client-side mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key and body scroll
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

  if (!open || !mounted) return null;

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-black/80"
        onClick={() => onOpenChange(false)}
      />
      {/* Sheet */}
      <div
        className={cn(
          'fixed z-[9999] bg-white dark:bg-zinc-950 shadow-lg',
          'flex flex-col',
          'animate-in',
          side === 'right' && 'inset-y-0 right-0 h-full w-full sm:w-[400px] border-l slide-in-from-right',
          side === 'left' && 'inset-y-0 left-0 h-full w-full sm:w-[400px] border-r slide-in-from-left',
          className
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </>
  );

  return createPortal(content, document.body);
}

export function SheetHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-6 py-4 border-b', className)}>
      {children}
    </div>
  );
}

export function SheetTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn('text-lg font-semibold', className)}>
      {children}
    </h2>
  );
}

export function SheetDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
}

export function SheetFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-6 py-4 border-t mt-auto', className)}>
      {children}
    </div>
  );
}
