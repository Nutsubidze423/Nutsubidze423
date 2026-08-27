import 'node:process';

/** Shorts format constants. Changing these changes every downstream stage. */
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const MAX_DURATION_SEC = 60;
export const TARGET_DURATION_SEC = 52;
/** Hard cap on the hook. Shorts are decided in the first two seconds. */
export const MAX_HOOK_SEC = 2.5;

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}. See .env.example`);
  return v;
}
function opt(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  anthropicKey: () => req('ANTHROPIC_API_KEY'),
  ttsProvider: () => opt('TTS_PROVIDER', 'openai'),
  ttsKey: () => req('TTS_API_KEY'),
  imageKey: () => req('IMAGE_API_KEY'),
  youtube: () => ({
    clientId: req('YOUTUBE_CLIENT_ID'),
    clientSecret: req('YOUTUBE_CLIENT_SECRET'),
    refreshToken: req('YOUTUBE_REFRESH_TOKEN'),
  }),
  costCeilingUsd: () => Number(opt('MONTHLY_COST_CEILING_USD', '120')),
  /** Defaults to true. Publishing for real requires setting this explicitly. */
  dryRun: () => opt('DRY_RUN', 'true') !== 'false',
};

export const sec = (s: number) => Math.round(s * FPS);
export const msToFrames = (ms: number) => Math.round((ms / 1000) * FPS);
