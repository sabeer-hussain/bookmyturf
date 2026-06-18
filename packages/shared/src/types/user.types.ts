import { UserRole } from '../constants/enums';

export interface IUser {
  id: string;
  tenantId?: string | null;
  phone?: string | null;
  email?: string | null;
  firstName: string;
  lastName?: string | null;
  avatar?: string | null;
  role: UserRole;
  isActive: boolean;
}

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logo?: string | null;
  city?: string | null;
  state?: string | null;
  isActive: boolean;
  onboardingComplete: boolean;
}
