import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/settings/billing',
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/lib/api-client', () => ({
  api: { post: vi.fn(), get: vi.fn(), patch: vi.fn() },
  setAccessToken: vi.fn(),
  getAccessToken: () => 'token',
}));

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: any) => <>{children}</>,
}));

import { api } from '@/lib/api-client';

describe('Billing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/plans') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'p1',
                name: 'Starter',
                description: 'Basic plan',
                monthlyPrice: 999,
                maxVenues: 3,
                maxCourts: 5,
                maxStaff: 3,
                features: { booking: true, analytics: false },
              },
              {
                id: 'p2',
                name: 'Pro',
                description: 'Growth plan',
                monthlyPrice: 2499,
                maxVenues: 10,
                maxCourts: 25,
                maxStaff: 10,
                features: { booking: true, analytics: true },
              },
            ],
          },
        });
      }
      if (url === '/subscriptions/current') {
        return Promise.resolve({
          data: {
            data: {
              planId: 'p1',
              planName: 'Starter',
              status: 'TRIAL',
              trialDaysLeft: 10,
            },
          },
        });
      }
      return Promise.reject(new Error('not found'));
    });
  });

  it('renders plan cards with pricing', async () => {
    const { default: BillingPage } = await import('@/app/(dashboard)/settings/billing/page');
    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Starter').length).toBeGreaterThan(0);
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('₹999')).toBeInTheDocument();
      expect(screen.getByText('₹2499')).toBeInTheDocument();
    });
  });

  it('shows current plan badge', async () => {
    const { default: BillingPage } = await import('@/app/(dashboard)/settings/billing/page');
    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('Your Plan')).toBeInTheDocument();
      expect(screen.getByText('TRIAL')).toBeInTheDocument();
    });
  });
});
