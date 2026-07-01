'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface OtpInputProps {
  phone: string;
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
}

export function OtpInput({ phone, onSubmit, onResend, onBack }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < 5) inputRefs.current[index + 1]?.focus();

    const code = newOtp.join('');
    if (code.length === 6) handleSubmit(code);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (code: string) => {
    setIsLoading(true);
    setError('');
    try {
      await onSubmit(code);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    await onResend();
    setCountdown(30);
    setOtp(Array(6).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Enter OTP sent to {phone.replace(/^\+91(\d+)$/, '+91 $1')}</Label>
        <div className="flex justify-center gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className="h-12 w-12 rounded-md border border-input bg-background text-center text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              aria-label={`OTP digit ${index + 1}`}
            />
          ))}
        </div>
        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        {isLoading && (
          <div className="flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isLoading}>
          Change number
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={countdown > 0 || isLoading}
        >
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
        </Button>
      </div>
    </div>
  );
}
