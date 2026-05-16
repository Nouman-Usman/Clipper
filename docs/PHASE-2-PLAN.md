# Phase 2 Plan

## Summary
Phase 2 turns the local Phase 1 pipeline into a persisted single-user MVP inside the Next.js app. The product remains one deployable app: authenticated dashboard, Postgres state, Upstash Redis status/cache, local processing from server actions or route handlers, and downloadable clip outputs. No separate worker, sidecar service, or non-Next.js app is introduced.

## Scope
- Keep Auth.js credentials auth and UUID user IDs.
- Persist submitted jobs, generated clips, and per-platform caption drafts in Postgres.
- Use Upstash Redis for short-lived job status, dashboard cache, and rate limiting.
- Keep Phase 2 platform output as download/manual-post fallback first; YouTube auto-posting can be added after OAuth credentials are ready.
- Keep processing local to the Next.js runtime for this repo direction, with clear warnings that long videos require a host that allows long-running Node processes and FFmpeg.

## Data Model
- `jobs`: `id uuid`, `userId`, `sourceUrl`, `status`, `errorMessage`, `durationSeconds`, `createdAt`, `updatedAt`.
- `clips`: `id uuid`, `jobId`, `startSeconds`, `endSeconds`, `summary`, `reason`, `filePath`, `publicPath`, `captionsJson`, `createdAt`.
- `socialAccounts`: reserved for OAuth tokens after manual-post MVP is stable.
- `posts`: reserved for YouTube publishing attempts after OAuth is connected.

## Implementation Steps
1. Add Drizzle tables for `jobs` and `clips`, then migrate Postgres.
2. Change Phase 1 server action to create a `job` row before processing and update status at each stage.
3. Save each generated clip as a `clips` row instead of relying only on `summary.json`.
4. Add dashboard job history with status filters, recent errors, and links to each run.
5. Add Gemini caption generation per platform for YouTube Shorts, TikTok, Reels, and X; store JSON on `clips`.
6. Add clip review UI with approve/reject state and editable captions.
7. Add basic quota/rate limits per user using Redis keys.
8. Add YouTube OAuth only after the review/download loop is stable.

## Acceptance Criteria
- A logged-in user can submit a YouTube URL and see a persisted job record immediately.
- Refreshing the dashboard does not lose job/clip history.
- Successful jobs produce downloadable vertical MP4 clips and platform caption drafts after Groq Whisper transcription and Gemini selection/captioning.
- Failed jobs show a clear status and error message without breaking the dashboard.
- `npm run lint` and `npm run build` pass in a correctly provisioned local environment.

## Risks
- Running FFmpeg and transcription inside Next.js is viable for local Phase 2, but not a good production shape on serverless hosts.
- Long videos can exceed request and hosting limits; enforce the 60-minute cap and document host requirements.
- OAuth posting should wait until persisted jobs and manual review are reliable.
