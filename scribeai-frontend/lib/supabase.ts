/**
 * Supabase client configuration for frontend
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate configuration
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not configured');
  console.error('   Please set it in your .env.local file');
  console.error('   Get it from: Supabase Dashboard > Settings > API > Project URL');
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured');
  console.error('   Please set it in your .env.local file');
  console.error('   Get it from: Supabase Dashboard > Settings > API > anon public key');
}

if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL format is incorrect');
  console.error('   Expected format: https://[PROJECT-REF].supabase.co');
  console.error('   Current value:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  summary?: {
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    decisions: string[];
  };
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
