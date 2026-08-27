import { Script, type Idea, type Character } from '../types.ts';
import { askJson, askText } from '../llm.ts';
import { WRITER_SYSTEM, CRITIC_SYSTEM } from './prompts.ts';
import { state } from '../state.ts';
import { scenery } from '../visual/library.ts';
import { MAX_DURATION_SEC } from '../config.ts';

/** Spoken-word estimate. Deliberately conservative: overrunning 60s gets the
 *  Short truncated by YouTube, which is worse than running short. */
const WORDS_PER_SEC = 2.6;

export function estimateSeconds(s: Pick<Script, 'hook' | 'beats' | 'payoff'>): number {
  const words = [s.hook.text, ...s.beats.map(b => b.text), s.payoff]
    .join(' ')
    .trim()
    .split(/\s+/).length;
  return words / WORDS_PER_SEC;
}

async function draft(idea: Idea, cast: Character[], bible: string, backgrounds: string[], notes?: string[]): Promise<Script> {
  const prompt = `
Write the Short for this premise.

PREMISE: ${idea.premise}
OPENING ANGLE: ${idea.hook}
CHARACTERS IN THIS ONE: ${idea.castIds.join(', ') || 'your choice from the cast'}
${notes?.length ? `\nThe previous draft was rejected. Fix exactly these:\n${notes.map(n => `- ${n}`).join('\n')}` : ''}

Return ONLY a JSON object:
{
  "ideaId": ${JSON.stringify(idea.id)},
  "hook": {"text": "...", "speakerId": "<cast id or null>"},
  "beats": [{"text":"...","speakerId":"<cast id>","backgroundId":"<id from the list>","pose":"<pose id>","onScreen":"WORD or null"}],
  "payoff": "...",
  "titleCandidates": ["...","...","...","...","..."],
  "estimatedSeconds": 0
}

Write the five titleCandidates BEFORE the script, then write a script that
delivers what they promise. A title retrofitted to a finished script produces
the promise mismatch that kills watch-through.
`.trim();

  return askJson({
    system: WRITER_SYSTEM(bible, cast, backgrounds),
    prompt,
    maxTokens: 3000,
    stage: 'script',
    validate: raw => {
      const parsed = Script.parse(raw);
      return { ...parsed, estimatedSeconds: estimateSeconds(parsed) };
    },
  });
}

/** Two passes. Costs pennies and lifts quality more than any other single
 *  intervention in the pipeline. */
export async function generateScript(idea: Idea): Promise<Script> {
  const cast = state.cast.all();
  const bible = state.bible();
  const backgrounds = scenery().map(s => s.id);

  let script = await draft(idea, cast, bible, backgrounds);

  for (let round = 0; round < 2; round++) {
    const critique = await askText(
      CRITIC_SYSTEM,
      `Script under review:\n\n${JSON.stringify(script, null, 2)}`,
      'script',
      1024,
    );

    let verdict: { verdict: string; notes: string[] };
    try {
      const clean = critique.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      verdict = JSON.parse(clean);
    } catch {
      break; // Unparseable critique is not a reason to discard a valid draft.
    }

    if (verdict.verdict === 'pass') break;
    script = await draft(idea, cast, bible, backgrounds, verdict.notes);
  }

  if (script.estimatedSeconds > MAX_DURATION_SEC) {
    throw new Error(
      `Script estimates ${script.estimatedSeconds.toFixed(1)}s, over the ${MAX_DURATION_SEC}s Shorts ceiling. ` +
      `Rerun, or cut a beat by hand.`,
    );
  }
  return script;
}
