import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AMENITIES,
  SURFACE_TYPES,
  INDIAN_STATES,
  TIME_SLOTS,
  UPLOAD_CONFIG,
} from '@/lib/constants';

// Mock api-client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Constants', () => {
  it('has 13 amenities with correct structure', () => {
    expect(AMENITIES).toHaveLength(13);
    AMENITIES.forEach((a) => {
      expect(a).toHaveProperty('value');
      expect(a).toHaveProperty('label');
      expect(a).toHaveProperty('icon');
    });
  });

  it('has amenities in correct order starting with drinking_water', () => {
    expect(AMENITIES[0].value).toBe('drinking_water');
    expect(AMENITIES[12].value).toBe('air_conditioned');
  });

  it('has 7 surface types', () => {
    expect(SURFACE_TYPES).toHaveLength(7);
    expect(SURFACE_TYPES[0].value).toBe('artificial_turf');
    expect(SURFACE_TYPES[6].value).toBe('mat');
  });

  it('has Indian states including Delhi and Chandigarh', () => {
    expect(INDIAN_STATES).toContain('Delhi');
    expect(INDIAN_STATES).toContain('Chandigarh');
    expect(INDIAN_STATES).toContain('Maharashtra');
    expect(INDIAN_STATES.length).toBeGreaterThanOrEqual(30);
  });

  it('has time slots from 00:00 to 23:30 in 30-min intervals', () => {
    expect(TIME_SLOTS[0]).toBe('00:00');
    expect(TIME_SLOTS[1]).toBe('00:30');
    expect(TIME_SLOTS[TIME_SLOTS.length - 1]).toBe('23:30');
    expect(TIME_SLOTS).toHaveLength(48);
    expect(TIME_SLOTS).toContain('06:00');
    expect(TIME_SLOTS).toContain('23:00');
  });

  it('has upload config with correct limits', () => {
    expect(UPLOAD_CONFIG.maxFiles).toBe(5);
    expect(UPLOAD_CONFIG.maxSizeBytes).toBe(5 * 1024 * 1024);
    expect(UPLOAD_CONFIG.acceptedTypes).toContain('image/jpeg');
    expect(UPLOAD_CONFIG.acceptedTypes).toContain('image/png');
    expect(UPLOAD_CONFIG.acceptedTypes).toContain('image/webp');
  });
});

describe('Venues Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports a valid page component', async () => {
    const { default: VenuesPage } = await import('@/app/(dashboard)/venues/page');
    expect(VenuesPage).toBeDefined();
    expect(typeof VenuesPage).toBe('function');
  });
});

describe('Venue Detail Page', () => {
  it('exports a valid page component', async () => {
    const { default: VenueDetailPage } = await import('@/app/(dashboard)/venues/[id]/page');
    expect(VenueDetailPage).toBeDefined();
    expect(typeof VenueDetailPage).toBe('function');
  });
});

describe('Court Detail Page', () => {
  it('exports a valid page component', async () => {
    const { default: CourtDetailPage } =
      await import('@/app/(dashboard)/venues/[id]/courts/[courtId]/page');
    expect(CourtDetailPage).toBeDefined();
    expect(typeof CourtDetailPage).toBe('function');
  });
});

describe('Form Modals', () => {
  it('exports VenueFormModal component', async () => {
    const { VenueFormModal } = await import('@/components/dashboard/venue-form-modal');
    expect(VenueFormModal).toBeDefined();
    expect(typeof VenueFormModal).toBe('function');
  });

  it('exports CourtFormModal component', async () => {
    const { CourtFormModal } = await import('@/components/dashboard/court-form-modal');
    expect(CourtFormModal).toBeDefined();
    expect(typeof CourtFormModal).toBe('function');
  });

  it('exports CourtSportFormModal component', async () => {
    const { CourtSportFormModal } = await import('@/components/dashboard/court-sport-form-modal');
    expect(CourtSportFormModal).toBeDefined();
    expect(typeof CourtSportFormModal).toBe('function');
  });
});

describe('Shared Components', () => {
  it('exports EmptyState component', async () => {
    const { EmptyState } = await import('@/components/shared/empty-state');
    expect(EmptyState).toBeDefined();
  });

  it('exports ConfirmDialog component', async () => {
    const { ConfirmDialog } = await import('@/components/shared/confirm-dialog');
    expect(ConfirmDialog).toBeDefined();
  });

  it('exports AmenitiesSelector component', async () => {
    const { AmenitiesSelector } = await import('@/components/shared/amenities-selector');
    expect(AmenitiesSelector).toBeDefined();
  });

  it('exports ImageUpload component', async () => {
    const { ImageUpload } = await import('@/components/shared/image-upload');
    expect(ImageUpload).toBeDefined();
  });

  it('exports PriceInput component', async () => {
    const { PriceInput } = await import('@/components/shared/price-input');
    expect(PriceInput).toBeDefined();
  });

  it('exports SurfaceTypeSelect component', async () => {
    const { SurfaceTypeSelect } = await import('@/components/shared/surface-type-select');
    expect(SurfaceTypeSelect).toBeDefined();
  });

  it('exports TimeSelect component', async () => {
    const { TimeSelect } = await import('@/components/shared/time-select');
    expect(TimeSelect).toBeDefined();
  });
});

describe('UI Components', () => {
  it('exports Dialog component', async () => {
    const { Dialog } = await import('@/components/ui/dialog');
    expect(Dialog).toBeDefined();
  });

  it('exports Checkbox component', async () => {
    const { Checkbox } = await import('@/components/ui/checkbox');
    expect(Checkbox).toBeDefined();
  });

  it('exports Skeleton components', async () => {
    const { Skeleton, CardSkeleton, ListSkeleton } = await import('@/components/ui/skeleton');
    expect(Skeleton).toBeDefined();
    expect(CardSkeleton).toBeDefined();
    expect(ListSkeleton).toBeDefined();
  });
});
