import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.ts';
import { state } from '../state.ts';
import { recordImage, assertUnderCeiling } from '../cost.ts';

/**
 * The asset library.
 *
 * Generating a fresh image per beat costs roughly $0.50 a video and still
 * produces a character who looks subtly different every time, because the
 * model re-rolls the design on every call. Building a fixed library once and
 * compositing from it is both cheaper and better: the cast is pixel-identical
 * across the whole catalogue, builds need no image API at all, and sprites can
 * actually be animated — which a freshly generated still can never be.
 *
 * Cost: ~$3 once. Then $0 per video, forever.
 */

const LIB = join(process.cwd(), 'assets', 'library');

/** Shared across every asset so the library reads as one world. */
const STYLE =
  'surreal 3d render, glossy plastic materials, saturated colors, ' +
  'harsh direct flash lighting, centered subject, no text, no watermark';

const POSE_DIRECTION: Record<string, string> = {
  neutral: 'standing still, facing camera, arms at sides, blank expression',
  talking: 'mouth open mid-sentence, facing camera, slight forward lean',
  alarmed: 'recoiling backwards, eyes wide, both limbs raised',
  gesturing: 'one limb extended outward as if explaining something obvious',
  closeup: 'extreme close-up of the head only, filling the frame, facing camera',
};

export type Scenery = { id: string; prompt: string };

function scenery(): Scenery[] {
  const p = join(process.cwd(), 'content', 'scenery.json');
  if (!existsSync(p)) throw new Error('content/scenery.json is missing.');
  return JSON.parse(readFileSync(p, 'utf8')) as Scenery[];
}

const key = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

async function generate(prompt: string, transparent: boolean): Promise<Buffer> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.imageKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1536',
      n: 1,
      // Sprites need alpha so they can be composited over any background.
      ...(transparent ? { background: 'transparent', output_format: 'png' } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Image API failed ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
  const first = body.data[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, 'base64');
  if (first?.url) return Buffer.from(await (await fetch(first.url)).arrayBuffer());
  throw new Error('Image API returned neither b64_json nor url');
}

export const spritePath = (charId: string, pose: string) =>
  join(LIB, 'sprites', `${charId}-${pose}.png`);
export const backgroundPath = (id: string) => join(LIB, 'backgrounds', `${id}.png`);

/** Idempotent. Only generates what is missing, so re-running after adding a
 *  character or a location costs only the new assets. */
export async function buildLibrary(opts: { dryRun?: boolean } = {}): Promise<void> {
  const cast = state.cast.all();
  if (cast.length === 0) throw new Error('content/cast.json is empty.');

  mkdirSync(join(LIB, 'sprites'), { recursive: true });
  mkdirSync(join(LIB, 'backgrounds'), { recursive: true });

  const jobs: { path: string; prompt: string; transparent: boolean; label: string }[] = [];

  for (const c of cast) {
    for (const pose of c.poses) {
      const direction = POSE_DIRECTION[pose];
      if (!direction) throw new Error(`Unknown pose "${pose}" on ${c.name}. Add it to POSE_DIRECTION.`);
      jobs.push({
        path: spritePath(c.id, pose),
        // The locked look string carries identity; the pose only changes posture.
        prompt: `${c.look}. ${direction}. Full figure isolated on a transparent background. ${STYLE}`,
        transparent: true,
        label: `${c.name} / ${pose}`,
      });
    }
  }
  for (const s of scenery()) {
    jobs.push({
      path: backgroundPath(s.id),
      prompt: `${s.prompt}. Empty scene, nothing in the foreground. ${STYLE}`,
      transparent: false,
      label: `background / ${s.id}`,
    });
  }

  const missing = jobs.filter(j => !existsSync(j.path));
  if (missing.length === 0) {
    console.log(`Library complete — ${jobs.length} assets, nothing to generate.`);
    return;
  }

  console.log(`${jobs.length} assets in library, ${missing.length} missing.`);
  if (opts.dryRun) {
    missing.forEach(j => console.log(`  would generate: ${j.label}`));
    console.log(`\nEstimated one-time cost: $${(missing.length * 0.08).toFixed(2)}`);
    return;
  }

  for (const [i, job] of missing.entries()) {
    assertUnderCeiling();
    console.log(`  [${i + 1}/${missing.length}] ${job.label}`);
    writeFileSync(job.path, await generate(job.prompt, job.transparent));
    recordImage(1);
  }
  console.log('Library built.');
}

/** Verify every asset the writer is allowed to reference actually exists. */
export function libraryStatus(): { total: number; present: number; missing: string[] } {
  const cast = state.cast.all();
  const expected: { path: string; label: string }[] = [
    ...cast.flatMap(c => c.poses.map(p => ({ path: spritePath(c.id, p), label: `${c.id}/${p}` }))),
    ...scenery().map(s => ({ path: backgroundPath(s.id), label: `bg/${s.id}` })),
  ];
  const missing = expected.filter(e => !existsSync(e.path)).map(e => e.label);
  return { total: expected.length, present: expected.length - missing.length, missing };
}

export { scenery };
