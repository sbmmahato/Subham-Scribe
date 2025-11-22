# ScribeAI - AI-Powered Audio Transcription App

A full-stack real-time audio transcription tool built with Next.js, Node.js, TypeScript, Supabase, and Google Gemini AI.

## 🚀 Features

- **Real-time Audio Transcription**: Capture and transcribe audio from microphone or shared meeting tabs (Google Meet/Zoom)
- **Long Duration Support**: Handle sessions up to 1+ hour with chunked streaming (30s chunks)
- **Live Updates**: Real-time UI updates via Socket.io
- **AI-Powered Summaries**: Generate meeting summaries with key points, action items, and decisions
- **Session Management**: View and manage past recording sessions
- **Multi-Speaker Support**: Speaker diarization for meeting transcripts
- **State Management**: Seamless handling of recording, paused, processing, and completed states

## 📁 Project Structure

```
v2/
├── scribeai-frontend/          # Next.js 14+ frontend (App Router)
│   ├── app/
│   │   ├── page.tsx           # Main dashboard
│   │   └── sessions/
│   │       └── [id]/
│   │           └── page.tsx   # Session detail view
│   ├── components/
│   │   ├── RecordingControls.tsx
│   │   └── SessionHistory.tsx
│   ├── hooks/
│   │   └── useAudioRecorder.ts
│   └── lib/
│       ├── supabase.ts        # Supabase client
│       └── socket.ts          # WebSocket client
│
├── scribeai-server/           # Node.js WebSocket server
│   └── src/
│       ├── index.ts           # Server entry point
│       ├── lib/
│       │   ├── gemini.ts      # Gemini API integration
│       │   └── supabase.ts    # Database client
│       └── sockets/
│           └── recording.ts   # Socket.io handlers
│
└── SUPABASE_SCHEMA.md         # Database schema
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 14+** with App Router
- **TypeScript**
- **Tailwind CSS**
- **Socket.io Client** for real-time communication
- **Supabase JS Client**

### Backend
- **Node.js** with Express
- **Socket.io** for WebSocket server
- **Google Gemini API** for transcription and summarization
- **Supabase** (PostgreSQL) for data persistence

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Google Gemini API key

## 🚀 Setup Instructions

### 1. Supabase Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Setup db schema:
```powershell
  cd scribeai-server
  npx prisma generate
  npx prisma db push
```
3. Copy your project URL and anon key from Settings > API

### 2. Google Gemini API Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key for configuration

### 3. Frontend Setup

```powershell
cd scribeai-frontend

# Copy environment file
Copy-Item .env.local.example .env.local

# Edit .env.local with your credentials:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001

# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

### 4. Backend Setup

```powershell
cd scribeai-server

# Copy environment file
Copy-Item .env.example .env

# Edit .env with your credentials:
# PORT=3001
# GEMINI_API_KEY=your_gemini_api_key
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_anon_key
# CORS_ORIGIN=http://localhost:3000

# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

Server will run on `http://localhost:3001`

## 🎯 Usage

### Starting a Recording Session

1. **Select Audio Source**:
   - **Microphone**: Direct microphone input
   - **Tab Share**: Capture audio from browser tabs (Google Meet, Zoom, etc.)

2. **Start Recording**: Click "Start Recording" button

3. **During Recording**:
   - View live transcription updates
   - Monitor recording duration
   - Pause/Resume as needed

4. **Stop Recording**: Click "Stop & Process"
   - Server processes final transcript
   - AI generates summary with key points, action items, and decisions

5. **View Results**:
   - Summary displayed automatically
   - Session saved to history
   - Access full transcript and download option

### Viewing Past Sessions

- Sessions appear in the history section
- Click "View" on completed sessions
- Download transcripts as text files

## 🏗️ Architecture

### Audio Streaming Pipeline

```
MediaRecorder → 30s Chunks → Socket.io → Server
                                ↓
                          Gemini API (transcription)
                                ↓
                          Supabase (storage)
                                ↓
                          Socket.io → Frontend (live updates)
```

### State Flow

1. **Recording**: Active capture and chunked streaming
2. **Paused**: Recording paused, can resume
3. **Processing**: Generating AI summary
4. **Completed**: Ready to view and download

### Error Handling

- **Stream Interruption**: Auto-reconnect with Socket.io
- **Network Drops**: Buffering and retry mechanisms
- **Device Turned Off**: Auto-pause orphaned sessions
- **Tab Close**: Graceful cleanup of media streams

## 🔧 Key Features Implementation

### Chunked Streaming (30s intervals)
```typescript
// MediaRecorder with time slicing
mediaRecorder.start(30000); // 30 seconds

// On data available
mediaRecorder.ondataavailable = (event) => {
  socket.emit('audio-chunk', {
    sessionId,
    chunk: buffer,
    timestamp: Date.now()
  });
};
```

### Real-time Transcription
```typescript
// Server processes chunks
transcribeAudioChunk(buffer, chunkIndex)
  .then((result) => {
    io.to(sessionId).emit('transcription-update', {
      text: result.text,
      timestamp,
      confidence: result.confidence
    });
  });
```

### AI Summary Generation
```typescript
// Post-processing on session stop
const summaryData = await generateSummary(fullTranscript);
// Returns: summary, keyPoints, actionItems, decisions
```

## 📊 Database Schema

See `prisma/schema.prisma` for complete schema including:
- **sessions**: Recording metadata
- **transcripts**: Full transcription and summaries
- **transcript_chunks**: Incremental transcription chunks

## 🔐 Security Notes

- Row Level Security (RLS) enabled for multi-user support
- Auth integration ready (currently disabled for simplicity)
- CORS configured for development

## 🚧 Development

### Frontend Development
```powershell
cd scribeai-frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
```

### Backend Development
```powershell
cd scribeai-server
npm run dev      # Start dev server with nodemon
npm run build    # Compile TypeScript
npm run start    # Start production server
```




## 🐛 Troubleshooting

### Audio not capturing
- Check browser permissions for microphone/screen share
- Ensure HTTPS in production (required for getUserMedia)

### WebSocket connection fails
- Verify server is running on port 3001
- Check CORS configuration
- Ensure firewall allows WebSocket connections

### Transcription errors
- Verify Gemini API key is valid
- Check API quota and rate limits
- Ensure audio format is supported (webm/mp4)

### Database errors
- Confirm Supabase credentials are correct
- Run prisma schema migrations properly
- Check RLS policies if using auth


