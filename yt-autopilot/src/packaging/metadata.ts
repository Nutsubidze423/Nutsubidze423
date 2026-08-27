import { askJson } from '../llm.ts';
import { z } from 'zod';
import type { Script } from '../types.ts';
import { state } from '../state.ts';

const Meta = z.object({
  title: z.string().max(100),
  description: z.string().max(4900),
  tags: z.array(z.string()).max(15),
});
export type Meta = z.infer<typeof Meta>;

/** Pick from the candidates the writer produced, using what actually performed.
 *  Once metrics.json has data, this stops being a guess. */
export async function buildMetadata(script: Script, castIds: string[]): Promise<Meta> {
  const published = state.published.all();
  const metrics = state.metrics.all();

  const history = published
    .map(p => {
      const m = metrics.find(x => x.videoId === p.videoId);
      return m ? `"${p.title}" → ${m.views} views, ${m.avgViewPercentage.toFixed(0)}% watched` : null;
    })
    .filter(Boolean)
    .slice(-25)
    .join('\n');

  const names = castIds.map(id => state.cast.byId(id)?.name).filter(Boolean).join(', ');

  return askJson({
    system:
      'You write YouTube Shorts metadata. Titles are short, concrete, and curiosity-driven ' +
      'without being clickbait the video fails to deliver. Never use hashtags in the title.',
    prompt: `
Pick and refine the best title for this Short.

CANDIDATES: ${JSON.stringify(script.titleCandidates)}
HOOK: ${script.hook.text}
PAYOFF: ${script.payoff}
CHARACTERS: ${names || 'none'}

${history ? `WHAT THIS CHANNEL'S TITLES ACTUALLY DID:\n${history}\n` : 'No performance history yet — pick on merit.\n'}

Return ONLY JSON: {"title":"<=80 chars","description":"2-3 lines then #Shorts","tags":["..."]}
`.trim(),
    maxTokens: 800,
    validate: raw => Meta.parse(raw),
  });
}
