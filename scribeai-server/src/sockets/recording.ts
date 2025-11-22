/**
 * Socket.io event handlers for real-time audio streaming and transcription
 * Manages recording sessions, audio chunk processing, and state broadcasts
 */

import { Server, Socket } from 'socket.io';
import { supabase, Session, TranscriptChunk } from '../lib/supabase';
import { transcribeAudioChunk, generateSummary } from '../lib/gemini';

interface SessionData {
  sessionId: string;
  userId?: string;
  audioChunks: Buffer[];
  transcriptChunks: string[];
  chunkIndex: number;
  startTime: number;
  pausedAt?: number;
  totalPausedDuration: number;
  audioSource: 'microphone' | 'tab_share';
}

// Store active sessions in memory
const activeSessions = new Map<string, SessionData>();

/**
 * Setup all Socket.io event handlers
 */
export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    /**
     * Start new recording session
     */
    socket.on('start-session', async (data: {
      sessionId: string;
      userId?: string;
      audioSource: 'microphone' | 'tab_share';
      title?: string;
    }) => {
      try {
        const { sessionId, userId, audioSource, title } = data;

        // Initialize session data
        const sessionData: SessionData = {
          sessionId,
          userId,
          audioChunks: [],
          transcriptChunks: [],
          chunkIndex: 0,
          startTime: Date.now(),
          totalPausedDuration: 0,
          audioSource,
        };

        activeSessions.set(sessionId, sessionData);

        // Create session in database
        const { error } = await supabase.from('sessions').insert({
          id: sessionId,
          user_id: userId,
          title: title || `Session ${new Date().toLocaleDateString()}`,
          status: 'recording',
          audio_source: audioSource,
          duration: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) {
          console.error('Database error creating session:', error);
        }

        socket.join(sessionId);
        io.to(sessionId).emit('session-status', {
          status: 'recording',
          sessionId,
          timestamp: Date.now(),
        });

        console.log(`📝 Session started: ${sessionId} (${audioSource})`);
      } catch (error) {
        console.error('Error starting session:', error);
        socket.emit('error', { message: 'Failed to start session' });
      }
    });

    /**
     * Receive and process audio chunks
     */
    socket.on('audio-chunk', async (data: {
      sessionId: string;
      chunk: ArrayBuffer;
      timestamp: number;
    }) => {
      try {
        const { sessionId, chunk, timestamp } = data;
        const session = activeSessions.get(sessionId);

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        const buffer = Buffer.from(chunk);
        session.audioChunks.push(buffer);

        // Process transcription for this chunk
        const chunkIndex = session.chunkIndex++;
        
        // Emit processing status
        io.to(sessionId).emit('chunk-processing', {
          chunkIndex,
          timestamp,
        });

        // Transcribe chunk (async)
        transcribeAudioChunk(buffer, chunkIndex)
          .then(async (result) => {
            session.transcriptChunks.push(result.text);

            // Store chunk in database
            const { error } = await supabase.from('transcript_chunks').insert({
              session_id: sessionId,
              chunk_index: chunkIndex,
              text: result.text,
              timestamp,
              confidence: result.confidence,
              created_at: new Date().toISOString(),
            });

            if (error) {
              console.error('Error saving transcript chunk:', error);
            }

            // Emit live transcription update
            io.to(sessionId).emit('transcription-update', {
              chunkIndex,
              text: result.text,
              timestamp,
              confidence: result.confidence,
            });

            console.log(`📄 Chunk ${chunkIndex} transcribed for ${sessionId}`);
          })
          .catch((error) => {
            console.error(`Error transcribing chunk ${chunkIndex}:`, error);
            io.to(sessionId).emit('transcription-error', {
              chunkIndex,
              error: error.message,
            });
          });
      } catch (error) {
        console.error('Error processing audio chunk:', error);
        socket.emit('error', { message: 'Failed to process audio chunk' });
      }
    });

    /**
     * Pause recording session
     */
    socket.on('pause-session', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        const session = activeSessions.get(sessionId);

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        session.pausedAt = Date.now();

        // Update database
        await supabase.from('sessions').update({
          status: 'paused',
          updated_at: new Date().toISOString(),
        }).eq('id', sessionId);

        io.to(sessionId).emit('session-status', {
          status: 'paused',
          sessionId,
          timestamp: Date.now(),
        });

        console.log(`⏸️  Session paused: ${sessionId}`);
      } catch (error) {
        console.error('Error pausing session:', error);
        socket.emit('error', { message: 'Failed to pause session' });
      }
    });

    /**
     * Resume recording session
     */
    socket.on('resume-session', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        const session = activeSessions.get(sessionId);

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        if (session.pausedAt) {
          session.totalPausedDuration += Date.now() - session.pausedAt;
          session.pausedAt = undefined;
        }

        // Update database
        await supabase.from('sessions').update({
          status: 'recording',
          updated_at: new Date().toISOString(),
        }).eq('id', sessionId);

        io.to(sessionId).emit('session-status', {
          status: 'recording',
          sessionId,
          timestamp: Date.now(),
        });

        console.log(`▶️  Session resumed: ${sessionId}`);
      } catch (error) {
        console.error('Error resuming session:', error);
        socket.emit('error', { message: 'Failed to resume session' });
      }
    });

    /**
     * Stop recording and process final summary
     */
    socket.on('stop-session', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        const session = activeSessions.get(sessionId);

        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Calculate total duration
        const duration = Math.floor(
          (Date.now() - session.startTime - session.totalPausedDuration) / 1000
        );

        // Update status to processing
        await supabase.from('sessions').update({
          status: 'processing',
          duration,
          updated_at: new Date().toISOString(),
        }).eq('id', sessionId);

        io.to(sessionId).emit('session-status', {
          status: 'processing',
          sessionId,
          timestamp: Date.now(),
        });

        console.log(`🔄 Processing session: ${sessionId}`);

        // Wait a bit for final chunks to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Combine all transcript chunks
        const fullTranscript = session.transcriptChunks.join(' ');

        // Generate summary
        const summaryData = await generateSummary(fullTranscript);

        // Store full transcript and summary
        const { error: transcriptError } = await supabase.from('transcripts').insert({
          session_id: sessionId,
          full_text: fullTranscript,
          summary: JSON.stringify(summaryData),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (transcriptError) {
          console.error('Error saving transcript:', transcriptError);
        }

        // Update session to completed
        await supabase.from('sessions').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', sessionId);

        // Emit completion with summary
        io.to(sessionId).emit('session-complete', {
          sessionId,
          duration,
          transcript: fullTranscript,
          summary: summaryData,
          timestamp: Date.now(),
        });

        console.log(`✅ Session completed: ${sessionId}`);

        // Clean up
        activeSessions.delete(sessionId);
      } catch (error) {
        console.error('Error stopping session:', error);
        
        // Mark as failed
        const session = activeSessions.get(data.sessionId);
        if (session) {
          await supabase.from('sessions').update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          }).eq('id', data.sessionId);
        }

        socket.emit('error', { message: 'Failed to complete session processing' });
      }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      
      // Handle orphaned sessions (auto-pause if recording)
      activeSessions.forEach((session, sessionId) => {
        if (!session.pausedAt) {
          session.pausedAt = Date.now();
          supabase.from('sessions').update({
            status: 'paused',
            updated_at: new Date().toISOString(),
          }).eq('id', sessionId);
          
          console.log(`⚠️  Auto-paused orphaned session: ${sessionId}`);
        }
      });
    });
  });
}
