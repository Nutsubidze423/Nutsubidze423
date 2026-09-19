# yt-autopilot

Agent-operated production pipeline for a faceless YouTube **Shorts** channel.
Absurdist meme comedy with a recurring cast.

**Getting started: [SETUP.md](SETUP.md)** — one-time, ~45 minutes.

Companion to `docs/faceless-yt-automation-master-plan.md`.

---

## What actually works right now

```
ideate  →  [gate]  →  script  →  voice  →  visuals  →  render  →  publish
  ✅         ✅         ✅        ✅         ✅          ✅          ✅
          optional    └────────── unattended, in CI ──────────────┘
```

Two modes, switched by the `AUTO_APPROVE` repository variable:

- **Autopilot** — daily, no human, 1 video/day by default, ~$2.40/month
- **Gated** — a weekly issue you tick, ~10 min/week

### Anti-sameness

Thirty videos that share a structure and a look read as one template with the
words swapped — which is both the "repetitive" half of the inauthentic content
policy and simply dull. Three mechanisms push against it:

- **Premise dedupe** embeds each candidate and compares it against *every*
  premise ever published, not a rolling window of titles. Near-duplicates are
  dropped before they cost anything.
- **Five script shapes** — escalation, crosstalk, list, reversal,
  interrogation — rotated least-recently-used, so the catalogue covers all
  five instead of drifting to whichever the model writes most easily.
- **Per-video treatment** varies caption placement and grouping, background
  motion, sprite entry, accent colour and whether the progress bar shows.
  Derived from the video id, so a re-render is identical but no two videos are.

### The brakes

An unattended pipeline with no brakes will publish two hundred videos nobody
watches. `src/feedback/breaker.ts` holds publishing when average view
percentage over the last 10 videos falls below 30%. It needs metrics for most
of that window before it can fire, so it never trips on absence of data, and
production still runs — only the upload is held, so the artifacts are there to
look at. Override with `DISABLE_BREAKER=true`.

See [SETUP.md](SETUP.md) for the tradeoff.

**Built and typechecking clean:**

| Stage | Module | Notes |
|---|---|---|
| Ideate | `src/ideate/generate.ts` | Cast-lore premises. No trend mining yet — see below. |
| Human gate | `.github/workflows/propose.yml` | Weekly issue, doubles as the audit trail |
| Script | `src/script/` | Two-pass: writer, then a critic that can reject and force a rewrite |
| Voice | `src/voice/tts.ts` | Per-line WAV, one locked voice per character |
| Timing | `src/voice/align.ts` | Sample-accurate concat + word timings, pure Node, **verified** |
| Library | `src/visual/library.ts` | Sprites + backgrounds, built once (~$2), reused forever |
| Visuals | `src/visual/resolve.ts` | Pure lookup — no image API call during a build |
| Assembly | `remotion/` | 1080×1920, karaoke captions, push-in motion, progress bar |
| Packaging | `src/packaging/metadata.ts` | Title selection, learns from `metrics.json` once it has rows |
| Publish | `src/publish/youtube.ts` | `DRY_RUN=true` by default |
| Dedupe | `src/ideate/dedupe.ts` | Premise embeddings vs the whole catalogue |
| Shapes | `src/script/shapes.ts` | Five structures, least-recently-used rotation |
| Treatment | `remotion/treatment.ts` | Per-video framing, motion, accent |
| Analytics | `src/feedback/analytics.ts` | Lifetime metrics per video |
| Breaker | `src/feedback/breaker.ts` | Holds publishing when retention collapses |
| Gate parser | `src/gate.ts` | Ticked boxes → queue; human edits win over generated text |
| Orchestration | `.github/workflows/daily.yml` | Autopilot (no human) or gated, by repo variable |
| | `.github/workflows/produce.yml` | Gated mode: close the issue → produce |
| Cost ledger | `src/cost.ts` | Real token usage, halts at the monthly ceiling |
| Preflight | `src/doctor.ts` | `npm run doctor` — fails before spending, not during |

**Not built yet, deliberately:**

- **Trend mining / idea ranking.** Metrics now land in `state/metrics.json`,
  but ranking needs enough rows to mean something. Build `src/ideate/score.ts`
  once there are ~30.

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
npm run library --dry                # see what the library costs before buying
npm run library                      # build it — one time, ~$2
npm run doctor                       # preflight — everything green?

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

| | |
|---|---|
| Asset library | **~$2.00, once** (25 assets) |
| Per Short | **~$0.05–0.10** |
| 5 Shorts/week | **~$2/month** |

Generating a fresh image per beat would cost about $0.50 a video *and* give you
a character who looks subtly different every time, because the model re-rolls
the design on every call. Building a fixed library once and compositing from it
is cheaper and better: the cast is pixel-identical across the whole catalogue,
builds make no image API call at all, and sprites can be animated — which a
freshly generated still never can.

What is left is tokens and speech, and both are small. The system block (bible
+ cast) is cached, so the draft/critique/redraft cycle re-reads it at ~0.1×
input price instead of paying full freight three times.

Every LLM call bills real token usage into `state/costs.json`; `build:one`
prints the per-video and month-to-date figure. Spending halts at
`MONTHLY_COST_CEILING_USD` (default $120) rather than overrunning quietly.

The price table at the top of `src/cost.ts` is hand-maintained — an
out-of-date table makes the ceiling wrong in the dangerous direction, so check
it against your billing after the first week.

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
- **Don't change `STYLE` in `src/visual/library.ts` mid-catalogue**, and don't
  delete library assets. Regenerating a sprite gives you a *different*
  character, and the back catalogue will visibly split into a before and after.
  Adding new poses or backgrounds is free and safe; replacing existing ones is
  not.
- **The writer can only pick ids that exist.** Backgrounds come from
  `content/scenery.json` and poses from each character's `poses`. Add to either
  and re-run `npm run library` — it only generates what is missing.
- **`.env` is loaded via Node's `--env-file-if-exists`**, wired into the npm
  scripts. Running `tsx src/cli.ts` directly will not pick it up.
