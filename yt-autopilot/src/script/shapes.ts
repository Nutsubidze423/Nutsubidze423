/**
 * Structural variety.
 *
 * One script shape across a whole catalogue is a fingerprint: thirty videos
 * that all run hook → escalate → payoff read as one template with the words
 * swapped, which is precisely the "repetitive" half of the inauthentic
 * content policy. It is also just boring. Rotating the shape changes the
 * rhythm, not only the content.
 */

export type ShapeId = 'escalation' | 'crosstalk' | 'list' | 'reversal' | 'interrogation';

export const SHAPES: Record<ShapeId, { label: string; direction: string; beats: [number, number] }> = {
  escalation: {
    label: 'Escalation',
    beats: [4, 6],
    direction:
      'Each beat raises the stakes of the one before it. Nothing is ever resolved, ' +
      'it only gets worse, and nobody involved treats that as unusual.',
  },
  crosstalk: {
    label: 'Crosstalk',
    beats: [4, 6],
    direction:
      'Two characters hold entirely separate conversations that never intersect. ' +
      'Each reply is coherent as a response to the wrong question. Do not have ' +
      'either of them notice.',
  },
  list: {
    label: 'The list',
    beats: [4, 7],
    direction:
      'One character enumerates items, rules, or symptoms. The list starts ' +
      'mundane and ends somewhere that should have stopped it three items ago. ' +
      'Another character reacts to exactly one item, and not the worst one.',
  },
  reversal: {
    label: 'Reversal',
    beats: [3, 5],
    direction:
      'Build a clear picture of the situation, then let the payoff reveal that ' +
      'one central fact was wrong the entire time. Everything before it must ' +
      'still make sense afterwards — plant the fact, do not withhold it.',
  },
  interrogation: {
    label: 'Interrogation',
    beats: [4, 6],
    direction:
      'One character asks increasingly reasonable questions. The other gives ' +
      'increasingly unreasonable answers, delivered with total confidence. ' +
      'The questioner never escalates their tone.',
  },
};

export const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[];

/**
 * Pick the shape used least recently. Deterministic given history, so the
 * catalogue cycles through all five rather than drifting toward whichever one
 * the model finds easiest to write.
 */
export function nextShape(recentShapes: ShapeId[]): ShapeId {
  const lastUsed = new Map<ShapeId, number>(SHAPE_IDS.map(id => [id, -1]));
  recentShapes.forEach((id, i) => { if (lastUsed.has(id)) lastUsed.set(id, i); });
  return [...lastUsed.entries()].sort((a, b) => a[1] - b[1])[0]![0];
}
