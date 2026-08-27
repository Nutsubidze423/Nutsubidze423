import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.ts';
import { state } from '../state.ts';
import type { Script } from '../types.ts';
import { recordTts, assertUnderCeiling } from '../cost.ts';

/** One voice per character, permanently. In the absence of a face, voice is
 *  the channel's only consistent identity signal — treat it as brand and
 *  never A/B it. */
function voiceFor(speakerId: string | null): string {
  if (!speakerId) return 'onyx'; // narrator, used sparingly
  return state.cast.byId(speakerId)?.voice ?? 'onyx';
}

async function openaiTts(text: string, voice: string): Promise<Buffer> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.ttsKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'tts-1-hd', voice, input: text, response_format: 'wav' }),
  });
  if (!res.ok) throw new Error(`TTS failed ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

export type Line = { text: string; speakerId: string | null; path: string };

/** Synthesize each line separately, as WAV. Per-line files are what let the
 *  renderer cut on real audio boundaries instead of guessing, and WAV keeps
 *  duration math exact with no ffprobe dependency. */
export async function synthesize(script: Script, outDir: string): Promise<Line[]> {
  const lines: { text: string; speakerId: string | null }[] = [
    { text: script.hook.text, speakerId: script.hook.speakerId },
    ...script.beats.map(b => ({ text: b.text, speakerId: b.speakerId })),
    { text: script.payoff, speakerId: null },
  ];

  const provider = config.ttsProvider();
  if (provider !== 'openai') {
    throw new Error(`TTS_PROVIDER="${provider}" not implemented yet — only "openai" is wired up.`);
  }

  assertUnderCeiling();
  recordTts(lines.reduce((n, l) => n + l.text.length, 0));

  const out: Line[] = [];
  for (const [i, line] of lines.entries()) {
    const audio = await openaiTts(line.text, voiceFor(line.speakerId));
    const path = `${outDir}/line-${String(i).padStart(2, '0')}.wav`;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, audio);
    out.push({ ...line, path });
  }
  return out;
}
