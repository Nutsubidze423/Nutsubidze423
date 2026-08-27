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
| Cost ledger | `src/cost.ts` | Real token usage, halts at the monthly ceiling |
| Preflight | `src/doctor.ts` | `npm run doctor` — fails before spending, not during |

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

```bash
npm run doctor            # tells you exactly what is still missing
```

A starting cast ships in `content/cast.json`:

| Character | Role in a scene | Voice |
|---|---|---|
| **Direttore Pellicano** | Confidently wrong. Manages the crisis into a worse crisis. | onyx |
| **Ranocchia Piccola** | Anxiously right. Predicts it, is ignored, is correct. | fable |
| **Nonna Frigorifero** | Entirely elsewhere. Offers food to people mid-catastrophe. | shimmer |

Three positions that generate a scene from any pairing. **Edit them** — they are
a starting point, not a decision. But once you start publishing, the `look`
strings and `seed` values are locked: they are the only thing keeping a
character recognizable across a back catalogue.

The one thing still yours to write is the last section of **`content/bible.md`**
— the rules specific to your sense of humor. That file is injected into every
script prompt, and the pipeline has no taste of its own.

## Running one video

```bash
npm run doctor                       # preflight — do this first
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

### What it costs

Every LLM call bills real token usage into `state/costs.json`; TTS bills by
character and images bill only on cache miss. `build:one` prints the per-video
and month-to-date figure when it finishes. Expect roughly **$0.60–0.90 per
Short** — most of it images.

Spending halts at `MONTHLY_COST_CEILING_USD` (default $120) rather than
overrunning quietly. The price table at the top of `src/cost.ts` is
hand-maintained — an out-of-date table makes the ceiling wrong in the dangerous
direction, so check it against your billing after the first week.

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
- **`.env` is loaded via Node's `--env-file-if-exists`**, wired into the npm
  scripts. Running `tsx src/cli.ts` directly will not pick it up.
