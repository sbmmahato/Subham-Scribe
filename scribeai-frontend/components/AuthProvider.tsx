/**
 * Auth Provider Component
 * Provides authentication state to child components
 */

'use client';

import { authClient } from '@/lib/auth-client';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  // Use Better Auth's React hook - it handles loading and session state automatically
  const { isPending: loading } = authClient.useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}

