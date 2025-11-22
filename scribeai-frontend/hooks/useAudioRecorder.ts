/**
 * Audio recording hook with chunked streaming
 * Supports microphone and tab/screen share audio capture
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { getSocket, initializeSocket } from '@/lib/socket';

export type AudioSource = 'microphone' | 'tab_share';
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'processing' | 'completed';

interface UseAudioRecorderOptions {
  sessionId: string;
  audioSource: AudioSource;
  userId?: string;
  chunkDuration?: number; // milliseconds, default 30000 (30s)
}

export function useAudioRecorder({
  sessionId,
  audioSource,
  userId,
  chunkDuration = 30000,
}: UseAudioRecorderOptions) {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  /**
   * Request media stream based on audio source
   */
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      if (audioSource === 'microphone') {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        // Tab/screen share with audio - must include video
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          } as any,
        });
        
        // If we only want audio, we can remove video tracks after getting the stream
        // But keeping video might be useful for recording entire meetings
        return displayStream;
      }
    } catch (err) {
      throw new Error(`Failed to access ${audioSource}: ${err}`);
    }
  }, [audioSource]);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const socket = initializeSocket();

      // Get media stream
      const stream = await getMediaStream();
      streamRef.current = stream;

      // Determine best supported MIME type
      let mimeType = '';
      const possibleTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'audio/webm;codecs=opus',
        'audio/webm',
        'video/mp4',
        'audio/mp4'
      ];

      for (const type of possibleTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      if (!mimeType) {
        throw new Error('No supported MediaRecorder MIME type found');
      }

      console.log('Using MIME type:', mimeType);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handle data available (chunk ready)
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);

          // Convert blob to ArrayBuffer and send via socket
          event.data.arrayBuffer().then((buffer) => {
            socket.emit('audio-chunk', {
              sessionId,
              chunk: buffer,
              timestamp: Date.now(),
            });
          });
        }
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        stopRecording();
      };

      // Handle stream end (e.g., user stops sharing)
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          console.log('Media track ended');
          stopRecording();
        };
      });

      // Start recording with time slicing
      mediaRecorder.start(chunkDuration);

      // Notify server
      socket.emit('start-session', {
        sessionId,
        userId,
        audioSource,
        title: `Session ${new Date().toLocaleString()}`,
      });

      setStatus('recording');
      startTimeRef.current = Date.now();

      // Start duration timer
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current;
        setDuration(Math.floor(elapsed / 1000));
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      console.error('Error starting recording:', err);
    }
  }, [sessionId, audioSource, chunkDuration, getMediaStream]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.pause();
      pausedAtRef.current = Date.now();
      setStatus('paused');

      const socket = getSocket();
      socket?.emit('pause-session', { sessionId });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [sessionId, status]);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'paused') {
      mediaRecorderRef.current.resume();
      pausedDurationRef.current += Date.now() - pausedAtRef.current;
      setStatus('recording');

      const socket = getSocket();
      socket?.emit('resume-session', { sessionId });

      // Restart duration timer
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedDurationRef.current;
        setDuration(Math.floor(elapsed / 1000));
      }, 1000);
    }
  }, [sessionId, status]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setStatus('processing');

      const socket = getSocket();
      socket?.emit('stop-session', { sessionId });

      // Clean up
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      mediaRecorderRef.current = null;
    }
  }, [sessionId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    status,
    error,
    duration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
}
