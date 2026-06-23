import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

// Mock API client
vi.mock('@/lib/api-client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setAccessToken: vi.fn(),
  getAccessToken: () => null,
}));

// Mock Google OAuth
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  GoogleLogin: () => <button data-testid="google-login">Sign in with Google</button>,
}));

import LoginPage from '@/app/(auth)/login/page';
import { AuthProvider } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
  );
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('No token'));
  });

  it('renders phone input and Google button', async () => {
    renderLogin();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('9876543210')).toBeInTheDocument();
      expect(screen.getByText('Send OTP')).toBeInTheDocument();
      expect(screen.getByTestId('google-login')).toBeInTheDocument();
    });
  });

  it('validates phone number length', async () => {
    renderLogin();
    await waitFor(() => screen.getByText('Send OTP'));
    const sendBtn = screen.getByText('Send OTP');
    expect(sendBtn).toBeDisabled();
  });

  it('sends OTP and shows OTP input', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { message: 'OTP sent' } },
    });
    renderLogin();
    await waitFor(() => screen.getByPlaceholderText('9876543210'));

    const input = screen.getByPlaceholderText('9876543210');
    fireEvent.change(input, { target: { value: '9876543210' } });
    fireEvent.click(screen.getByText('Send OTP'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/otp/send', { phone: '+919876543210' });
      expect(screen.getByText(/Enter OTP sent to/)).toBeInTheDocument();
    });
  });

  it('shows error on OTP send failure', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { message: 'Rate limit exceeded' } },
    });
    renderLogin();
    await waitFor(() => screen.getByPlaceholderText('9876543210'));

    const input = screen.getByPlaceholderText('9876543210');
    fireEvent.change(input, { target: { value: '9876543210' } });
    fireEvent.click(screen.getByText('Send OTP'));

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    });
  });
});
