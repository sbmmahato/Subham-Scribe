/**
 * Recording controls component
 * Handles audio source selection and recording state management
 */

'use client';

import { useState, useEffect } from 'react';
import { useAudioRecorder, AudioSource } from '@/hooks/useAudioRecorder';
import { getSocket, initializeSocket, SocketEvents } from '@/lib/socket';
import { authClient } from '@/lib/auth-client';
import { v4 as uuidv4 } from 'uuid';

export default function RecordingControls() {
  const [sessionId, setSessionId] = useState<string>('');
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [sessionComplete, setSessionComplete] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const {
    status,
    error,
    duration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useAudioRecorder({
    sessionId,
    audioSource,
    userId: userId || undefined,
    chunkDuration: 30000, // 30 seconds
  });

  // Get user session using Better Auth React hook
  const { data: session } = authClient.useSession();
  
  useEffect(() => {
    setUserId(session?.user?.id || null);
  }, [session]);

  // Initialize session ID
  useEffect(() => {
    setSessionId(uuidv4());
  }, []);

  // Setup socket listeners
  useEffect(() => {
    const socket = initializeSocket();

    socket.on('transcription-update', (data: SocketEvents['transcription-update']) => {
      setLiveTranscript((prev) => prev + ' ' + data.text);
      console.log('Transcription update:', data);
    });

    socket.on('session-status', (data: SocketEvents['session-status']) => {
      setProcessingStatus(`Status: ${data.status}`);
      console.log('Session status:', data);
    });

    socket.on('chunk-processing', (data: SocketEvents['chunk-processing']) => {
      setProcessingStatus(`Processing chunk ${data.chunkIndex}...`);
    });

    socket.on('session-complete', (data: SocketEvents['session-complete']) => {
      setSessionComplete(true);
      setSummary(data.summary);
      setProcessingStatus('Session completed!');
      console.log('Session complete:', data);
    });

    socket.on('transcription-error', (data: SocketEvents['transcription-error']) => {
      console.error('Transcription error:', data);
    });

    socket.on('error', (data: SocketEvents['error']) => {
      console.error('Socket error:', data.message);
    });

    return () => {
      socket.off('transcription-update');
      socket.off('session-status');
      socket.off('chunk-processing');
      socket.off('session-complete');
      socket.off('transcription-error');
      socket.off('error');
    };
  }, []);

  const handleStartNewSession = () => {
    setSessionId(uuidv4());
    setLiveTranscript('');
    setProcessingStatus('');
    setSessionComplete(false);
    setSummary(null);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-6 space-y-6">
      {/* Audio Source Selection */}
      {status === 'idle' && !sessionComplete && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Select Audio Source</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setAudioSource('microphone')}
              className={`flex-1 py-4 px-6 rounded-lg border-2 transition-all ${
                audioSource === 'microphone'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">🎤</div>
                <div className="font-semibold text-gray-900">Microphone</div>
                <div className="text-sm text-gray-600">
                  Record from your mic
                </div>
              </div>
            </button>
            <button
              onClick={() => setAudioSource('tab_share')}
              className={`flex-1 py-4 px-6 rounded-lg border-2 transition-all ${
                audioSource === 'tab_share'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">🖥️</div>
                <div className="font-semibold text-gray-900">Tab Share</div>
                <div className="text-sm text-gray-600">
                  Capture meeting audio
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-mono font-bold text-gray-900">
              {formatDuration(duration)}
            </div>
            <div className="text-sm text-gray-600">
              Duration
            </div>
          </div>
          <div>
            <div
              className={`px-4 py-2 rounded-full font-semibold text-sm ${
                status === 'recording'
                  ? 'bg-red-100 text-red-700'
                  : status === 'paused'
                  ? 'bg-yellow-100 text-yellow-700'
                  : status === 'processing'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3 justify-center">
          {status === 'idle' && (
            <button
              onClick={startRecording}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Start Recording
            </button>
          )}

          {status === 'recording' && (
            <>
              <button
                onClick={pauseRecording}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
              >
                Pause
              </button>
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Stop & Process
              </button>
            </>
          )}

          {status === 'paused' && (
            <>
              <button
                onClick={resumeRecording}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Resume
              </button>
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Stop & Process
              </button>
            </>
          )}

          {status === 'processing' && (
            <div className="text-center py-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <div className="mt-2 text-sm text-gray-600">
                {processingStatus}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {typeof error === 'string' ? error : error?.message || 'An error occurred'}
          </div>
        )}
      </div>

      {/* Live Transcript */}
      {liveTranscript && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">Live Transcript</h2>
          <div className="max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="whitespace-pre-wrap text-gray-700">{liveTranscript}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      {sessionComplete && summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Session Summary</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-gray-900">Summary</h3>
              <p className="text-gray-700">{summary.summary}</p>
            </div>

            {summary.keyPoints && summary.keyPoints.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-gray-900">Key Points</h3>
                <ul className="list-disc list-inside space-y-1">
                  {summary.keyPoints.map((point: string, idx: number) => (
                    <li key={idx} className="text-gray-700">
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
                    <li key={idx} className="text-gray-700">
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
                    <li key={idx} className="text-gray-700">
                      {decision}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={handleStartNewSession}
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Start New Session
          </button>
        </div>
      )}
    </div>
  );
}
