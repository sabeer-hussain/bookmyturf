'use client';

import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface GoogleButtonProps {
  onSuccess: (idToken: string) => Promise<void>;
  onError?: () => void;
}

export function GoogleButton({ onSuccess, onError }: GoogleButtonProps) {
  const handleSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      await onSuccess(response.credential);
    }
  };

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={onError}
        size="large"
        width="100%"
        text="signin_with"
        shape="rectangular"
      />
    </div>
  );
}
