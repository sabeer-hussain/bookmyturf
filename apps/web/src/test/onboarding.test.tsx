import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/bookings',
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/lib/api-client', () => ({
  api: { post: vi.fn(), get: vi.fn(), patch: vi.fn() },
  setAccessToken: vi.fn(),
  getAccessToken: () => 'token',
}));

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: any) => <>{children}</>,
  GoogleLogin: () => <button>Google</button>,
}));

import { api } from '@/lib/api-client';

describe('Onboarding Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: { id: 'u1', firstName: 'Test', role: 'CUSTOMER', tenantId: null } },
    });
  });

  it('renders step 1 with business name field', async () => {
    const { default: OnboardingPage } = await import('@/app/onboarding/page');
    const { AuthProvider } = await import('@/contexts/auth-context');
    const { ToastProvider } = await import('@/components/ui/toast');

    render(
      <AuthProvider>
        <ToastProvider>
          <OnboardingPage />
        </ToastProvider>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Set Up Your Business')).toBeInTheDocument();
      expect(screen.getByText('Business Info')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., Sport Arena')).toBeInTheDocument();
    });
  });

  it('Next button disabled with invalid email', async () => {
    const { default: OnboardingPage } = await import('@/app/onboarding/page');
    const { AuthProvider } = await import('@/contexts/auth-context');
    const { ToastProvider } = await import('@/components/ui/toast');

    render(
      <AuthProvider>
        <ToastProvider>
          <OnboardingPage />
        </ToastProvider>
      </AuthProvider>,
    );

    await waitFor(() => screen.getByPlaceholderText('e.g., Sport Arena'));

    fireEvent.change(screen.getByPlaceholderText('e.g., Sport Arena'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('9876543210'), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText('owner@business.com'), {
      target: { value: 'invalid-email' },
    });

    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('Next button enabled with valid email', async () => {
    const { default: OnboardingPage } = await import('@/app/onboarding/page');
    const { AuthProvider } = await import('@/contexts/auth-context');
    const { ToastProvider } = await import('@/components/ui/toast');

    render(
      <AuthProvider>
        <ToastProvider>
          <OnboardingPage />
        </ToastProvider>
      </AuthProvider>,
    );

    await waitFor(() => screen.getByPlaceholderText('e.g., Sport Arena'));

    fireEvent.change(screen.getByPlaceholderText('e.g., Sport Arena'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('9876543210'), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText('owner@business.com'), {
      target: { value: 'test@valid.com' },
    });

    expect(screen.getByText('Next')).not.toBeDisabled();
  });
});

describe('Dashboard Layout', () => {
  it('exports a valid layout component', async () => {
    const { default: DashboardLayout } = await import('@/app/(dashboard)/layout');
    expect(DashboardLayout).toBeDefined();
    expect(typeof DashboardLayout).toBe('function');
  });
});
