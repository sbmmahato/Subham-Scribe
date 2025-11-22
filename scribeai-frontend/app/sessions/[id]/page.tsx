/**
 * Session detail page
 * View complete transcript and summary for a session
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, Session, Transcript } from '@/lib/supabase';
import Link from 'next/link';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('Error loading session:', sessionError);
        return;
      }

      setSession(sessionData);

      // Load transcript
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (transcriptError) {
        console.error('Error loading transcript:', transcriptError);
        return;
      }

      setTranscript(transcriptData);
    } catch (err) {
      console.error('Failed to load session data:', err);
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

  const downloadTranscript = () => {
    if (!transcript) return;

    const content = `Session: ${session?.title}\nDate: ${formatDate(session?.created_at || '')}\nDuration: ${formatDuration(session?.duration || 0)}\n\n${transcript.full_text}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || !transcript) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session not found</h1>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  const summary = transcript.summary
    ? typeof transcript.summary === 'string'
      ? JSON.parse(transcript.summary)
      : transcript.summary
    : null;

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">{session.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{formatDate(session.created_at)}</span>
            <span>•</span>
            <span>{formatDuration(session.duration)}</span>
            <span>•</span>
            <span className="capitalize">
              {session.audio_source.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Summary</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-700">
                  {summary.summary}
                </p>
              </div>

              {summary.keyPoints && summary.keyPoints.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900">Key Points</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.keyPoints.map((point: string, idx: number) => (
                      <li
                        key={idx}
                        className="text-gray-700"
                      >
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.actionItems && summary.actionItems.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900">Action Items</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.actionItems.map((item: string, idx: number) => (
                      <li
                        key={idx}
                        className="text-gray-700"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.decisions && summary.decisions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-gray-900">Decisions</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {summary.decisions.map((decision: string, idx: number) => (
                      <li
                        key={idx}
                        className="text-gray-700"
                      >
                        {decision}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Transcript */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Full Transcript</h2>
            <button
              onClick={downloadTranscript}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Download
            </button>
          </div>
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap text-gray-700">
              {transcript.full_text}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
