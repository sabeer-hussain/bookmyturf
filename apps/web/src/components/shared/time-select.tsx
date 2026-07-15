'use client';

import { Select } from '@/components/ui/select';
import { TIME_SLOTS } from '@/lib/constants';

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  className?: string;
}

export function TimeSelect({ value, onChange, id, required, className }: TimeSelectProps) {
  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={className}
    >
      <option value="">Select time</option>
      {TIME_SLOTS.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </Select>
  );
}
