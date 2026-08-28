import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia, ensureBrowser } from '@remotion/renderer';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { RenderProps } from './types.ts';

/** Programmatic render, so CI runs one command instead of a shell incantation. */
export async function render(ideaId: string): Promise<string> {
  const dir = join(process.cwd(), 'out', ideaId);
  const props = JSON.parse(readFileSync(join(dir, 'props.json'), 'utf8')) as RenderProps;
  const outputLocation = join(dir, 'video.mp4');

  await ensureBrowser();

  const serveUrl = await bundle({
    entryPoint: join(process.cwd(), 'remotion', 'index.ts'),
    onProgress: () => undefined,
  });

  const composition = await selectComposition({
    serveUrl,
    id: 'Short',
    inputProps: props as unknown as Record<string, unknown>,
  });

  let lastPct = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation,
    inputProps: props as unknown as Record<string, unknown>,
    // Shorts are re-encoded hard by YouTube; give it a clean high-bitrate source.
    crf: 18,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct >= lastPct + 10) {
        lastPct = pct;
        console.log(`  render ${pct}%`);
      }
    },
  });

  return outputLocation;
}
