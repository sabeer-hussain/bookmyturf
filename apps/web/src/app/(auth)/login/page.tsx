'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PhoneInput } from '@/components/auth/phone-input';
import { OtpInput } from '@/components/auth/otp-input';
import { GoogleButton } from '@/components/auth/google-button';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';

function LoginContent() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSendOtp = async (phoneNumber: string) => {
    await api.post('/auth/otp/send', { phone: phoneNumber });
    setPhone(phoneNumber);
    setStep('otp');
  };

  const handleVerifyOtp = async (code: string) => {
    const { data } = await api.post('/auth/otp/verify', { phone, code });
    login(data.data.accessToken, data.data.refreshToken, data.data.user);
    router.push(callbackUrl);
  };

  const handleResendOtp = async () => {
    await api.post('/auth/otp/send', { phone });
  };

  const handleGoogleLogin = async (idToken: string) => {
    const { data } = await api.post('/auth/google', { idToken });
    login(data.data.accessToken, data.data.refreshToken, data.data.user);
    router.push(callbackUrl);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">BookMyTurf</CardTitle>
          <CardDescription>
            {step === 'phone' ? 'Sign in to book your favourite turf' : 'Verify your phone number'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' ? (
            <>
              <PhoneInput onSubmit={handleSendOtp} />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <GoogleButton onSuccess={handleGoogleLogin} />
            </>
          ) : (
            <OtpInput
              phone={phone}
              onSubmit={handleVerifyOtp}
              onResend={handleResendOtp}
              onBack={() => setStep('phone')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
