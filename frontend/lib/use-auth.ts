// lib/use-auth.ts
import { useUser } from '@auth0/nextjs-auth0/client';
import { isAuthEnabled, mockUser } from './auth0-config';

export interface User {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  email_verified?: boolean;
  updated_at?: string;
}

export interface AuthState {
  user?: User;
  error?: Error;
  isLoading: boolean;
  checkSession: () => void;
}

export function useAuth(): AuthState {
  const auth0State = useUser();

  if (!isAuthEnabled) {
    // Return mock auth state for development
    return {
      user: mockUser,
      isLoading: false,
      checkSession: () => {},
    };
  }

  // Return actual Auth0 state for production
  return {
    user: auth0State.user as User | undefined,
    error: auth0State.error,
    isLoading: auth0State.isLoading,
    checkSession: auth0State.checkSession,
  };
}

// Authentication helper functions
export const getLoginUrl = (returnTo?: string) => {
  if (!isAuthEnabled) return '#'; // No-op for development

  const params = new URLSearchParams();
  if (returnTo) params.set('returnTo', returnTo);

  return `/api/auth/login${params.toString() ? `?${params}` : ''}`;
};

export const getLogoutUrl = (returnTo?: string) => {
  if (!isAuthEnabled) return '#'; // No-op for development

  const params = new URLSearchParams();
  if (returnTo) params.set('returnTo', returnTo);

  return `/api/auth/logout${params.toString() ? `?${params}` : ''}`;
};

// Check if user has admin role (customize based on your Auth0 setup)
export const hasAdminRole = (user?: User): boolean => {
  if (!user) return false;

  // In development mode, mock user is always admin
  if (!isAuthEnabled) return true;

  // Check for admin role in user metadata/claims
  // This depends on your Auth0 configuration
  const userRoles = (user as any)['https://inventory-system/roles'] || [];
  return userRoles.includes('admin');
};

// Check if user can edit assets
export const canEditAssets = (user?: User): boolean => {
  if (!user) return false;

  // In development mode, allow editing
  if (!isAuthEnabled) return true;

  // Check for editor or admin role
  const userRoles = (user as any)['https://inventory-system/roles'] || [];
  return userRoles.includes('admin') || userRoles.includes('editor');
};
