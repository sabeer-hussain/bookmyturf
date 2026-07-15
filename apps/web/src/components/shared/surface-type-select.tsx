'use client';

import { Select } from '@/components/ui/select';
import { SURFACE_TYPES } from '@/lib/constants';

interface SurfaceTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}

export function SurfaceTypeSelect({ value, onChange, id, className }: SurfaceTypeSelectProps) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">Select surface type</option>
      {SURFACE_TYPES.map(({ value: v, label }) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </Select>
  );
}
