/**
 * Supabase client configuration
 * Handles database connections for session and transcript storage
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials not configured. Database features will be limited.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || '',
  {
    auth: {
      persistSession: false
    }
  }
);

/**
 * Database Types
 */
export interface Session {
  id: string;
  user_id?: string;
  title: string;
  duration: number;
  status: 'recording' | 'paused' | 'processing' | 'completed' | 'failed';
  audio_source: 'microphone' | 'tab_share';
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Transcript {
  id: string;
  session_id: string;
  full_text: string;
  summary?: string;
  speakers?: string[];
  created_at: string;
  updated_at: string;
}

export interface TranscriptChunk {
  id: string;
  session_id: string;
  chunk_index: number;
  text: string;
  timestamp: number;
  confidence?: number;
  created_at: string;
}
