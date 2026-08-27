import { existsSync } from 'node:fs';
import type { Script, VisualManifest } from '../types.ts';
import { spritePath, backgroundPath } from './library.ts';
import { state } from '../state.ts';

/**
 * Map a script onto library assets. No generation, no API calls, no cost —
 * the writer picked from enumerated ids, so this is pure lookup.
 */
export function resolveVisuals(script: Script): VisualManifest {
  const frames: VisualManifest['frames'] = [];

  const resolve = (beatIndex: number, speakerId: string | null, backgroundId: string, pose: string) => {
    const bg = backgroundPath(backgroundId);
    if (!existsSync(bg)) {
      throw new Error(`Background "${backgroundId}" is not in the library. Run: npm run library`);
    }

    let sprite: string | null = null;
    if (speakerId) {
      const character = state.cast.byId(speakerId);
      if (!character) throw new Error(`Beat ${beatIndex} names unknown character "${speakerId}".`);
      // Fall back to a pose the character does have rather than failing the
      // whole build over one bad pick.
      const chosen = character.poses.includes(pose) ? pose : character.poses[0]!;
      sprite = spritePath(speakerId, chosen);
      if (!existsSync(sprite)) {
        throw new Error(`Sprite ${speakerId}/${chosen} is not in the library. Run: npm run library`);
      }
    }
    frames.push({ beatIndex, backgroundPath: bg, spritePath: sprite });
  };

  // The hook borrows the first beat's setting so the video opens in the place
  // it is about, rather than cutting into it a beat later.
  const first = script.beats[0];
  resolve(0, script.hook.speakerId, first?.backgroundId ?? 'void', 'closeup');
  script.beats.forEach((b, i) => resolve(i + 1, b.speakerId, b.backgroundId, b.pose));

  return { frames };
}
