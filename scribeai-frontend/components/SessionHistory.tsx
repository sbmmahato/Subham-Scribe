/**
 * Session history component
 * Displays list of past recording sessions with preview
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase, Session, Transcript } from '@/lib/supabase';
import { authClient } from '@/lib/auth-client';
import Link from 'next/link';

export default function SessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use Better Auth React hook for session management
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id || null;

  useEffect(() => {
    if (userId) {
      loadSessions(userId);
    } else {
      setLoading(false);
    }
  }, [userId]);

  const loadSessions = async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading sessions:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        setSessions([]); // Set empty array on error
        return;
      }

      setSessions(data || []);
    } catch (err: any) {
      console.error('Failed to load sessions:', err?.message || err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'recording':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Session History</h2>
        <button
          onClick={() => userId && loadSessions(userId)}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200"
        >
          Refresh
        </button>
      </div>

      {!userId ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">Please sign in to view your sessions</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">No sessions yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Start your first recording to see it here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 text-gray-900">{session.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>{formatDate(session.created_at)}</span>
                    <span>•</span>
                    <span>{formatDuration(session.duration)}</span>
                    <span>•</span>
                    <span className="capitalize">
                      {session.audio_source.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                      session.status
                    )}`}
                  >
                    {session.status}
                  </span>
                  {session.status === 'completed' && (
                    <Link
                      href={`/sessions/${session.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
