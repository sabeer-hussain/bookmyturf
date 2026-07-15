'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { AMENITIES } from '@/lib/constants';

interface AmenitiesSelectorProps {
  selected: string[];
  onChange: (amenities: string[]) => void;
}

export function AmenitiesSelector({ selected, onChange }: AmenitiesSelectorProps) {
  const handleToggle = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selected, value]);
    } else {
      onChange(selected.filter((a) => a !== value));
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {AMENITIES.map(({ value, label, icon: Icon }) => (
        <Checkbox
          key={value}
          checked={selected.includes(value)}
          onChange={(checked) => handleToggle(value, checked)}
          label={label}
          icon={<Icon className="h-4 w-4" />}
        />
      ))}
    </div>
  );
}
