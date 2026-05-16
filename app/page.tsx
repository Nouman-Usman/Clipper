import LandingConsole from "./landing-console";
import LandingMotion from "./landing-motion";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Sign in", href: "/login" },
];

const proof = [
  { value: "3-10 min", label: "target processing window" },
  { value: "4 channels", label: "Shorts, TikTok, Reels, X" },
  { value: "60 min", label: "v1 source limit" },
];

const differentiators = [
  {
    title: "Finds moments that stand alone",
    body: "Clipper scores hooks, complete thoughts, emotional turns, and payoff moments instead of chopping a transcript into arbitrary intervals.",
  },
  {
    title: "Cuts on human boundaries",
    body: "The product promise is clean sentence and breath boundaries, so clips do not start mid-word or end before the idea lands.",
  },
  {
    title: "Adapts captions per destination",
    body: "The same clip gets different writing for TikTok, YouTube Shorts, Instagram Reels, and X instead of one generic caption pasted everywhere.",
  },
  {
    title: "Keeps publishing in the system",
    body: "Auto-posting and per-platform status are the wedge. When an API is blocked, Clipper still provides export and manual-post fallback.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Connect accounts",
    body: "One OAuth connection per platform, with reconnect states when refresh tokens fail.",
  },
  {
    step: "02",
    title: "Submit a URL",
    body: "YouTube, Vimeo, direct mp4, or podcast video URL. No direct upload in v1 to reduce storage and abuse risk.",
  },
  {
    step: "03",
    title: "Process asynchronously",
    body: "The web app queues the job. Next.js server code handles yt-dlp, Groq Whisper, Gemini, FFmpeg, and persisted run status.",
  },
  {
    step: "04",
    title: "Review clips",
    body: "Approve, edit captions, reject weaker moments, or schedule posting per destination.",
  },
];

const platformRows = [
  ["YouTube Shorts", "MVP auto-post", "OAuth and upload quota are the lowest-friction start."],
  ["X", "Phase 3", "Requires paid write access and careful 280-character caption variants."],
  ["Instagram Reels", "Review gated", "Business or Creator account plus Meta content publishing approval."],
  ["TikTok", "Approval gated", "Posting API approval can take weeks or months; export fallback remains useful."],
];

const pricing = [
  {
    name: "Starter",
    price: "$19",
    detail: "5 source hours/month",
    features: ["1 connected platform", "Watermarked exports", "Manual fallback posting"],
  },
  {
    name: "Pro",
    price: "$49",
    detail: "25 source hours/month",
    features: ["All destinations", "No watermark", "Scheduling and priority queue"],
    featured: true,
  },
  {
    name: "Studio",
    price: "$99",
    detail: "100 source hours/month",
    features: ["Custom prompt profiles", "Priority processing", "Advanced posting controls"],
  },
];

export default function Home() {
  return (
    <div className="site-shell">
      <LandingMotion />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Clipper home">
          <span>Clipper</span>
        </a>
        <nav aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="nav-cta" href="/signup">
          Create account
        </a>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="hero-kicker">Clipper</p>
            <h1>Turn long episodes into a week of short-form posts.</h1>
            <p>
              Clipper finds the strongest podcast moments, prepares vertical
              clips, writes platform-specific captions, and keeps every post
              moving through review, schedule, and publish.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="/signup">
                Start free
              </a>
              <a className="secondary-button" href="/login">
                Sign in
              </a>
            </div>
            <p className="hero-note">Built for podcast teams shipping clips every week.</p>
          </div>
          <div className="hero-product" aria-label="Clipper product preview">
            <div className="hero-product-bar">
              <span>Episode 42</span>
              <strong>Processing</strong>
            </div>
            <div className="hero-product-grid">
              <div className="source-panel">
                <div className="source-video">
                  <span />
                </div>
                <div className="source-lines">
                  <strong>Transcript mapped</strong>
                  <span />
                  <span />
                </div>
              </div>
              <div className="clip-stack">
                {[
                  ["Hook", "9.1", "Shorts"],
                  ["Workflow pain", "8.7", "Reels"],
                  ["Cost equation", "8.4", "X"],
                ].map(([title, score, platform]) => (
                  <article key={title} className="clip-tile">
                    <div>
                      <span>{platform}</span>
                      <strong>{score}</strong>
                    </div>
                    <p>{title}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="publish-rail">
              <span>Queued</span>
              <span>Review</span>
              <span>Scheduled</span>
              <span>Published</span>
            </div>
          </div>
        </section>

        <section className="hero-preview-band" aria-label="Clipper dashboard preview">
          <LandingConsole variant="hero" />
        </section>

        <section className="proof-strip" aria-label="Product constraints">
          {proof.map((item) => (
            <div key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </section>

        <section id="product" className="section">
          <div className="section-heading">
            <p className="eyebrow">What context-aware means</p>
            <h2>Built around the parts that actually make or break clips.</h2>
          </div>
          <div className="feature-grid">
            {differentiators.map((item) => (
              <article key={item.title} className="feature-card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="workflow-section">
          <div className="section-heading">
            <p className="eyebrow">Workflow</p>
            <h2>From URL to published short without running heavy work in Next.js.</h2>
          </div>
          <div className="workflow-grid">
            {workflow.map((item) => (
              <article key={item.step} className="workflow-card">
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="console-band">
          <div>
            <p className="eyebrow">Interactive preview</p>
            <h2>Try the intake and review flow.</h2>
            <p>
              This page now behaves like a validation-ready landing page: choose
              platforms, simulate a queued job, inspect generated clips, estimate
              usage, and submit an early-access lead.
            </p>
          </div>
          <LandingConsole variant="full" />
        </section>

        <section className="platform-section">
          <div className="section-heading">
            <p className="eyebrow">Platform rollout</p>
            <h2>Honest about API gates, useful before every approval lands.</h2>
          </div>
          <div className="platform-table" role="table" aria-label="Platform rollout">
            {platformRows.map(([platform, status, detail]) => (
              <div key={platform} className="platform-row" role="row">
                <strong role="cell">{platform}</strong>
                <span role="cell">{status}</span>
                <p role="cell">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="section">
          <div className="section-heading">
            <p className="eyebrow">Pricing model</p>
            <h2>Plans weighted around source-video hours.</h2>
          </div>
          <div className="pricing-grid">
            {pricing.map((tier) => (
              <article
                key={tier.name}
                className={tier.featured ? "pricing-card featured" : "pricing-card"}
              >
                <h3>{tier.name}</h3>
                <strong>{tier.price}</strong>
                <span>{tier.detail}</span>
                <ul>
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <a href="#waitlist">Start with {tier.name}</a>
              </article>
            ))}
          </div>
        </section>

        <LandingConsole variant="conversion" />
      </main>

      <footer className="footer">
        <span>Clipper</span>
        <p>Validation-first video repurposing SaaS for podcast teams.</p>
      </footer>
    </div>
  );
}
