import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.ts';
import { recordEmbed } from '../cost.ts';

/**
 * Premise-level novelty, against the whole catalogue.
 *
 * The previous guard compared the last 40 *titles*, which failed twice over:
 * two videos with the same situation and different titles both passed, and at
 * any real cadence 40 videos is only a few weeks of memory — month two starts
 * regenerating month one. Embedding the premise and checking every one ever
 * made fixes both, and costs about two thousandths of a cent per check.
 */

const PATH = join(process.cwd(), 'state', 'premises.json');
/** 256 dims is plenty for short premises and keeps the state file small. */
const DIMS = 256;
/** Tuned to reject "same situation, different words" while allowing a
 *  recurring character in a genuinely new predicament. Raise it if good
 *  ideas are being rejected; lower it if reruns slip through. */
export const SIMILARITY_LIMIT = 0.82;

export type PremiseRecord = { id: string; premise: string; vector: number[] };

function load(): PremiseRecord[] {
  if (!existsSync(PATH)) return [];
  return JSON.parse(readFileSync(PATH, 'utf8')) as PremiseRecord[];
}

function save(rows: PremiseRecord[]): void {
  mkdirSync(join(process.cwd(), 'state'), { recursive: true });
  writeFileSync(PATH, JSON.stringify(rows, null, 2) + '\n');
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ttsKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts, dimensions: DIMS }),
  });
  if (!res.ok) throw new Error(`Embeddings failed ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as {
    data: { index: number; embedding: number[] }[];
    usage: { total_tokens: number };
  };
  recordEmbed(body.usage.total_tokens);
  // The API does not guarantee order; index is authoritative.
  return body.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

/** Both vectors come back L2-normalised, so the dot product is the cosine. */
export function cosine(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i]! * b[i]!;
  return sum;
}

export type Screened<T> = { kept: T[]; rejected: { item: T; nearest: string; score: number }[] };

/**
 * Drop candidates too close to anything already made — and to each other,
 * since one batch routinely contains three versions of the same joke.
 */
export async function screen<T extends { id: string; premise: string }>(
  candidates: T[],
): Promise<Screened<T>> {
  if (candidates.length === 0) return { kept: [], rejected: [] };

  const history = load();
  const vectors = await embed(candidates.map(c => c.premise));

  const kept: T[] = [];
  const keptVectors: number[][] = [];
  const rejected: Screened<T>['rejected'] = [];

  for (const [i, candidate] of candidates.entries()) {
    const vector = vectors[i]!;

    let nearest = '';
    let best = 0;
    for (const row of history) {
      const score = cosine(vector, row.vector);
      if (score > best) { best = score; nearest = row.premise; }
    }
    for (const [j, other] of keptVectors.entries()) {
      const score = cosine(vector, other);
      if (score > best) { best = score; nearest = kept[j]!.premise; }
    }

    if (best >= SIMILARITY_LIMIT) {
      rejected.push({ item: candidate, nearest, score: best });
    } else {
      kept.push(candidate);
      keptVectors.push(vector);
    }
  }
  return { kept, rejected };
}

/** Called once a premise is actually committed to, not when it is generated. */
export async function remember(id: string, premise: string): Promise<void> {
  const [vector] = await embed([premise]);
  if (!vector) return;
  save([...load(), { id, premise, vector: vector.map(v => Number(v.toFixed(5))) }]);
}

export { load as loadPremises };
