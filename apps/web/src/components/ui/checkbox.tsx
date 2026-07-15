'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onChange, label, icon, disabled, className }: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
        checked
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-input hover:border-primary/50 hover:bg-accent',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      {icon && <span className="shrink-0">{icon}</span>}
      {label && <span className="leading-none">{label}</span>}
    </label>
  );
}
