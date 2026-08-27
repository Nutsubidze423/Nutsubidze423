import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { askJson } from '../llm.ts';
import { state } from '../state.ts';
import { Idea } from '../types.ts';

const Raw = z.object({
  ideas: z.array(z.object({
    premise: z.string(),
    hook: z.string(),
    castIds: z.array(z.string()),
    evidence: z.string(),
  })),
});

/**
 * Day-one ideation: generate premises from the cast and the bible alone.
 *
 * Deliberately NOT trend-mining. Trend scoring needs a back catalogue to
 * measure novelty against and published metrics to weight by — on a new
 * channel both are empty, and a scorer with no signal just launders randomness
 * through arithmetic. Add src/ideate/score.ts once metrics.json has ~30 rows.
 */
export async function generateIdeas(count = 20): Promise<Idea[]> {
  const cast = state.cast.all();
  const bible = state.bible();
  const recent = state.published.all().slice(-40).map(p => p.title);

  if (cast.length === 0) throw new Error('content/cast.json is empty — define the cast first.');

  const { ideas } = await askJson({
    system:
      'You generate premises for an absurdist meme Shorts channel with a recurring cast. ' +
      'Premises are situations, not jokes — the script stage writes the jokes. ' +
      'Each premise must put at least one cast member somewhere their fixed personality ' +
      'creates the comedy by itself.',
    prompt: `
THE CAST:
${cast.map(c => `- ${c.name} (id: ${c.id}) — ${c.personality}`).join('\n')}

BIBLE:
${bible}

${recent.length ? `ALREADY MADE — do not repeat these situations:\n${recent.map(t => `- ${t}`).join('\n')}` : 'Nothing published yet.'}

Generate ${count} distinct premises. Vary the setting hard — do not give me
${count} variations of one situation. Return ONLY JSON:
{"ideas":[{"premise":"one sentence","hook":"the opening line, max 12 words","castIds":["..."],"evidence":"why this one works"}]}
`.trim(),
    maxTokens: 4000,
    validate: raw => Raw.parse(raw),
  });

  return ideas.map(i => Idea.parse({
    ...i,
    id: randomUUID().slice(0, 8),
    score: 0,
    source: 'cast-lore' as const,
    createdAt: new Date().toISOString(),
  }));
}
