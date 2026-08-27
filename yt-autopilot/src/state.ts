import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Idea, Character, PublishedVideo, Metrics } from './types.ts';

/** State is committed JSON, not a database. Every change is a reviewable
 *  commit, which is what makes the whole pipeline drivable through git alone.
 *  Revisit at ~500 videos — a problem worth having. */
const ROOT = join(process.cwd(), 'state');
const CONTENT = join(process.cwd(), 'content');

function read<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}
function write(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

export const state = {
  ideas: {
    all: () => read<Idea[]>(join(ROOT, 'ideas.json'), []),
    save: (ideas: Idea[]) => write(join(ROOT, 'ideas.json'), ideas),
  },
  queue: {
    all: () => read<Idea[]>(join(ROOT, 'queue.json'), []),
    save: (q: Idea[]) => write(join(ROOT, 'queue.json'), q),
    /** Pull the next approved idea and remove it from the queue. */
    shift: (): Idea | undefined => {
      const q = read<Idea[]>(join(ROOT, 'queue.json'), []);
      const next = q.shift();
      write(join(ROOT, 'queue.json'), q);
      return next;
    },
  },
  published: {
    all: () => read<PublishedVideo[]>(join(ROOT, 'published.json'), []),
    add: (v: PublishedVideo) => {
      const all = read<PublishedVideo[]>(join(ROOT, 'published.json'), []);
      all.push(v);
      write(join(ROOT, 'published.json'), all);
    },
  },
  metrics: {
    all: () => read<Metrics[]>(join(ROOT, 'metrics.json'), []),
    save: (m: Metrics[]) => write(join(ROOT, 'metrics.json'), m),
  },
  cast: {
    all: () => read<Character[]>(join(CONTENT, 'cast.json'), []),
    byId: (id: string) => read<Character[]>(join(CONTENT, 'cast.json'), []).find(c => c.id === id),
    save: (c: Character[]) => write(join(CONTENT, 'cast.json'), c),
  },
  bible: () => {
    const p = join(CONTENT, 'bible.md');
    return existsSync(p) ? readFileSync(p, 'utf8') : '';
  },
};
