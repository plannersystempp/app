
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'coordinator' | 'financeiro' | 'user' | 'superadmin';

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  isApproved: boolean;
}

export interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: any }>;
  signup: (email: string, password: string, name: string) => Promise<{ error?: any }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}
