import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.ts';
import { state } from '../state.ts';
import type { Script, VisualManifest } from '../types.ts';

const CACHE = join(process.cwd(), 'assets', 'cache');

/** House style, applied to every image so the channel reads as one world.
 *  Edit this and the whole back catalogue stops matching — treat it as locked. */
const STYLE = 'surreal 3d render, glossy plastic materials, saturated colors, ' +
  'harsh direct flash lighting, shallow depth of field, centered subject, ' +
  'vertical 9:16 composition, no text, no watermark';

/**
 * Build the image prompt for a beat. Any character named in the beat gets its
 * locked `look` string spliced in verbatim — that string, plus the pinned seed,
 * is the entire reason the cast looks the same across hundreds of videos.
 */
export function promptFor(visualCue: string, castIds: string[]): { prompt: string; seed: number } {
  const chars = castIds.map(id => state.cast.byId(id)).filter(Boolean);
  const looks = chars.map(c => `${c!.name}: ${c!.look}`).join('. ');
  // Seed from the first character present, so a character's appearance is stable.
  const seed = chars[0]?.seed ?? 1;
  return {
    prompt: [looks, visualCue, STYLE].filter(Boolean).join('. '),
    seed,
  };
}

const cacheKey = (prompt: string, seed: number) =>
  createHash('sha256').update(`${prompt}|${seed}`).digest('hex').slice(0, 16);

/**
 * The one provider-specific function in this module. Swap the body for your
 * image API; everything above and below is provider-independent.
 * Must return raw PNG/JPEG bytes.
 */
async function callImageApi(prompt: string, _seed: number): Promise<Buffer> {
  // NOTE: gpt-image-1 exposes no seed parameter, so character consistency here
  // rests entirely on the locked `look` string. If you switch to a provider
  // that supports seeds (SDXL, Flux, Replicate), pass _seed through — it makes
  // the cast noticeably more stable.
  const key = config.imageKey();
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1536',   // closest to 9:16 offered; Remotion covers the rest
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`Image API failed ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
  const first = body.data[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, 'base64');
  if (first?.url) return Buffer.from(await (await fetch(first.url)).arrayBuffer());
  throw new Error('Image API returned neither b64_json nor url');
}

/** Generate one image per beat (index 0 = hook). Content-hash cached, so a
 *  recurring character in a recurring situation costs nothing after its first
 *  appearance — which is most of what a cast-driven channel produces. */
export async function generateVisuals(script: Script, castIds: string[], outDir: string): Promise<VisualManifest> {
  mkdirSync(CACHE, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const cues = [
    { beatIndex: 0, cue: `${script.hook.text} — establishing shot`, ids: castIds },
    ...script.beats.map((b, i) => ({
      beatIndex: i + 1,
      cue: b.visualCue,
      ids: b.speakerId ? [b.speakerId] : castIds,
    })),
  ];

  const images: VisualManifest['images'] = [];
  for (const { beatIndex, cue, ids } of cues) {
    const { prompt, seed } = promptFor(cue, ids);
    const key = cacheKey(prompt, seed);
    const cached = join(CACHE, `${key}.png`);

    if (!existsSync(cached)) {
      writeFileSync(cached, await callImageApi(prompt, seed));
    }
    images.push({ beatIndex, path: cached, cacheKey: key });
  }
  return { images };
}
