import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.ts';

export type CostEntry = {
  at: string;
  ideaId: string;
  stage: 'script' | 'ideate' | 'metadata' | 'voice' | 'visual';
  usd: number;
  detail: string;
};

const PATH = join(process.cwd(), 'state', 'costs.json');

/** Per-unit prices. Update these when a provider changes pricing — an
 *  out-of-date table makes the ceiling silently wrong in the dangerous
 *  direction. Last checked: 2026-08. */
export const PRICES = {
  /** Claude Sonnet, USD per million tokens. */
  llmInputPerM: 3,
  llmOutputPerM: 15,
  /** OpenAI tts-1-hd, USD per million characters. */
  ttsPerMChars: 30,
  /** gpt-image-1, USD per generated image at 1024x1536. Varies with quality —
   *  verify against your own billing after the first week. */
  perImage: 0.08,
} as const;

/** The run currently being billed. Set once by the CLI so the LLM and asset
 *  layers can attribute spend without threading an id through every call. */
let currentIdeaId = 'unattributed';
export function billTo(ideaId: string): void {
  currentIdeaId = ideaId;
}

function read(): CostEntry[] {
  if (!existsSync(PATH)) return [];
  return JSON.parse(readFileSync(PATH, 'utf8')) as CostEntry[];
}

export function record(stage: CostEntry['stage'], usd: number, detail: string): void {
  const all = read();
  all.push({ at: new Date().toISOString(), ideaId: currentIdeaId, stage, usd, detail });
  mkdirSync(join(process.cwd(), 'state'), { recursive: true });
  writeFileSync(PATH, JSON.stringify(all, null, 2) + '\n');
}

export const recordLlm = (stage: CostEntry['stage'], inTok: number, outTok: number) =>
  record(
    stage,
    (inTok / 1e6) * PRICES.llmInputPerM + (outTok / 1e6) * PRICES.llmOutputPerM,
    `${inTok} in / ${outTok} out`,
  );

export const recordTts = (chars: number) =>
  record('voice', (chars / 1e6) * PRICES.ttsPerMChars, `${chars} chars`);

export const recordImage = (n: number) =>
  record('visual', n * PRICES.perImage, `${n} image${n === 1 ? '' : 's'}`);

export function monthToDate(): number {
  const prefix = new Date().toISOString().slice(0, 7); // YYYY-MM
  return read()
    .filter(e => e.at.startsWith(prefix))
    .reduce((sum, e) => sum + e.usd, 0);
}

export function forIdea(ideaId: string): number {
  return read().filter(e => e.ideaId === ideaId).reduce((sum, e) => sum + e.usd, 0);
}

/** Call before any stage that spends. Halts rather than quietly overrunning —
 *  a runaway loop is the failure mode this exists to catch. */
export function assertUnderCeiling(): void {
  const spent = monthToDate();
  const ceiling = config.costCeilingUsd();
  if (spent >= ceiling) {
    throw new Error(
      `Month-to-date spend $${spent.toFixed(2)} has reached the $${ceiling} ceiling. ` +
      `Raise MONTHLY_COST_CEILING_USD in .env, or wait for the month to roll over.`,
    );
  }
}
