import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import OpenAI, { toFile } from "openai";

const MAX_SOURCE_SECONDS = 60 * 60;
const DEFAULT_CLIP_COUNT = 3;
const DEFAULT_MIN_SECONDS = 30;
const DEFAULT_MAX_SECONDS = 60;

export type Phase1Clip = {
  index: number;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  reason: string;
  fileName: string;
  publicPath: string;
};

export type Phase1RunSummary = {
  runId: string;
  userId: string;
  inputUrl: string;
  durationSeconds: number;
  outputRoot: string;
  createdAt: string;
  clips: Phase1Clip[];
};

type GeminiClip = {
  startSeconds: number;
  endSeconds: number;
  reason?: string;
};

type WhisperSegment = {
  start?: number;
  end?: number;
  text?: string;
};

type WhisperVerboseResponse = {
  text?: string;
  segments?: WhisperSegment[];
};

type CommandResult = {
  stdout: string;
  stderr: string;
};

export type Phase1EnvironmentStatus = {
  ok: boolean;
  checks: Array<{
    name: string;
    ok: boolean;
    detail: string;
  }>;
};

function runCommand(command: string, args: string[], label: string): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`${label} could not start: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${label} failed with exit code ${code ?? "unknown"}.\n${stderr}`));
    });
  });
}

async function commandVersion(command: string, args: string[]) {
  try {
    const result = await runCommand(command, args, command);
    return {
      ok: true,
      detail: (result.stdout || result.stderr).split("\n")[0]?.trim() || "available",
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : `${command} is unavailable`,
    };
  }
}

export async function getPhase1EnvironmentStatus(): Promise<Phase1EnvironmentStatus> {
  const [ytDlp, ffmpeg, ffprobe] = await Promise.all([
    commandVersion("yt-dlp", ["--version"]),
    commandVersion("ffmpeg", ["-version"]),
    commandVersion("ffprobe", ["-version"]),
  ]);

  const checks = [
    { name: "yt-dlp", ...ytDlp },
    { name: "ffmpeg", ...ffmpeg },
    { name: "ffprobe", ...ffprobe },
    {
      name: "OPENAI_API_KEY",
      ok: Boolean(process.env.OPENAI_API_KEY),
      detail: process.env.OPENAI_API_KEY ? "configured" : "missing",
    },
    {
      name: "GEMINI_API_KEY",
      ok: Boolean(process.env.GEMINI_API_KEY),
      detail: process.env.GEMINI_API_KEY ? "configured" : "missing",
    },
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

function assertYouTubeUrl(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Enter a valid YouTube URL.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.includes("youtube.com") && !host.includes("youtu.be")) {
    throw new Error("Phase 1 accepts YouTube URLs only.");
  }
}

function parsePositiveNumber(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePhase1Form(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  const clipCount = Math.min(5, parsePositiveNumber(formData.get("clipCount"), DEFAULT_CLIP_COUNT));
  const minSeconds = parsePositiveNumber(formData.get("minSeconds"), DEFAULT_MIN_SECONDS);
  const maxSeconds = parsePositiveNumber(formData.get("maxSeconds"), DEFAULT_MAX_SECONDS);

  assertYouTubeUrl(url);

  if (minSeconds > maxSeconds) {
    throw new Error("Minimum clip length must be less than maximum clip length.");
  }

  return {
    url,
    clipCount,
    minSeconds,
    maxSeconds,
  };
}

function publicRunsRoot() {
  return path.join(process.cwd(), "public", "phase1-runs");
}

function runRoot(runId: string) {
  return path.join(publicRunsRoot(), runId);
}

export async function readPhase1RunSummary(runId: string): Promise<Phase1RunSummary> {
  if (!/^[a-zA-Z0-9-]+$/.test(runId)) {
    throw new Error("Invalid run ID.");
  }

  const raw = await readFile(path.join(runRoot(runId), "summary.json"), "utf8");
  return JSON.parse(raw) as Phase1RunSummary;
}

async function getVideoDurationSeconds(inputFile: string) {
  const { stdout } = await runCommand(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputFile,
    ],
    "ffprobe"
  );

  return Number.parseFloat(stdout.trim());
}

async function transcribeWithWhisper(inputFile: string): Promise<WhisperVerboseResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for transcription.");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const buffer = await readFile(inputFile);

  return openai.audio.transcriptions.create({
    file: await toFile(buffer, path.basename(inputFile)),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  }) as Promise<WhisperVerboseResponse>;
}

function parseJsonFromModel(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : text);
}

function normalizeClips(clips: GeminiClip[], minSeconds: number, maxSeconds: number) {
  return clips
    .map((clip) => {
      const startSeconds = Number(clip.startSeconds);
      const endSeconds = Number(clip.endSeconds);

      if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
        return null;
      }

      const durationSeconds = endSeconds - startSeconds;
      const boundedEnd =
        durationSeconds > maxSeconds
          ? startSeconds + maxSeconds
          : Math.max(endSeconds, startSeconds + minSeconds);

      return {
        startSeconds: Number(Math.max(0, startSeconds).toFixed(2)),
        endSeconds: Number(boundedEnd.toFixed(2)),
        reason: clip.reason ?? "Selected by Gemini for standalone short-form potential.",
      };
    })
    .filter((clip): clip is Omit<Phase1Clip, "index" | "durationSeconds" | "fileName" | "publicPath"> =>
      Boolean(clip)
    );
}

async function pickClipsWithGemini(input: {
  transcript: WhisperVerboseResponse;
  clipCount: number;
  minSeconds: number;
  maxSeconds: number;
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required for clip selection.");
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-pro";
  const segments = input.transcript.segments?.slice(0, 500).map((segment) => ({
    start: segment.start,
    end: segment.end,
    text: segment.text,
  }));

  const prompt = [
    "Select podcast clips that can stand alone as vertical short videos.",
    `Return exactly ${input.clipCount} clips as JSON.`,
    "Shape: [{\"startSeconds\":number,\"endSeconds\":number,\"reason\":string}]",
    `Each clip must be ${input.minSeconds}-${input.maxSeconds} seconds.`,
    "Prefer strong hooks, complete thoughts, emotional turns, and clear payoffs.",
    "Avoid overlapping clips and filler-heavy sections. Return JSON only.",
    `Transcript text:\n${(input.transcript.text ?? "").slice(0, 30000)}`,
    `Timestamped segments:\n${JSON.stringify(segments ?? [])}`,
  ].join("\n\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini clip selection failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join("\n");

  if (!text) {
    throw new Error("Gemini returned no clip selection output.");
  }

  const parsed = parseJsonFromModel(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini clip selection output was not a JSON array.");
  }

  return normalizeClips(parsed as GeminiClip[], input.minSeconds, input.maxSeconds);
}

async function cutClip(input: {
  inputFile: string;
  outputFile: string;
  startSeconds: number;
  endSeconds: number;
}) {
  await runCommand(
    "ffmpeg",
    [
      "-y",
      "-ss",
      String(input.startSeconds),
      "-to",
      String(input.endSeconds),
      "-i",
      input.inputFile,
      "-vf",
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      input.outputFile,
    ],
    "ffmpeg"
  );
}

export async function runPhase1Pipeline(input: {
  userId: string;
  url: string;
  clipCount: number;
  minSeconds: number;
  maxSeconds: number;
}): Promise<Phase1RunSummary> {
  const environment = await getPhase1EnvironmentStatus();
  if (!environment.ok) {
    const missing = environment.checks
      .filter((check) => !check.ok)
      .map((check) => `${check.name}: ${check.detail}`)
      .join("; ");
    throw new Error(`Phase 1 environment is not ready. ${missing}`);
  }

  assertYouTubeUrl(input.url);

  const runId = `${Date.now()}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  const root = runRoot(runId);
  const clipsDir = path.join(root, "clips");
  const inputFile = path.join(root, "source.mp4");

  await mkdir(clipsDir, { recursive: true });

  await runCommand(
    "yt-dlp",
    [
      "-f",
      "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]",
      "--merge-output-format",
      "mp4",
      "-o",
      inputFile,
      input.url,
    ],
    "yt-dlp"
  );

  const durationSeconds = await getVideoDurationSeconds(inputFile);
  if (durationSeconds > MAX_SOURCE_SECONDS) {
    throw new Error(`Source is ${Math.round(durationSeconds)}s. Phase 1 max is ${MAX_SOURCE_SECONDS}s.`);
  }

  const transcript = await transcribeWithWhisper(inputFile);
  await writeFile(path.join(root, "transcript.json"), JSON.stringify(transcript, null, 2));

  const selectedClips = await pickClipsWithGemini({
    transcript,
    clipCount: input.clipCount,
    minSeconds: input.minSeconds,
    maxSeconds: input.maxSeconds,
  });

  if (!selectedClips.length) {
    throw new Error("Gemini did not return any valid clips.");
  }

  const clips: Phase1Clip[] = [];

  for (let index = 0; index < selectedClips.length; index += 1) {
    const clip = selectedClips[index];
    const fileName = `clip-${String(index + 1).padStart(2, "0")}.mp4`;
    const outputFile = path.join(clipsDir, fileName);

    await cutClip({
      inputFile,
      outputFile,
      startSeconds: clip.startSeconds,
      endSeconds: clip.endSeconds,
    });

    clips.push({
      index: index + 1,
      startSeconds: clip.startSeconds,
      endSeconds: clip.endSeconds,
      durationSeconds: Number((clip.endSeconds - clip.startSeconds).toFixed(2)),
      reason: clip.reason,
      fileName,
      publicPath: `/phase1-runs/${runId}/clips/${fileName}`,
    });
  }

  const summary: Phase1RunSummary = {
    runId,
    userId: input.userId,
    inputUrl: input.url,
    durationSeconds,
    outputRoot: root,
    createdAt: new Date().toISOString(),
    clips,
  };

  await writeFile(path.join(root, "summary.json"), JSON.stringify(summary, null, 2));

  return summary;
}
