import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { state } from './state.ts';
import { monthToDate } from './cost.ts';
import { libraryStatus } from './visual/library.ts';
import { config } from './config.ts';

type Check = { ok: boolean; label: string; detail?: string; fatal: boolean };

/** Preflight. Every failure here is one that would otherwise surface halfway
 *  through a run, after money has already been spent. */
export function doctor(): Check[] {
  const checks: Check[] = [];
  const env = (k: string) => (process.env[k] ?? '').trim().length > 0;

  for (const key of ['ANTHROPIC_API_KEY', 'TTS_API_KEY', 'IMAGE_API_KEY']) {
    checks.push({ ok: env(key), label: key, fatal: true, detail: env(key) ? 'set' : 'missing — see .env.example' });
  }
  for (const key of ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']) {
    checks.push({
      ok: env(key),
      label: key,
      fatal: false,
      detail: env(key) ? 'set' : 'missing — only needed to publish',
    });
  }

  const cast = state.cast.all();
  const placeholders = cast.filter(c => c.name.includes('PLACEHOLDER') || c.id.startsWith('placeholder'));
  checks.push({
    ok: cast.length > 0 && placeholders.length === 0,
    label: 'content/cast.json',
    fatal: true,
    detail: cast.length === 0
      ? 'empty — define the cast first'
      : placeholders.length > 0
        ? `${placeholders.length} placeholder character(s) still present`
        : `${cast.length} characters: ${cast.map(c => c.name).join(', ')}`,
  });

  const bible = state.bible();
  const brackets = bible.match(/\[[A-Z][^\]]*\]/g) ?? [];
  checks.push({
    ok: bible.length > 0 && brackets.length === 0,
    // Not fatal: the pipeline runs with an unfinished bible, it just writes
    // in nobody's voice in particular.
    fatal: false,
    label: 'content/bible.md',
    detail: bible.length === 0
      ? 'missing'
      : brackets.length > 0
        ? `${brackets.length} unfilled section(s): ${brackets.slice(0, 2).join(', ')}`
        : 'complete',
  });

  const queue = state.queue.all();
  checks.push({
    ok: queue.length > 0,
    label: 'state/queue.json',
    fatal: false,
    detail: queue.length ? `${queue.length} idea(s) queued` : 'empty — run: npm run ideate',
  });

  try {
    const lib = libraryStatus();
    checks.push({
      ok: lib.missing.length === 0,
      label: 'asset library',
      fatal: true,
      detail: lib.missing.length === 0
        ? `${lib.total} assets present`
        : `${lib.present}/${lib.total} present — missing ${lib.missing.slice(0, 4).join(', ')}${lib.missing.length > 4 ? '…' : ''}. Run: npm run library`,
    });
  } catch (err) {
    checks.push({ ok: false, label: 'asset library', fatal: true, detail: String(err instanceof Error ? err.message : err) });
  }

  const spent = monthToDate();
  const ceiling = config.costCeilingUsd();
  checks.push({
    ok: spent < ceiling,
    label: 'cost ceiling',
    fatal: true,
    detail: `$${spent.toFixed(2)} of $${ceiling} used this month`,
  });

  checks.push({
    ok: config.dryRun(),
    label: 'DRY_RUN',
    fatal: false,
    detail: config.dryRun() ? 'true — uploads are simulated' : 'FALSE — uploads are REAL',
  });

  const looks = new Set(cast.map(c => c.look));
  checks.push({
    ok: looks.size === cast.length,
    label: 'cast look strings',
    fatal: false,
    detail: looks.size === cast.length
      ? 'all distinct'
      : 'duplicate look strings — characters will render identically',
  });

  return checks;
}

export function printDoctor(): boolean {
  const checks = doctor();
  const pad = Math.max(...checks.map(c => c.label.length));
  for (const c of checks) {
    const mark = c.ok ? '  ok  ' : c.fatal ? ' FAIL ' : ' warn ';
    console.log(`${mark} ${c.label.padEnd(pad)}  ${c.detail ?? ''}`);
  }
  const fatals = checks.filter(c => !c.ok && c.fatal);
  console.log(fatals.length ? `\n${fatals.length} blocking problem(s).` : '\nReady.');
  return fatals.length === 0;
}
