'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface PriceInputProps {
  value: number | string;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
}

export function PriceInput({
  value,
  onChange,
  placeholder = '0',
  className,
  required,
  id,
}: PriceInputProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <span className="absolute left-3 text-sm font-medium text-muted-foreground">₹</span>
      <input
        id={id}
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === '' ? undefined : parseFloat(val));
        }}
        placeholder={placeholder}
        required={required}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm ring-offset-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
        )}
      />
    </div>
  );
}
