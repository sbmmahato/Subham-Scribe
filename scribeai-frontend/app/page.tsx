'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import RecordingControls from '@/components/RecordingControls';
import SessionHistory from '@/components/SessionHistory';
import AuthButton from '@/components/AuthButton';

export default function Home() {
  const router = useRouter();
  
  // Use Better Auth's React hook for session management
  const { data: session, isPending: loading } = authClient.useSession();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !session) {
      router.push('/login');
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="w-full max-w-5xl mx-auto px-6 mb-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ScribeAI</h1>
          <AuthButton />
        </div>
      </div>
      <RecordingControls />
      <div className="mt-12">
        <SessionHistory />
      </div>
    </main>
  );
}
