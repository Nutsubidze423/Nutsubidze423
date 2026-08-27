import { z } from 'zod';

/** A recurring character. The cast is the channel's IP and its policy defense:
 *  a consistent cast with lore is a show, not mass-produced templated content. */
export const Character = z.object({
  id: z.string(),
  name: z.string(),
  /** Locked visual description. Reused verbatim on every image call so the
   *  character looks the same in every Short. Never edit casually. */
  look: z.string(),
  /** Seed pinned per character for cross-generation consistency. */
  seed: z.number().int(),
  voice: z.string(),
  /** One line of who they are. Drives writing, not rendering. */
  personality: z.string(),
  catchphrase: z.string().optional(),
  approvedAt: z.string(),
});
export type Character = z.infer<typeof Character>;

export const Idea = z.object({
  id: z.string(),
  premise: z.string(),
  hook: z.string(),
  castIds: z.array(z.string()),
  /** Why the scorer surfaced this. Shown to the human at the weekly gate. */
  evidence: z.string(),
  score: z.number(),
  source: z.enum(['trend', 'cast-lore', 'human']),
  createdAt: z.string(),
});
export type Idea = z.infer<typeof Idea>;

/** A Short is 45-60s. Beats are short and land fast; there is no slow burn. */
export const Beat = z.object({
  /** Spoken line. Keep under ~18 words — this is Shorts pacing. */
  text: z.string(),
  speakerId: z.string().nullable(),
  /** Drives image generation in src/visual. */
  visualCue: z.string(),
  /** Big centered word burned over the frame at this beat, if any. */
  onScreen: z.string().nullable(),
});
export type Beat = z.infer<typeof Beat>;

export const Script = z.object({
  ideaId: z.string(),
  /** First 2 seconds decide everything on Shorts. Hard cap enforced downstream. */
  hook: z.object({ text: z.string(), speakerId: z.string().nullable() }),
  beats: z.array(Beat).min(3).max(8),
  /** Last line should loop back into the hook — rewatches are free retention. */
  payoff: z.string(),
  titleCandidates: z.array(z.string()).length(5),
  estimatedSeconds: z.number(),
});
export type Script = z.infer<typeof Script>;

export const WordTiming = z.object({
  word: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});
export type WordTiming = z.infer<typeof WordTiming>;

export const AudioManifest = z.object({
  voicePath: z.string(),
  durationMs: z.number(),
  words: z.array(WordTiming),
  /** Frame count per beat, derived from real audio — never estimated. */
  beatFrames: z.array(z.number()),
  hookFrames: z.number(),
});
export type AudioManifest = z.infer<typeof AudioManifest>;

export const VisualManifest = z.object({
  /** One image per beat, plus index 0 for the hook. Content-hash cached. */
  images: z.array(z.object({ beatIndex: z.number(), path: z.string(), cacheKey: z.string() })),
});
export type VisualManifest = z.infer<typeof VisualManifest>;

/** Everything Remotion needs to render. Written to out/<id>/props.json. */
export const RenderProps = z.object({
  script: Script,
  audio: AudioManifest,
  visuals: VisualManifest,
});
export type RenderProps = z.infer<typeof RenderProps>;

export const PublishedVideo = z.object({
  ideaId: z.string(),
  videoId: z.string(),
  title: z.string(),
  publishedAt: z.string(),
  castIds: z.array(z.string()),
  costUsd: z.number(),
});
export type PublishedVideo = z.infer<typeof PublishedVideo>;

export const Metrics = z.object({
  videoId: z.string(),
  fetchedAt: z.string(),
  views: z.number(),
  /** The number that matters on Shorts. Everything else is downstream of it. */
  avgViewPercentage: z.number(),
  likes: z.number(),
  comments: z.number(),
  shares: z.number(),
});
export type Metrics = z.infer<typeof Metrics>;
