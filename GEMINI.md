# Project: Clipper

Clipper is a Next.js application designed to automate the creation of vertical short-form video clips from longer YouTube videos. It utilizes a pipeline that processes video assets using local CLI tools, transcribes them with Groq/Whisper, and uses Gemini to select the most engaging segments.

## Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, React 19)
- **Database:** PostgreSQL (with [Drizzle ORM](https://orm.drizzle.team/))
- **Cache/Session:** [Upstash Redis](https://upstash.com/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/)
- **AI Services:** 
  - Transcription: Groq (Whisper)
  - Content Logic: Gemini API
- **Video Processing:** Local `ffmpeg`, `yt-dlp` (Must be present on the host environment)
- **Styling:** Tailwind CSS

## Building and Running

Ensure local dependencies are installed (`ffmpeg`, `yt-dlp`) and environment variables are set in `.env` (see `.env.example`).

### Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server |
| `npm run build` | Build the project for production |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply Drizzle migrations |

## Development Conventions

- **Project Structure:**
  - `app/`: Next.js App Router routes and components.
  - `app/actions/`: Server actions for handling clip processing and auth.
  - `lib/`: Business logic, database connection, and pipeline utilities.
  - `drizzle/`: Database schema and migration files.
- **Conventions:**
  - The pipeline relies on host-environment installation of `ffmpeg` and `yt-dlp`.
  - Development is standard Next.js TypeScript.
  - New database schemas should be added to `drizzle/schema.ts` and migrated using `npm run db:generate`.
