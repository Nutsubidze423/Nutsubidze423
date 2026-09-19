import { createHash } from 'node:crypto';

/**
 * Per-video visual treatment.
 *
 * Identical framing on every upload is the visual half of the template
 * fingerprint. Derived from the video id so it is stable across re-renders
 * (a re-render must not produce a different video) but varied across the
 * catalogue.
 */

export type Treatment = {
  captionPosition: 'low' | 'centre';
  captionGroup: 2 | 3 | 4;
  bgMotion: 'in' | 'out' | 'driftLeft' | 'driftRight';
  spriteEntry: 'spring' | 'slide' | 'pop';
  showProgress: boolean;
  accent: string;
};

/** Three accents that all read as the same channel; nothing off-brand. */
const ACCENTS = ['#ffe14d', '#7cf5a0', '#ff8ad4'];

export function treatmentFor(id: string): Treatment {
  const h = createHash('sha256').update(id).digest();
  const at = (i: number, n: number) => h[i]! % n;

  return {
    captionPosition: at(0, 4) === 0 ? 'centre' : 'low',
    captionGroup: ([2, 3, 3, 4] as const)[at(1, 4)]!,
    bgMotion: (['in', 'in', 'out', 'driftLeft', 'driftRight'] as const)[at(2, 5)]!,
    spriteEntry: (['spring', 'spring', 'slide', 'pop'] as const)[at(3, 4)]!,
    // Mostly on — it measurably helps watch-through — but not universally.
    showProgress: at(4, 5) !== 0,
    accent: ACCENTS[at(5, ACCENTS.length)]!,
  };
}
