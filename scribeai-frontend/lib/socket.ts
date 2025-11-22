/**
 * WebSocket client for real-time communication with ScribeAI server
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Initialize WebSocket connection
 */
export function initializeSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server');
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  return socket;
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Socket event types
 */
export interface SocketEvents {
  'session-status': {
    status: 'recording' | 'paused' | 'processing' | 'completed';
    sessionId: string;
    timestamp: number;
  };
  'chunk-processing': {
    chunkIndex: number;
    timestamp: number;
  };
  'transcription-update': {
    chunkIndex: number;
    text: string;
    timestamp: number;
    confidence?: number;
  };
  'transcription-error': {
    chunkIndex: number;
    error: string;
  };
  'session-complete': {
    sessionId: string;
    duration: number;
    transcript: string;
    summary: {
      summary: string;
      keyPoints: string[];
      actionItems: string[];
      decisions: string[];
    };
    timestamp: number;
  };
  error: {
    message: string;
  };
}
