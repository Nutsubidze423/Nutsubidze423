import { google } from 'googleapis';
import { config } from '../config.ts';
import { state } from '../state.ts';
import type { Metrics } from '../types.ts';

function auth() {
  const { clientId, clientSecret, refreshToken } = config.youtube();
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Pull lifetime performance for every published video.
 *
 * averageViewPercentage is the number that matters on Shorts — it is the
 * closest thing to "did anyone actually watch this", and it is what the
 * circuit breaker reads.
 */
export async function fetchMetrics(): Promise<Metrics[]> {
  const published = state.published.all();
  if (published.length === 0) return [];

  const analytics = google.youtubeAnalytics({ version: 'v2', auth: auth() });
  const earliest = published
    .map(p => p.publishedAt)
    .sort()[0]!
    .slice(0, 10);

  const out: Metrics[] = [];

  // One request per video: the API returns a row per video only when the
  // dimension is requested, and per-video filters are the reliable path.
  for (const video of published) {
    try {
      const res = await analytics.reports.query({
        ids: 'channel==MINE',
        startDate: earliest,
        endDate: day(new Date()),
        metrics: 'views,averageViewPercentage,likes,comments,shares',
        filters: `video==${video.videoId}`,
      });

      const row = res.data.rows?.[0] as number[] | undefined;
      if (!row) continue;

      out.push({
        videoId: video.videoId,
        fetchedAt: new Date().toISOString(),
        views: row[0] ?? 0,
        avgViewPercentage: row[1] ?? 0,
        likes: row[2] ?? 0,
        comments: row[3] ?? 0,
        shares: row[4] ?? 0,
      });
    } catch (err) {
      // A single video failing must not lose the rest of the pull. Analytics
      // also lags publication by a day or two, so misses are expected.
      console.warn(`  metrics unavailable for ${video.videoId}: ${String(err instanceof Error ? err.message : err)}`);
    }
  }

  state.metrics.save(out);
  return out;
}
