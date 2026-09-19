import { state } from '../state.ts';

/**
 * Retention circuit breaker.
 *
 * An unattended pipeline with no brakes will happily publish two hundred
 * videos nobody watches. That is the exact profile — high volume, no
 * engagement — that gets a channel actioned, and it is also just waste.
 *
 * So: if recent videos are not being watched, stop publishing and say so.
 * Production continues, so the artifacts are there to look at; only the
 * upload is held.
 */

export type BreakerVerdict =
  | { tripped: false; reason: string }
  | { tripped: true; reason: string };

/** Below this average view percentage, viewers are swiping past. */
const FLOOR = Number(process.env.RETENTION_FLOOR ?? '30');
/** Judge on a window, never one bad video. */
const WINDOW = Number(process.env.RETENTION_WINDOW ?? '10');

export function check(): BreakerVerdict {
  if (process.env.DISABLE_BREAKER === 'true') {
    return { tripped: false, reason: 'breaker disabled' };
  }

  const published = state.published.all();
  const metrics = state.metrics.all();

  const recent = published
    .slice(-WINDOW)
    .map(p => metrics.find(m => m.videoId === p.videoId))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  // A new channel has no data, and analytics lags publication by a day or
  // two. Needing most of the window present stops the breaker firing on
  // absence of evidence.
  if (recent.length < Math.ceil(WINDOW * 0.6)) {
    return { tripped: false, reason: `only ${recent.length} of ${WINDOW} recent videos have metrics yet` };
  }

  const avg = recent.reduce((sum, m) => sum + m.avgViewPercentage, 0) / recent.length;
  const views = recent.reduce((sum, m) => sum + m.views, 0);

  if (avg < FLOOR) {
    return {
      tripped: true,
      reason:
        `Average view percentage over the last ${recent.length} videos is ` +
        `${avg.toFixed(1)}%, below the ${FLOOR}% floor (${views} total views). ` +
        `Publishing is held. The format is not landing — change it, or lower ` +
        `RETENTION_FLOOR if you disagree with the floor.`,
    };
  }

  return { tripped: false, reason: `retention ${avg.toFixed(1)}% over last ${recent.length}` };
}
