# Clipper — Comprehensive Build Plan

A video repurposing platform: user pastes a long-form video URL → system identifies the best moments → cuts vertical clips → writes platform-specific captions and hashtags → auto-posts to YouTube Shorts, TikTok, Instagram Reels, and X.

---

## 1. Product definition

### 1.1 What the user does
1. Connects their social accounts (one-time OAuth per platform).
2. Pastes a video URL (YouTube, Vimeo, direct mp4, podcast video, etc.).
3. Selects which platforms to post to and an optional posting schedule.
4. Waits 3–10 minutes.
5. Reviews generated clips in a dashboard. Approves, edits captions, or rejects each.
6. Clips post automatically (or on schedule), with status reflected per platform.

### 1.2 What "context-aware" actually means
This phrase hides most of the engineering. Concretely it means:

- **Clip selection**: the system understands the *content* of the video well enough to find moments that work as standalone short videos — strong hooks, complete thoughts, emotional beats, payoffs.
- **Boundary detection**: cuts happen at natural sentence and breath boundaries, never mid-word.
- **Caption voice**: captions match the clip's actual content and tone, not generic templates.
- **Platform adaptation**: a TikTok caption is punchy and uses trending tag patterns; a LinkedIn caption is prose; an X caption respects 280 characters. Same clip, four different captions.
- **Visual framing**: when reframing horizontal video to vertical, the subject (usually a face) stays in frame.

### 1.3 Non-goals for v1
Drawing the line is as important as scoping in. **Out of scope for v1**:
- Direct video upload (URL-only — adds storage cost and abuse vectors).
- Live stream clipping.
- Multi-language transcription beyond English (add later; Whisper handles ~99 languages).
- Burned-in animated captions / subtitles (this is a v2 differentiator).
- Music overlay or B-roll insertion.
- Team accounts / multi-user workspaces.
- Mobile app (web responsive is enough).

### 1.4 Target user (pick one for v1)
You'll get better product decisions if you pick a single persona. Three plausible ones:

| Persona | Wins because… | Pain in v1 |
|---|---|---|
| **Podcasters** (1–3hr episodes, audio+video) | Clear ROI; established repurposing habit; willing to pay $50–100/mo | Need speaker diarization for multi-host shows |
| **Course creators / coaches** (30–60min talking-head) | Single speaker simplifies reframing; high willingness to pay | Smaller market |
| **B2B founders / execs** (short-form for LinkedIn/X) | High LTV; love automation | LinkedIn API is painful; LinkedIn isn't even in v1 platform list |

**Recommendation: podcasters.** It's the largest validated market (Opus Clip, Vizard, Castmagic, Riverside all serve it), and your platform mix (YouTube/TikTok/Reels/X) maps cleanly to where podcasts get clipped. Build the product around their workflow.

---

## 2. Competitive landscape (be honest about this)

You are entering a crowded category. Know what you're up against before building:

| Tool | Strength | Pricing |
|---|---|---|
| **Opus Clip** | Best face-tracking; market leader | ~$15–30/mo |
| **Vizard** | Strong captions/subtitles | ~$20–60/mo |
| **Submagic** | Subtitle-first; viral aesthetic | ~$15–50/mo |
| **Castmagic** | Podcast-focused, full repurposing suite | ~$25–100/mo |
| **Riverside Magic Clips** | Bundled with recording | included |

**What you'd need to win:** at least one of (a) materially better clip selection in a specific niche, (b) auto-posting (most competitors stop at "download and post yourself"), (c) lower price, (d) a specific workflow no one else solves. **Auto-posting is your stated differentiator — lean on it.** Most of the above only download clips; they don't push to TikTok/Reels for you.

---

## 3. Architecture

### 3.1 The pipeline (chronological)
```
URL  →  Download  →  Transcribe  →  Pick clips  →  Cut + reframe  →  Caption  →  Upload to storage  →  Post to platforms
```

Each stage takes seconds to minutes. The whole pipeline is async; the user never waits on an HTTP request.

### 3.2 System components
- **Web app (Next.js)** — UI, auth, dashboard, pipeline server actions, and result pages. For the current build direction, Phase 1 and Phase 2 stay inside this app.
- **Local processing runtime (Next.js server code)** — runs yt-dlp, Groq Whisper, Gemini, and FFmpeg from server actions/route handlers on a machine that supports long-running Node processes and local binaries.
- **Redis (Upstash)** — session/status/cache/rate-limit support.
- **Database (Postgres on Supabase or Neon)** — users, jobs, clips, social accounts, posts.
- **Object storage (Cloudflare R2 preferred; S3 backup)** — source video temp storage and final clip storage. R2 wins on egress cost (free).
- **AI providers** — Groq Whisper for transcription; Gemini for clip selection and caption generation.

### 3.3 Why this shape
- **Next.js-only execution** keeps the current product simple and local-first, at the cost of requiring a host that can run long requests and FFmpeg.
- **Redis-backed status/cache** gives a path to progress tracking and rate limits without adding another app.
- **Postgres for state, Redis for queue** is the boring correct answer; do not invent a custom orchestrator.
- **R2 over S3** saves money on a workload that is naturally egress-heavy (uploading clips to four social platforms means downloading each one four times).

### 3.4 Data model (essentials)
- `User` — auth identity.
- `SocialAccount` — one row per (user, platform). Stores OAuth tokens, scopes, refresh tokens, the user's external ID on that platform.
- `Job` — one per submitted URL. Has status, error message, selected platforms.
- `Clip` — one per generated clip. Has start/end seconds, hook type, summary, storage key, and a JSON blob of per-platform captions/hashtags.
- `Post` — one per (clip, platform) posting attempt. Tracks status, external post URL, errors.

### 3.5 Operational concerns
- **Idempotency**: pipeline steps must be safely retryable. Re-running download or cut should not create duplicate clips. Use the `Job.id` and step name as the idempotency key.
- **Backpressure**: FFmpeg is CPU-bound. Worker concurrency should match available cores, not be set high. Scale horizontally by adding worker instances.
- **Timeouts**: per-step timeouts so a stuck Whisper call doesn't tie up a worker forever.
- **Observability**: structured logs with `jobId` on every line; an admin view that shows job status, per-step duration, and last error. Sentry for errors.

---

## 4. The hard problems, ranked by difficulty

This is where most of the engineering time goes. Plan accordingly.

### 4.1 Smart vertical reframing (hardest)
Source videos are 16:9. Shorts/Reels/TikTok are 9:16. Naive center-crop loses the speaker whenever they're off-center. **This is where Opus Clip's perceived quality moat lives.**

Approach (in order of cost/complexity):
1. **v0 — Blurred-background pad** (ship this in MVP): scale video to fit, fill the rest with a blurred copy. Works for most content. Ugly for talking-head.
2. **v1 — Static face-tracked crop**: run a face detector on every Nth frame, average the bounding box centers, pick a single crop window. Good for single-speaker videos. ~1–2 weeks of work.
3. **v2 — Dynamic face-tracked crop**: per-frame tracking with smoothing (Kalman filter) so the crop window glides with the speaker. Handles speaker switches via scene detection. ~3–6 weeks. This is the real product.
4. **v3 — Multi-speaker layouts**: split-screen when two speakers are visible. ~4 weeks more.

**Stack**: a Python sidecar service running MediaPipe Face Detection or YOLOv8 Face. The Node worker sends a video, gets back per-frame bounding boxes, then feeds them to FFmpeg via the `crop` filter with a sendcmd timeline.

### 4.2 Clip selection quality
The LLM prompt that picks clips from the transcript is the most important single asset in the codebase. It's also the cheapest to iterate on.

What separates a 6/10 prompt from a 9/10 one:
- **Niche specificity**: a prompt tuned for podcast interviews picks different moments than one tuned for solo monologues. Ship per-niche prompt variants.
- **Few-shot examples**: 2–3 (transcript snippet → ideal clip JSON) pairs from your target niche dramatically improve output.
- **Multi-pass scoring**: first pass generates 10 candidates; second pass scores each 1–10; you keep the top N. More tokens, much better output.
- **Visual-cue integration**: transcript-only misses visual punchlines and reactions. v2 should combine transcript with audio energy peaks and scene-change detection.

**Plan**: build an internal eval set of 20 videos with hand-picked "ideal clips" before tuning. Score prompt versions against it.

### 4.3 Social platform API access
Each platform has its own gatekeeping. Start applications immediately — they take weeks.

| Platform | Difficulty | What blocks you |
|---|---|---|
| **YouTube Shorts** | Easy | None. OAuth and you're posting in a day. Quota is 10k units/day = ~6 uploads. Request increase early. |
| **X / Twitter** | Medium | Write API requires paid tier (~$100+/mo last I checked — verify current pricing during planning). |
| **Instagram Reels** | Hard | Requires user has Business or Creator IG account linked to a Facebook Page. Your Meta app needs `instagram_content_publish` permission which requires App Review (1–4 weeks). |
| **TikTok** | Hardest | Content Posting API requires app review with business justification. Sandbox mode posts only to test users. Real approval: weeks to months. |

**Fallback strategy**: for any platform where API access isn't ready, still generate the clip and caption, store them, and surface a "download + manual post" button in the dashboard. Users get value on day one even if TikTok approval drags.

### 4.4 Cost economics
Per-video processing costs (approximate, validate before pricing):
- Groq Whisper transcription: validate current Groq pricing before production pricing decisions.
- Gemini clip-picking (1 call, full transcript context): validate current Gemini pricing before production pricing decisions.
- Gemini captions (N parallel calls, one per clip): validate current Gemini pricing before production pricing decisions.
- Storage (R2): negligible
- Compute (FFmpeg on a worker): a few cents in CPU-minutes

**A 60-minute podcast costs roughly $0.50–$1.00 to process end-to-end.** Price plans assuming users will process 10–30 hours/month and pad for AI price changes.

### 4.5 Auth and OAuth callbacks
Each social platform has its own OAuth flow with its own quirks (PKCE, refresh tokens, scopes, redirect URI strictness). Plan for:
- User authentication (Clerk or Auth.js — pick Clerk for speed).
- One OAuth callback route per platform.
- Token refresh logic per platform — YouTube auto-refreshes, X requires explicit refresh, TikTok tokens expire in 24h and need a different refresh dance.
- A "reconnect account" flow when refresh fails.

### 4.6 Abuse and policy risks
URL-based ingestion has a long tail of risks:
- **Copyright**: someone pastes a Netflix rip. You're posting copyrighted content to four platforms under their account — their problem, but it'll get your IP blocked. Mitigation: ToS, watermark detection (later), abuse flagging.
- **SSRF**: someone pastes `http://169.254.169.254/...` to probe your worker's metadata service. Mitigation: URL allowlist by host pattern; resolve DNS before fetching; block private IP ranges.
- **Resource exhaustion**: someone submits a 12-hour video. Mitigation: max duration cap (60min in v1); max file size cap in yt-dlp.
- **Account suspension cascades**: aggressive auto-posting can trigger spam detection. Mitigation: rate limits per user per platform; "draft mode" default for new users.

---

## 5. Phased build plan

### Phase 0 — Validation (1–2 weeks, no code)
- Pick the target niche (recommend podcasters).
- Manually clip 5 podcast episodes end-to-end. Time yourself. Note where you'd want automation most.
- Talk to 10 podcasters. Show them clips you made. Would they pay? How much? What stops them today?
- Build a wait-list landing page. Run $200 of ads to gauge demand.
- **Decision gate**: if 10+ people put down deposits or pre-pay, build it. If not, the problem isn't the build.

### Phase 1 — Vertical slice (2–3 weeks)
The smallest end-to-end thing that works on your own machine.
- YouTube URLs only.
- yt-dlp → Groq Whisper → Gemini picks clips → FFmpeg center-crop to 9:16 → save mp4 locally.
- Next.js dashboard UI only; no standalone CLI or separate worker.
- Test on 10 real videos. Manually score clip quality.
- **Decision gate**: are the clips actually good? If not, all the engineering polish in the world won't save it. Iterate the prompt until they are.

### Phase 2 — End-to-end MVP (4–6 weeks)
Real product, single platform, single user.
- Next.js web app with paste-URL form + dashboard.
- Persist jobs/clips in Postgres and use Redis for status/cache/rate limits.
- Auth via Auth.js credentials.
- **Auto-posting to YouTube Shorts only** (the easy platform).
- Other three platforms: generate clip + caption, store, "download and post manually" button.
- Deploy: web on Vercel, worker on Railway.
- **Decision gate**: 5 beta users running 20 videos through it without intervention.

### Phase 3 — Quality and posting (4–6 weeks)
- Add X auto-posting (apply for API access in Phase 1, will be ready by now).
- Static face-tracked crop (v1 reframing).
- Burn-in subtitles (this is what makes clips "look like Submagic clips" — high perceived value).
- Caption editing UI before posting.
- Posting schedule (cron-style: "post the first clip tomorrow at 9am").
- **Decision gate**: 20 paying users.

### Phase 4 — Polish and remaining platforms (ongoing)
- Instagram Reels auto-posting (when Meta App Review completes).
- TikTok auto-posting (when TikTok approval completes; may slip to Phase 5).
- Dynamic face tracking.
- Multi-language transcription.
- Niche-specific prompt variants.

---

## 6. Tech stack summary

| Layer | Choice | Why |
|---|---|---|
| Web framework | Next.js (App Router) | You asked for it; ecosystem fit |
| Web hosting | Vercel | Zero-config for Next.js |
| Processing runtime | Next.js server code | User preference is one Next.js app for Phase 1/2 |
| Hosting | Long-running Node host | Must support FFmpeg, yt-dlp, and long requests |
| Status/cache | Upstash Redis | Session, dashboard cache, rate limits, and job status |
| Database | Postgres (Supabase or Neon) | Default correct answer |
| Storage | Cloudflare R2 | Free egress matters for this workload |
| Auth | Clerk | Fastest to ship |
| Transcription | Groq Whisper | User preference; OpenAI-compatible speech endpoint with fast Whisper models |
| LLM | Gemini | User preference for clip selection and captions |
| Video processing | FFmpeg + yt-dlp | Industry standard |
| Face tracking (v2) | Python sidecar with MediaPipe | Best free face detector |
| Monitoring | Sentry + Axiom or Better Stack | Errors + structured logs |
| Payments | Stripe | Subscriptions |

---

## 7. Pricing model (placeholder; validate)
Three tiers, weighted around processing hours since that's the cost driver:
- **Starter — $19/mo**: 5 hours of source video/month, 1 connected platform, watermark.
- **Pro — $49/mo**: 25 hours, all platforms, no watermark, scheduling.
- **Studio — $99/mo**: 100 hours, priority queue, custom prompts per project.

Margin at $19 tier: $19 revenue – ~$5 in AI/compute/storage – payment fees ≈ healthy if usage is normal. The risk is one user processing 5 hours of dense video that triggers maximum LLM token usage. Monitor per-user costs from day one.

---

## 8. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Clip quality is mediocre, indistinguishable from competitors | High | Fatal | Phase 1 decision gate. Don't build the rest until clips are good. |
| TikTok API approval never comes | Medium | Medium | Manual-post fallback. Apply in week 1. |
| Groq Whisper / Gemini prices rise significantly | Low | Medium | Build cost tracking per job. Keep provider boundary isolated. |
| User uploads pirated content, platforms ban your app | Medium | High | ToS + watermark detection + rate limits. Insure if revenue justifies it. |
| Opus Clip ships auto-posting | High | Medium | Lean into a niche (podcasters) and depth there rather than breadth. |
| FFmpeg crashes on weird input formats | Medium | Low | Sentry alerts, retry once, surface clear errors to user. |
| Worker can't scale during a viral moment | Low | Low | Horizontal scale via more worker instances; queue handles backlog. |

---

## 9. Open decisions to make before writing code

1. **Niche**: podcasters, course creators, or B2B founders? Recommend podcasters.
2. **Auth provider**: Clerk (fast) or Auth.js (free, more work)? Recommend Clerk.
3. **Self-hosted worker provider**: Railway (easiest), Fly.io (best regions), or Render? Pick one; not worth comparing further.
4. **Transcription provider for v1**: Groq Whisper.
5. **Burn-in subtitles in v1 or v2?** Adds significant perceived quality but also engineering time. Recommend v2 (Phase 3).
6. **Watermark on free tier?** Standard practice; cheap to implement; helps growth. Recommend yes.

---

## 10. What success looks like at each gate

- **End of Phase 0**: clear demand signal (pre-orders, ad CTR, beta signups).
- **End of Phase 1**: clips that you'd actually post yourself.
- **End of Phase 2**: 5 beta users, hands-off pipeline working end-to-end for at least YouTube.
- **End of Phase 3**: 20 paying users, two platforms auto-posting, subtitles, decent reframing.
- **End of Phase 4**: $5–10k MRR, all four platforms, dynamic face tracking, defensible quality.

Total time to Phase 3 with one full-time engineer: **3–4 months realistic, 6 months if unlucky with API approvals.**
