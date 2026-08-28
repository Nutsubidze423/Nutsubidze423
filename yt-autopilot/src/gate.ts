import { randomUUID } from 'node:crypto';
import { state } from './state.ts';
import { Idea } from './types.ts';

/**
 * Parse the weekly selection issue back into the production queue.
 *
 * The issue body is the human gate's output and its audit trail. A ticked box
 * is an approval; text the human edited under a line overrides the generated
 * angle, which is how a 20-second edit becomes real creative direction.
 *
 * Expected shape per idea (as written by propose.yml):
 *   - [x] `a1b2c3d4` **The hook line**
 *         The premise, which the human may have rewritten.
 */
export function parseGate(body: string): Idea[] {
  const pool = state.ideas.all();
  const approved: Idea[] = [];

  const lines = body.split('\n');
  for (const [i, line] of lines.entries()) {
    const ticked = /^\s*-\s*\[[xX]\]\s/.test(line);
    if (!ticked) continue;

    const id = line.match(/`([^`]+)`/)?.[1];
    const hook = line.match(/\*\*(.+?)\*\*/)?.[1]?.trim();

    // The continuation line, if the human left one, is the premise.
    const next = lines[i + 1];
    const premise = next && !/^\s*-\s*\[/.test(next) ? next.trim() : undefined;

    const original = id ? pool.find(p => p.id === id) : undefined;

    if (!original && !hook) continue; // Not one of ours; ignore.

    approved.push(Idea.parse({
      id: original?.id ?? randomUUID().slice(0, 8),
      premise: premise || original?.premise || hook || '',
      hook: hook || original?.hook || '',
      castIds: original?.castIds ?? [],
      evidence: original?.evidence ?? 'Approved at the weekly gate.',
      score: original?.score ?? 0,
      // Anything the human touched is human-sourced, and that is the point.
      source: 'human' as const,
      createdAt: original?.createdAt ?? new Date().toISOString(),
    }));
  }
  return approved;
}

export function applyGate(body: string): number {
  const approved = parseGate(body);
  if (approved.length === 0) return 0;
  state.queue.save([...state.queue.all(), ...approved]);
  return approved.length;
}
