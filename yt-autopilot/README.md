# yt-autopilot

Agent-operated production pipeline for a faceless YouTube **Shorts** channel.
Absurdist meme comedy with a recurring cast.

Companion to `docs/faceless-yt-automation-master-plan.md`.

---

## What actually works right now

```
ideate  →  [human gate]  →  script  →  voice  →  visuals  →  render  →  publish
  ✅            ✅            ✅        ✅         ✅          ✅          ✅
```

**Built and typechecking clean:**

| Stage | Module | Notes |
|---|---|---|
| Ideate | `src/ideate/generate.ts` | Cast-lore premises. No trend mining yet — see below. |
| Human gate | `.github/workflows/propose.yml` | Weekly issue, doubles as the audit trail |
| Script | `src/script/` | Two-pass: writer, then a critic that can reject and force a rewrite |
| Voice | `src/voice/tts.ts` | Per-line WAV, one locked voice per character |
| Timing | `src/voice/align.ts` | Sample-accurate concat + word timings, pure Node, **verified** |
| Visuals | `src/visual/images.ts` | Content-hash cached, character `look` spliced verbatim |
| Assembly | `remotion/` | 1080×1920, karaoke captions, push-in motion, progress bar |
| Packaging | `src/packaging/metadata.ts` | Title selection, learns from `metrics.json` once it has rows |
| Publish | `src/publish/youtube.ts` | `DRY_RUN=true` by default |

**Not built yet, deliberately:**

- **Trend mining / idea scoring.** Needs a back catalogue to measure novelty
  against and published metrics to weight by. On a new channel both are empty,
  and a scorer with no signal just launders randomness through arithmetic.
  Build `src/ideate/score.ts` once `state/metrics.json` has ~30 rows.
- **Analytics feedback loop.** Same reason — nothing to learn from yet.
- **`produce.yml`.** Wire it after you've run the pipeline by hand a few times
  and know where it actually breaks.

---

## Setup

```bash
npm install
cp .env.example .env      # fill in your keys
```

Then, **before your first real build**, do these two things by hand. They are
the channel, and nothing downstream can invent them for you:

1. **`content/cast.json`** — replace both placeholders. The `look` string is
   spliced verbatim into every image prompt, so it is the only thing keeping a
   character recognizable across hundreds of videos. Write it once, carefully.
2. **`content/bible.md`** — fill the `[BRACKETED]` sections. This file is
   injected into every script prompt; the pipeline has no taste of its own.

## Running one video

```bash
npm run ideate 20                    # premises → state/ideas.json
# move the ones you want into state/queue.json

npm run build:one                    # script → voice → visuals → out/<id>/props.json
npm run studio                       # preview it before spending a render

npx remotion render remotion/index.ts Short \
  out/<id>/video.mp4 --props=out/<id>/props.json

npm run publish -- <id>              # dry run unless DRY_RUN=false
```

A seed idea (`demo-001`) ships in `state/queue.json` so `build:one` works
before you've written anything.

## Getting the YouTube refresh token

1. Google Cloud Console → new project → enable **YouTube Data API v3**
2. OAuth consent screen → External → add yourself as a test user
3. Credentials → OAuth client ID → **Desktop app**
4. Run the consent flow once with scope
   `https://www.googleapis.com/auth/youtube.upload`, keep the refresh token
5. Put client id, secret, and refresh token in `.env`

Use a **dedicated Google account** with hardware-key 2FA, never a personal
login. It is the single point of failure for the whole operation.

---

## Things that will bite you

- **`DRY_RUN` defaults to `true`.** Publishing for real needs `DRY_RUN=false`
  set explicitly. This is deliberate.
- **Verify `containsSyntheticMedia`** against current API docs before your
  first real upload. `googleapis` silently drops unknown keys rather than
  erroring, so a renamed field fails invisibly. See the comment in
  `src/publish/youtube.ts`.
- **`selfDeclaredMadeForKids` stays `false`.** This channel is for teens and
  adults. Setting it true disables personalized ads and drops RPM by roughly an
  order of magnitude.
- **Word timings are proportional, not true forced alignment.** Each line is
  synthesized separately so line boundaries are exact and drift never
  accumulates past one short line — fine for karaoke captions. Swap in
  `whisper-timestamped` later; the `WordTiming[]` contract won't change.
- **The 60s ceiling is enforced twice** — once on the word-count estimate, once
  on real audio duration. The second one is the one that matters.
- **Don't change `STYLE` in `src/visual/images.ts` mid-catalogue.** Old and new
  videos will read as two different channels.
