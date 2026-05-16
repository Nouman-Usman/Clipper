"use client";

import { FormEvent, useMemo, useState } from "react";

type Variant = "hero" | "full" | "conversion";
type JobStatus = "ready" | "queued" | "processing" | "complete";

const platforms = ["Shorts", "TikTok", "Reels", "X"];

const clips = [
  {
    title: "The founder lesson nobody says out loud",
    time: "08:12-09:04",
    score: "9.1",
    hook: "Contrarian insight",
    caption: "Most teams do not need more content. They need a better way to reuse the moments already working.",
  },
  {
    title: "Why manual posting breaks the workflow",
    time: "31:18-32:06",
    score: "8.7",
    hook: "Workflow pain",
    caption: "Exporting clips is not the finish line. Publishing, tracking, and retries are where teams lose momentum.",
  },
  {
    title: "The 60-minute podcast cost equation",
    time: "47:40-48:29",
    score: "8.4",
    hook: "Operational math",
    caption: "One hour of source video can become a week of short-form distribution if the pipeline is built correctly.",
  },
];

const faqs = [
  {
    q: "Why focus on podcasters first?",
    a: "The brief recommends podcasters because they have long episodes, established repurposing habits, and a clear willingness to pay for time saved.",
  },
  {
    q: "Why URL-only in v1?",
    a: "URL intake avoids early upload storage cost, lowers abuse exposure, and keeps the first validation loop focused on clipping quality.",
  },
  {
    q: "Why not process inside a Next.js API route?",
    a: "The pipeline can run longer than serverless limits. The web app should enqueue work while a long-running worker handles FFmpeg and AI calls.",
  },
  {
    q: "What if TikTok or Meta approval takes months?",
    a: "Clipper still generates the clip, caption, and export. Direct posting unlocks when API approval is available.",
  },
];

export default function LandingConsole({ variant }: { variant: Variant }) {
  if (variant === "hero") {
    return <HeroPreview />;
  }

  if (variant === "conversion") {
    return <ConversionPanel />;
  }

  return <FullConsole />;
}

function HeroPreview() {
  return (
    <div className="product-preview" aria-label="Clipper dashboard preview">
      <div className="preview-toolbar">
        <span />
        <span />
        <span />
      </div>
      <div className="preview-grid">
        <div className="video-frame">
          <div className="phone-video">
            <span>9:16</span>
            <strong>Speaker kept in frame</strong>
          </div>
          <div className="timeline">
            <span style={{ width: "62%" }} />
          </div>
        </div>
        <div className="job-panel">
          <span className="status-pill">Processing</span>
          <h2>Podcast episode 42</h2>
          <p>6 clips selected from transcript, hooks, and boundary checks.</p>
          <div className="mini-steps">
            <span>Download</span>
            <span>Transcribe</span>
            <span>Pick clips</span>
            <span>Caption</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FullConsole() {
  const [url, setUrl] = useState("https://youtube.com/watch?v=podcast-episode");
  const [selected, setSelected] = useState<string[]>(["Shorts", "Reels", "X"]);
  const [status, setStatus] = useState<JobStatus>("ready");
  const [approved, setApproved] = useState<Record<string, boolean>>({
    [clips[0].title]: true,
  });

  const progress = {
    ready: 0,
    queued: 24,
    processing: 68,
    complete: 100,
  }[status];

  const togglePlatform = (platform: string) => {
    setSelected((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  };

  const submitDemo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!url.trim() || selected.length === 0) {
      setStatus("ready");
      return;
    }

    setStatus("queued");
    window.setTimeout(() => setStatus("processing"), 450);
    window.setTimeout(() => setStatus("complete"), 1200);
  };

  return (
    <div className="console" aria-label="Interactive Clipper product preview">
      <form className="intake-panel" onSubmit={submitDemo}>
        <label htmlFor="video-url">Video URL</label>
        <div className="url-row">
          <input
            id="video-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste YouTube, Vimeo, or mp4 URL"
          />
          <button type="submit">Queue demo job</button>
        </div>
        <div className="platform-toggle" aria-label="Select posting platforms">
          {platforms.map((platform) => (
            <button
              key={platform}
              type="button"
              className={selected.includes(platform) ? "active" : ""}
              onClick={() => togglePlatform(platform)}
            >
              {platform}
            </button>
          ))}
        </div>
      </form>

      <div className="processing-panel">
        <div>
          <span className="status-pill">{status}</span>
          <strong>Async worker pipeline</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p>
          Web queues the job. Worker handles download, transcription, clip
          selection, vertical render, captions, storage, and posting attempts.
        </p>
      </div>

      <div className="clip-review">
        {clips.map((clip) => {
          const isApproved = approved[clip.title] ?? false;
          return (
            <article key={clip.title} className={isApproved ? "clip approved" : "clip"}>
              <div>
                <span>{clip.time}</span>
                <strong>{clip.title}</strong>
              </div>
              <p>{clip.caption}</p>
              <footer>
                <span>Score {clip.score}</span>
                <span>{clip.hook}</span>
                <button
                  type="button"
                  onClick={() =>
                    setApproved((current) => ({
                      ...current,
                      [clip.title]: !isApproved,
                    }))
                  }
                >
                  {isApproved ? "Approved" : "Approve"}
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ConversionPanel() {
  const [hours, setHours] = useState(25);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const estimate = useMemo(() => {
    const costLow = Math.max(1, Math.round(hours * 0.5));
    const costHigh = Math.max(costLow + 1, Math.round(hours * 1));
    const plan = hours <= 5 ? "Starter" : hours <= 25 ? "Pro" : "Studio";

    return { costLow, costHigh, plan };
  }, [hours]);

  const submitLead = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.includes("@")) {
      setSubmitted(false);
      return;
    }

    setSubmitted(true);
    setEmail("");
  };

  return (
    <section id="faq" className="conversion-section">
      <div className="calculator" aria-label="Processing cost estimator">
        <p className="eyebrow">Usage estimator</p>
        <h2>Estimate the right launch plan.</h2>
        <label htmlFor="hours">Source video hours per month</label>
        <input
          id="hours"
          type="range"
          min="1"
          max="100"
          value={hours}
          onChange={(event) => setHours(Number(event.target.value))}
        />
        <div className="estimate-row">
          <strong>{hours}h</strong>
          <span>{estimate.plan}</span>
        </div>
        <p>
          Estimated raw processing cost: ${estimate.costLow}-${estimate.costHigh}
          /month before margin, retries, and platform overhead.
        </p>
      </div>

      <div className="faq-panel">
        <p className="eyebrow">FAQ</p>
        {faqs.map((faq, index) => {
          const expanded = openFaq === index;
          return (
            <article key={faq.q} className="faq-item">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpenFaq(expanded ? -1 : index)}
              >
                <span>{faq.q}</span>
                <span>{expanded ? "-" : "+"}</span>
              </button>
              {expanded ? <p>{faq.a}</p> : null}
            </article>
          );
        })}
      </div>

      <div id="waitlist" className="waitlist-panel">
        <p className="eyebrow">Early access</p>
        <h2>Join the validation cohort.</h2>
        <p>
          Best fit: podcast teams with weekly episodes who already post clips or
          pay someone to create them manually.
        </p>
        <form onSubmit={submitLead}>
          <label htmlFor="lead-email">Work email</label>
          <div>
            <input
              id="lead-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSubmitted(false);
              }}
              placeholder="creator@studio.com"
            />
            <button type="submit">Request invite</button>
          </div>
          <span className={submitted ? "lead-message visible" : "lead-message"}>
            Request received. Next step is onboarding the right podcast workflow.
          </span>
        </form>
      </div>
    </section>
  );
}
