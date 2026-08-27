import { readFileSync, writeFileSync } from 'node:fs';
import type { WordTiming, AudioManifest } from '../types.ts';
import { msToFrames } from '../config.ts';
import type { Line } from './tts.ts';

/** Minimal WAV reader. We only ever handle files we generated ourselves, so
 *  this assumes canonical PCM with a 44-byte header rather than walking chunks. */
type Wav = { header: Buffer; pcm: Buffer; byteRate: number; durationMs: number };

function readWav(path: string): Wav {
  const buf = readFileSync(path);
  if (buf.subarray(0, 4).toString('ascii') !== 'RIFF' || buf.subarray(8, 12).toString('ascii') !== 'WAVE') {
    throw new Error(`Not a WAV file: ${path}`);
  }
  // Walk chunks to find 'data' — the header is not always exactly 44 bytes.
  let offset = 12;
  let dataStart = -1;
  let dataLen = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.subarray(offset, offset + 4).toString('ascii');
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'data') { dataStart = offset + 8; dataLen = size; break; }
    offset += 8 + size + (size % 2);
  }
  if (dataStart < 0) throw new Error(`No data chunk in ${path}`);

  const byteRate = buf.readUInt32LE(28);
  const pcm = buf.subarray(dataStart, dataStart + dataLen);
  return { header: buf.subarray(0, dataStart), pcm, byteRate, durationMs: (pcm.length / byteRate) * 1000 };
}

/**
 * Distribute a line's words across its known duration, weighted by character
 * length. This is proportional estimation, not true forced alignment — but
 * because each line is synthesized separately we know every line boundary
 * exactly, so drift is bounded within one short line and never accumulates.
 * That is accurate enough for karaoke captions.
 *
 * Upgrade path: swap this function for whisper-timestamped output. Nothing
 * else in the pipeline changes — the WordTiming[] contract stays the same.
 */
function distributeWords(text: string, startMs: number, durationMs: number): WordTiming[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const weights = words.map(w => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1);
  const total = weights.reduce((a, b) => a + b, 0);

  let cursor = startMs;
  return words.map((word, i) => {
    const share = (weights[i]! / total) * durationMs;
    const timing = { word, startMs: Math.round(cursor), endMs: Math.round(cursor + share) };
    cursor += share;
    return timing;
  });
}

/** Concatenate the per-line WAVs into one track and emit the timing manifest.
 *  Pure Node — no ffmpeg needed for the voice bed. */
export function buildAudioManifest(lines: Line[], outPath: string): AudioManifest {
  const wavs = lines.map(l => readWav(l.path));
  const byteRate = wavs[0]!.byteRate;

  const words: WordTiming[] = [];
  const durations: number[] = [];
  let cursorMs = 0;

  for (const [i, wav] of wavs.entries()) {
    words.push(...distributeWords(lines[i]!.text, cursorMs, wav.durationMs));
    durations.push(wav.durationMs);
    cursorMs += wav.durationMs;
  }

  const pcm = Buffer.concat(wavs.map(w => w.pcm));
  const header = Buffer.from(wavs[0]!.header);
  header.writeUInt32LE(header.length + pcm.length - 8, 4);      // RIFF size
  header.writeUInt32LE(pcm.length, header.length - 4);          // data size
  writeFileSync(outPath, Buffer.concat([header, pcm]));

  // Index 0 is the hook, last is the payoff; the middle are the beats.
  const [hookMs, ...rest] = durations;
  const beatMs = rest.slice(0, -1);
  const payoffMs = rest.at(-1) ?? 0;

  return {
    voicePath: outPath,
    durationMs: cursorMs,
    words,
    hookFrames: msToFrames(hookMs ?? 0),
    // Fold the payoff into the final beat so the picture holds through it.
    beatFrames: beatMs.map((ms, i) => msToFrames(i === beatMs.length - 1 ? ms + payoffMs : ms)),
  };
}

export { readWav };
