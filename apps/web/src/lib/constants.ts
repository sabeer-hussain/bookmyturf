import {
  Droplets,
  Bath,
  DoorOpen,
  Car,
  Lightbulb,
  Armchair,
  Cctv,
  Cross,
  Coffee,
  Footprints,
  Dumbbell,
  Wifi,
  Wind,
  type LucideIcon,
} from 'lucide-react';

// ─────────────────────────────────────────────
// INDIAN STATES & UNION TERRITORIES
// ─────────────────────────────────────────────

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Chandigarh',
  'Jammu & Kashmir',
  'Ladakh',
  'Puducherry',
  'Andaman & Nicobar Islands',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Lakshadweep',
] as const;

// ─────────────────────────────────────────────
// VENUE AMENITIES
// ─────────────────────────────────────────────

export interface AmenityOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

export const AMENITIES: AmenityOption[] = [
  { value: 'drinking_water', label: 'Drinking Water', icon: Droplets },
  { value: 'washroom', label: 'Washroom', icon: Bath },
  { value: 'changing_room', label: 'Changing Room', icon: DoorOpen },
  { value: 'parking', label: 'Parking', icon: Car },
  { value: 'floodlights', label: 'Floodlights', icon: Lightbulb },
  { value: 'seating_area', label: 'Seating Area', icon: Armchair },
  { value: 'cctv', label: 'CCTV', icon: Cctv },
  { value: 'first_aid', label: 'First Aid', icon: Cross },
  { value: 'cafeteria', label: 'Cafeteria', icon: Coffee },
  { value: 'shoe_rental', label: 'Shoe Rental', icon: Footprints },
  { value: 'equipment_rental', label: 'Equipment Rental', icon: Dumbbell },
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'air_conditioned', label: 'Air Conditioned', icon: Wind },
];

// ─────────────────────────────────────────────
// COURT SURFACE TYPES
// ─────────────────────────────────────────────

export interface SurfaceTypeOption {
  value: string;
  label: string;
}

export const SURFACE_TYPES: SurfaceTypeOption[] = [
  { value: 'artificial_turf', label: 'Artificial Turf' },
  { value: 'natural_grass', label: 'Natural Grass' },
  { value: 'synthetic_flooring', label: 'Synthetic Flooring' },
  { value: 'wooden', label: 'Wooden' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'acrylic', label: 'Acrylic' },
  { value: 'mat', label: 'Mat' },
];

// ─────────────────────────────────────────────
// TIME SLOTS (for open/close time dropdowns)
// ─────────────────────────────────────────────

export const TIME_SLOTS: string[] = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

// ─────────────────────────────────────────────
// FILE UPLOAD CONSTRAINTS
// ─────────────────────────────────────────────

export const UPLOAD_CONFIG = {
  maxFiles: 5,
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  maxSizeMB: 5,
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  acceptedExtensions: '.jpg,.jpeg,.png,.webp',
} as const;
