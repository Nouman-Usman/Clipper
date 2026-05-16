# Clipper

Next.js app for turning YouTube videos into vertical short-form clips using local video tooling, Groq Whisper transcription, Gemini clip selection, and persisted job history.

## Local Setup

Install dependencies:

```bash
npm install
```

Install the local video binaries required by the Phase 1/2 pipeline:

```bash
brew install ffmpeg yt-dlp
```

`ffprobe` ships with `ffmpeg`.

Create `.env` from `.env.example` and fill in:

```bash
DATABASE_URL=
AUTH_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
GROQ_API=
GEMINI_API_KEY=
```

Apply migrations:

```bash
npm run db:migrate
```

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`, sign in, and use `/dashboard` to run the Next.js-hosted clip pipeline.

## Useful Commands

```bash
npm run lint
npx tsc --noEmit
npm run db:generate
npm run db:migrate
```

## Phase 2 Notes

The current implementation intentionally keeps processing inside the Next.js app. That means local and deployment environments must support long-running Node work plus `yt-dlp`, `ffmpeg`, and `ffprobe` on `PATH`.
