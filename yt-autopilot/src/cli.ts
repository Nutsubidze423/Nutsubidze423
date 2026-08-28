import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { state } from './state.ts';
import { generateScript } from './script/generate.ts';
import { generateIdeas } from './ideate/generate.ts';
import { synthesize } from './voice/tts.ts';
import { buildAudioManifest } from './voice/align.ts';
import { resolveVisuals } from './visual/resolve.ts';
import { buildLibrary, libraryStatus } from './visual/library.ts';
import { buildMetadata } from './packaging/metadata.ts';
import { upload } from './publish/youtube.ts';
import type { RenderProps, Idea } from './types.ts';
import { printDoctor } from './doctor.ts';
import { applyGate } from './gate.ts';
import { render } from './render.ts';
import { billTo, forIdea, monthToDate } from './cost.ts';

const OUT = join(process.cwd(), 'out');

function outDir(id: string): string {
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Build one Short end to end, stopping before upload. */
async function build(idea: Idea): Promise<string> {
  const dir = outDir(idea.id);
  billTo(idea.id);
  console.log(`\n[${idea.id}] ${idea.premise}`);

  console.log('  script…');
  const script = await generateScript(idea);
  writeFileSync(join(dir, 'script.json'), JSON.stringify(script, null, 2));
  console.log(`  script ok — ${script.beats.length} beats, ~${script.estimatedSeconds.toFixed(0)}s`);

  console.log('  voice…');
  const lines = await synthesize(script, dir);
  const audio = buildAudioManifest(lines, join(dir, 'voice.wav'));
  console.log(`  voice ok — ${(audio.durationMs / 1000).toFixed(1)}s actual, ${audio.words.length} words`);

  if (audio.durationMs > 60_000) {
    throw new Error(
      `Rendered audio is ${(audio.durationMs / 1000).toFixed(1)}s, over the 60s Shorts ceiling. ` +
      `The estimate said ${script.estimatedSeconds.toFixed(1)}s — cut a beat and rerun.`,
    );
  }

  const visuals = resolveVisuals(script);
  console.log(`  visuals ok — ${visuals.frames.length} frames from the library, $0.00`);

  const props: RenderProps = { script, audio, visuals };
  writeFileSync(join(dir, 'props.json'), JSON.stringify(props, null, 2));
  console.log(`  → ${join(dir, 'props.json')}`);
  console.log(`  cost: $${forIdea(idea.id).toFixed(3)} this video, $${monthToDate().toFixed(2)} month to date`);
  return dir;
}

async function publishOne(idea: Idea): Promise<void> {
  const dir = join(OUT, idea.id);
  const videoPath = join(dir, 'video.mp4');
  if (!existsSync(videoPath)) throw new Error(`No render at ${videoPath}. Run: npm run render -- ${idea.id}`);

  const props: RenderProps = JSON.parse(readFileSync(join(dir, 'props.json'), 'utf8'));
  billTo(idea.id);
  const meta = await buildMetadata(props.script, idea.castIds);
  console.log(`  title: ${meta.title}`);

  const res = await upload(videoPath, meta);
  if (!res.dryRun) {
    state.published.add({
      ideaId: idea.id,
      videoId: res.videoId,
      title: meta.title,
      publishedAt: new Date().toISOString(),
      castIds: idea.castIds,
      costUsd: forIdea(idea.id),
    });
  }
  console.log(res.dryRun ? '  dry run — not uploaded' : `  published: https://youtube.com/watch?v=${res.videoId}`);
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);

  switch (cmd) {
    case 'gate': {
      // Body arrives on stdin so the workflow needn't escape issue markdown.
      const body = readFileSync(0, 'utf8');
      const n = applyGate(body);
      console.log(`Queued ${n} approved idea(s).`);
      break;
    }

    case 'render': {
      const id = arg ?? state.queue.all()[0]?.id;
      if (!id) { console.error('Nothing to render.'); process.exit(1); }
      console.log(`Rendering ${id}…`);
      console.log(`  → ${await render(id)}`);
      break;
    }

    /** The whole loop, for CI: build → render → publish, per queued idea. */
    case 'run': {
      const queue = state.queue.all();
      if (queue.length === 0) { console.log('Queue is empty — nothing to do.'); break; }

      const remaining = [...queue];
      for (const idea of queue) {
        try {
          await build(idea);
          await render(idea.id);
          await publishOne(idea);
          remaining.shift();
          state.queue.save(remaining);
        } catch (err) {
          // One bad idea must not strand the rest of the week's queue.
          console.error(`\n[${idea.id}] failed: ${String(err instanceof Error ? err.message : err)}`);
          remaining.shift();
          state.queue.save(remaining);
        }
      }
      console.log(`\nTotal spend this month: $${monthToDate().toFixed(2)}`);
      break;
    }

    case 'library': {
      await buildLibrary({ dryRun: arg === '--dry' });
      break;
    }

    case 'doctor': {
      process.exit(printDoctor() ? 0 : 1);
      break;
    }

    case 'ideate': {
      const ideas = await generateIdeas(Number(arg) || 20);
      state.ideas.save(ideas);
      console.log(`Wrote ${ideas.length} ideas to state/ideas.json\n`);
      ideas.forEach((i, n) => console.log(`${String(n + 1).padStart(2)}. ${i.hook}\n    ${i.premise}\n`));
      console.log('Pick the ones you want and move them into state/queue.json.');
      break;
    }

    case 'build': {
      const idea = arg
        ? state.queue.all().find(i => i.id === arg)
        : state.queue.all()[0];
      if (!idea) {
        console.error('Nothing in state/queue.json. Add an idea, or run the weekly gate.');
        process.exit(1);
      }
      await build(idea);
      break;
    }

    case 'publish': {
      const id = arg ?? state.queue.all()[0]?.id;
      if (!id) { console.error('Usage: publish <ideaId>'); process.exit(1); }
      const idea = state.queue.all().find(i => i.id === id);
      await publishOne(idea ?? { id, castIds: [] } as unknown as Idea);
      break;
    }

    default:
      console.log(`
yt-autopilot

  npm run library [--dry]      build the sprite + background library (one-time)
  npm run doctor               preflight: keys, cast, bible, spend
  npm run ideate [n]           generate n premises → state/ideas.json
  npm run build:one [ideaId]   script → voice → visuals → props.json
  npm run studio               preview in Remotion Studio
  npm run render -- <ideaId>   render out/<id>/video.mp4
  npm run publish -- <ideaId>  upload (DRY_RUN=true by default)

  npm run autopilot            build + render + publish everything queued
`.trim());
  }
}

main().catch(err => {
  console.error('\n' + String(err instanceof Error ? err.message : err));
  process.exit(1);
});
