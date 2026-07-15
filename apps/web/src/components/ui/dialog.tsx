'use client';

import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = 'md',
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  // Focus dialog on initial open only
  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-50 w-full rounded-lg border bg-background p-6 shadow-lg',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          'max-h-[90vh] overflow-y-auto',
          sizeClasses[size],
          className,
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        {(title || description) && (
          <div className="mb-4">
            {title && (
              <h2 id="dialog-title" className="text-lg font-semibold leading-none tracking-tight">
                {title}
              </h2>
            )}
            {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
