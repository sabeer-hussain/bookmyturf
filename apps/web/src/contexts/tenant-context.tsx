'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logo: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  isActive: boolean;
  onboardingComplete: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTenant = useCallback(async () => {
    if (!user?.tenantId) {
      setTenant(null);
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await api.get(`/tenants/${user.tenantId}`);
      setTenant(data.data);
    } catch {
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      fetchTenant();
    }
  }, [isAuthenticated, user?.tenantId, fetchTenant]);

  const value = useMemo(
    () => ({ tenant, isLoading, refetch: fetchTenant }),
    [tenant, isLoading, fetchTenant],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
}
