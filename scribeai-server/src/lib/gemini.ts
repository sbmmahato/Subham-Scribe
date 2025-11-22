/**
 * Gemini API integration for audio transcription and summarization
 * Handles streaming transcription and post-processing summary generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Transcribe audio chunk using Gemini API
 * @param audioBuffer - Audio data in base64 or buffer format
 * @param chunkIndex - Sequential index for ordering
 * @returns Transcribed text
 */
export async function transcribeAudioChunk(
  audioBuffer: Buffer,
  chunkIndex: number
): Promise<{ text: string; confidence?: number }> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Convert buffer to base64
    const base64Audio = audioBuffer.toString('base64');

    const prompt = `Transcribe the following audio accurately. Include speaker diarization if multiple speakers are detected. Chunk ${chunkIndex}.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: base64Audio,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    return {
      text: text.trim(),
      confidence: 0.85, // Placeholder - Gemini doesn't return confidence scores directly
    };
  } catch (error) {
    console.error('Error transcribing audio chunk:', error);
    throw new Error(`Transcription failed for chunk ${chunkIndex}: ${error}`);
  }
}

/**
 * Generate summary from full transcript using Gemini
 * @param fullTranscript - Complete transcript text
 * @returns AI-generated summary with key points and action items
 */
export async function generateSummary(fullTranscript: string): Promise<{
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Analyze this meeting transcript and provide:
1. A concise summary (2-3 paragraphs)
2. Key points discussed (bullet points)
3. Action items identified (with owners if mentioned)
4. Decisions made

Format as JSON with fields: summary, keyPoints (array), actionItems (array), decisions (array).

Transcript:
${fullTranscript}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || text,
          keyPoints: parsed.keyPoints || [],
          actionItems: parsed.actionItems || [],
          decisions: parsed.decisions || [],
        };
      }
    } catch (parseError) {
      console.warn('Could not parse JSON from summary, returning raw text');
    }

    // Fallback if JSON parsing fails
    return {
      summary: text,
      keyPoints: [],
      actionItems: [],
      decisions: [],
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    throw new Error(`Summary generation failed: ${error}`);
  }
}

/**
 * Process audio with speaker diarization hints
 * @param audioBuffer - Audio data
 * @param speakerCount - Expected number of speakers (optional)
 */
export async function transcribeWithDiarization(
  audioBuffer: Buffer,
  speakerCount?: number
): Promise<{ text: string; speakers?: string[] }> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const base64Audio = audioBuffer.toString('base64');

    const prompt = `Transcribe this audio with speaker diarization. 
${speakerCount ? `Expected speakers: ${speakerCount}` : 'Detect number of speakers automatically.'}
Format: [Speaker 1]: <text>
[Speaker 2]: <text>`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: base64Audio,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Extract unique speakers
    const speakerMatches = text.match(/\[Speaker \d+\]/g);
    const speakers = speakerMatches
      ? [...new Set(speakerMatches)]
      : undefined;

    return {
      text: text.trim(),
      speakers,
    };
  } catch (error) {
    console.error('Error in diarization transcription:', error);
    throw error;
  }
}
