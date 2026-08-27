# Master Plan — Faceless YouTube Channel Automation

**Owner:** Demetre Nutsubidze
**Operator:** Claude (agentic, running in CI)
**Status:** Plan v1 — not yet implemented
**Target:** ~95% hands-off production, 30 minutes of human input per week

---

## 0. The one constraint that shapes everything

You asked for *full* automation. The honest answer is that a fully hands-off
"prompt → upload" loop is the single fastest way to get the channel
demonetized, and everything below is designed around that fact rather than
pretending otherwise.

On 15 July 2025 YouTube renamed its "repetitious content" policy to
**inauthentic content**, making explicit that mass-produced and templated
uploads are ineligible for monetization. AI *tooling* is not banned — AI-assisted
content that carries genuine human creative input is fully monetizable, and
enforcement runs a three-strike ladder (warning → 90-day YPP suspension →
permanent removal). What gets killed is the recognizable pattern: verbatim
TTS over a stock slideshow, shipped daily, at volume.

So the design principle for this entire system is:

> **Automate the pipeline, not the judgment.**

Every mechanical step — research, drafting, voice, visuals, assembly,
packaging, upload, analytics — runs unattended. One decision stays human, and
it is batched into a single weekly session: *which ideas get made, and what the
angle is.* That session is also the highest-leverage 30 minutes in the whole
operation, because idea and packaging quality dominate outcomes far more than
production quality does.

That is not a compromise on automation. It is the difference between a system
that compounds and one that gets a strike in month four.

---

## 1. Division of labour

| Stage | Who | Cadence |
|---|---|---|
| Niche & channel bible | Human (once), Claude drafts | Week 1 |
| Trend/gap mining, idea scoring | Claude | Nightly, automated |
| **Idea selection + angle** | **Human** | **Weekly, ~20 min** |
| Research & scripting | Claude | Automated |
| Voice synthesis | Claude | Automated |
| Visual sourcing & generation | Claude | Automated |
| Video assembly & encode | Claude | Automated |
| Title / description / tags | Claude | Automated |
| **Thumbnail approval** | **Human** | **Weekly, ~10 min** |
| Upload, scheduling, disclosure | Claude | Automated |
| Analytics ingestion & tuning | Claude | Automated |
| Strategy review | Human + Claude | Monthly |

Two human gates. Both batched. Everything else is code.

---

## 2. Niche selection — the decision that dominates the economics

Nothing else in this plan matters as much as this. RPM varies by roughly an
order of magnitude across niches, so the same pipeline producing the same
number of views earns wildly different money depending only on this choice.

Rough RPM bands (US-weighted, ad revenue per 1,000 monetized views):

| Niche band | Indicative RPM | Notes |
|---|---|---|
| Personal finance, B2B software, insurance | $15–40 | Highest, most saturated, most YMYL scrutiny |
| Tech / developer / SaaS | $8–15 | **Your expertise sits here** |
| Science, history, documentary | $4–8 | Evergreen, high production cost |
| Entertainment, compilations, lore | $2–5 | Cheap to make, brutal competition |

**Selection criteria, in priority order:**

1. **You have real domain edge.** This is not sentimentality — it is the
   policy-compliance mechanism. Genuine expertise is what makes the weekly
   human gate produce *original* angles instead of rephrased competitor
   uploads, and it is what makes the channel defensible against the thousands
   of pipelines identical to this one.
2. **Evergreen over news.** Evergreen back-catalogue compounds; news content
   decays to zero and forces a treadmill. An automated pipeline's advantage is
   volume against a library, not speed against a news cycle.
3. **Servable without a face and without stock cliché.** Prefer topics where
   the natural visual is a diagram, a screen recording, a data animation, or
   an architectural walkthrough — things Remotion renders natively and
   beautifully — over topics whose only visual is a stock actor at a laptop.
4. **RPM floor above ~$6.**

**Recommended:** a developer/engineering-adjacent channel — systems
explainers, architecture breakdowns, "how X actually works under the hood",
post-mortems of real outages, performance deep-dives. It satisfies all four
criteria simultaneously, and critically, it is a niche where **you can supply
the creative input the policy requires in 20 minutes a week** because you
already know the material.

**Deliverable — the Channel Bible** (`content/bible.md`), authored once and
injected into every prompt downstream:
- Audience, and the specific thing they want that they can't easily get
- Voice: 15 rules, with 10 explicit *banned* constructions ("In this video
  we'll dive into", "But here's the kicker", "Let that sink in")
- Video structure template with beat-level timings
- Visual system: palette, typography, motion vocabulary, lower-third design
- Title and thumbnail conventions
- Hard constraints: no medical/legal/financial advice, no unattributed claims

---

## 3. System architecture

A single repo, `yt-autopilot`, TypeScript end to end — deliberately matched to
your existing stack so the whole thing is maintainable by you without a context
switch.

```
yt-autopilot/
├── src/
│   ├── ingest/        # trend mining, competitor watch, gap scoring
│   ├── ideate/        # idea generation + dedupe against back-catalogue
│   ├── script/        # research → beat-structured script (Claude API)
│   ├── voice/         # TTS synthesis + forced alignment → word timings
│   ├── visual/        # stock search, image gen, asset cache
│   ├── render/        # Remotion compositions
│   ├── package/       # titles, description, chapters, tags, thumbnail
│   ├── publish/       # YouTube Data API v3
│   └── feedback/      # YouTube Analytics API → scoring weights
├── remotion/          # React video components
├── state/             # committed JSON — the database (see §5)
├── assets/            # brand kit, fonts, music beds, LUTs
└── .github/workflows/ # cron orchestration
```

### Stage 1 — Ingest & ideate (nightly, unattended)

Sources: YouTube Data API `search.list` across niche keyword sets sorted by
recency, competitor channel upload playlists, Reddit and Hacker News for the
questions people are actually asking, and your own back-catalogue for gap
analysis.

Scoring — velocity, not raw views:

```ts
score =
    (views / hoursSincePublish) * ageDecay(hours)   // momentum
  * channelSizePenalty(subscriberCount)             // reward small-channel outliers
  * (1 - maxCosineSimilarity(idea, backCatalogue))  // novelty
  * bibleFitScore(idea)                             // on-brand
```

The `channelSizePenalty` term matters more than it looks: a video doing 200k
views on a 5k-subscriber channel is a *format* signal, whereas the same video
on a 5M-subscriber channel is just a distribution signal you cannot replicate.

Output: 20 ranked ideas per week, each with a one-line hook, a proposed angle,
the evidence that drove its score, and a link to the outlier that inspired it.

### Stage 2 — The human gate (weekly, ~20 min)

Claude opens a single GitHub issue every Sunday with the 20 ranked ideas as a
checklist. You tick 5, edit the angles inline, and close it. A workflow parses
the issue body into `state/queue.json`.

No dashboard, no new app to maintain, works from your phone, and it produces a
permanent auditable record that a human directed each video — which is exactly
the evidence you want if the channel is ever reviewed.

### Stage 3 — Research & scripting

Claude API with the channel bible as system context, structured output:

```ts
type Script = {
  hook:      { text: string; durationSec: number };  // hard cap 15s
  beats:     Array<{
    text:       string;
    visualCue:  string;     // drives Stage 5
    onScreen?:  string;     // key term to render as text
    sourceUrl?: string;     // grounding, surfaced in description
  }>;
  cta:       string;
  titleCandidates: string[];  // 5, generated before the script is written
};
```

Two non-obvious rules, both worth more than they cost:

- **Generate titles before the script.** Writing to a title produces a video
  that delivers on its promise; retrofitting a title to a finished script
  produces the mismatch that tanks retention at 30 seconds.
- **Require a source URL on every factual beat.** It grounds the model, it
  fills the description with genuine value, and it is the cheapest available
  defense against the confident-and-wrong failure mode that kills channel
  credibility permanently.

A second Claude pass critiques the draft against the bible's banned-phrase list
and hook-strength rubric, and revises. Two-pass costs pennies and lifts quality
more than any other single intervention in the pipeline.

### Stage 4 — Voice

One cloned or selected voice, permanently — it is the channel's only consistent
identity signal in the absence of a face. Treat it as brand, never A/B it.

Cost is negligible and should not drive the choice: an 8-minute video is
roughly 1,200 words ≈ 7,000 characters. At current rates — OpenAI TTS $15/1M
characters standard and $30/1M HD, Google Chirp 3 HD $30/1M (first 1M free
monthly), ElevenLabs ≈$50/1M equivalent via credits — that is **$0.10–0.35 per
video**. Pick on quality and consistency, not price.

Then run forced alignment (WhisperX or `whisper-timestamped`) over the rendered
audio to recover **word-level timings**. This is what makes captions, on-screen
text hits, and cut-on-emphasis possible, and it is the difference between
output that reads as edited and output that reads as a slideshow.

### Stage 5 — Visuals

The hardest and most expensive stage, and where most faceless pipelines
visibly fail. Three tiers, deliberately mixed:

| Tier | Method | Cost/video | Use for |
|---|---|---|---|
| **A** | Stock (Pexels/Pixabay API) + Ken Burns | ~$0 | Ambient b-roll, transitions |
| **B** | Generated stills + 2.5D parallax motion | ~$1.50 | Concept beats, metaphors |
| **C** | Generative video clips | $2–10 | Hero shots only |
| **D** | **Remotion-native motion graphics** | ~$0 | **Diagrams, data, code, architecture** |

**Tier D is your unfair advantage and should carry the majority of runtime.**
Every other faceless pipeline is limited to A/B/C, which is why they all look
the same. You are a frontend engineer: animated system diagrams, syntax-
highlighted code walkthroughs, and data visualizations are *just React
components* — free to render, infinitely reusable, and impossible for a
prompt-only competitor to match. Build a library of 15 reusable Tier-D
compositions and the channel has a visual identity nothing else in the niche
has.

Reserve Tier C for the first 15 seconds only, where retention is decided.

Cache aggressively — every asset keyed by content hash in `assets/cache/`, so
recurring concepts cost nothing after their first appearance.

### Stage 6 — Assembly (Remotion)

```tsx
export const Video: React.FC<{script: Script; audio: AudioManifest}> = ({script, audio}) => (
  <AbsoluteFill>
    <Audio src={audio.voiceUrl} />
    <Audio src={audio.musicBed} volume={0.08} />
    <Series>
      <Series.Sequence durationInFrames={sec(script.hook.durationSec)}>
        <HookCard text={script.hook.text} />
      </Series.Sequence>
      {script.beats.map((beat, i) => (
        <Series.Sequence key={i} durationInFrames={audio.beatFrames[i]}>
          <BeatScene cue={beat.visualCue} onScreen={beat.onScreen} />
        </Series.Sequence>
      ))}
    </Series>
    <Captions words={audio.wordTimings} />
    <Watermark />
  </AbsoluteFill>
);
```

Beat durations are driven by the *actual* audio timings from Stage 4, never
estimated — this is what keeps picture and voice locked without manual
trimming.

Final encode via FFmpeg: H.264 high profile, CRF 18, 1080p60 (or 1440p for the
bitrate bump YouTube grants), and **loudness-normalize to −14 LUFS** to match
platform playback. Render on a GitHub Actions runner; a 10-minute 2D
composition is comfortably within the 6-hour job ceiling.

### Stage 7 — Packaging

Where the most compute per output-second should be spent, because CTR gates
everything downstream.

- **Titles:** 5 candidates from Stage 3, scored against the historical
  title→CTR data accumulated in Stage 9.
- **Thumbnail:** generated or stock background composited with a Remotion text
  overlay. Rendering the text layer in Remotion rather than in an image model
  guarantees typographic consistency across every upload — a real brand signal,
  and one image models cannot hold across generations. Produce 3 variants.
- **Description:** hook paragraph, auto-generated chapters from beat timings,
  source links from Stage 3, standard footer.

### Stage 8 — Publish

YouTube Data API v3, OAuth refresh token in repository secrets.

```ts
await youtube.videos.insert({
  part: ['snippet', 'status'],
  requestBody: {
    snippet: { title, description, tags, categoryId, defaultLanguage: 'en' },
    status: {
      privacyStatus: 'private',
      publishAt: nextSlotISO(),          // fixed weekly slot
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: true,      // ← non-negotiable
    },
  },
  media: { body: fs.createReadStream(renderPath) },
});
```

**Set the synthetic/altered content disclosure.** It is required where AI is
used meaningfully — generated imagery, synthetic or cloned voice, generated
video — which describes this pipeline exactly. It does not hurt reach, and
omitting it converts a compliant channel into a non-compliant one for no gain.

**Quota:** the default Google Cloud project allowance is 10,000 units/day,
resetting midnight Pacific, against which `videos.insert` has historically cost
1,600 units — roughly 6 uploads/day. Reporting indicates that as of 1 June 2026
uploads bill to a dedicated bucket at 1 unit/call with a 100/day default,
decoupling uploads from read quota. **Verify the current figure in your own
Cloud Console before relying on it**; either way, at 5 uploads/week this is not
a binding constraint. Quota increases are free to request.

### Stage 9 — The feedback loop

This is what separates a content system from a slop generator, and it is the
stage most plans omit.

Daily pull from the YouTube Analytics API for every video: impressions, CTR,
average view duration, average percentage viewed, and the **retention curve**.

Write results back into three places:
1. Idea scoring weights (which topic clusters actually perform)
2. The scripting prompt (hook patterns that held past 30 seconds, in-context)
3. Title/thumbnail selection priors

Watch two numbers above all others:
- **CTR** — a packaging problem. Fix titles and thumbnails.
- **Retention at 30s** — a hook problem. Fix the first 15 seconds.

Diagnose them separately. Conflating them is the most common reason channels
iterate for months without improving.

---

## 4. Orchestration

GitHub Actions as the scheduler — free, already in your workflow, and it keeps
the entire operation auditable in git history.

| Workflow | Trigger | Does |
|---|---|---|
| `ingest.yml` | Nightly 02:00 | Trend mining, scoring, writes `state/ideas.json` |
| `propose.yml` | Sunday 09:00 | Opens the weekly selection issue |
| `produce.yml` | On issue close | Full pipeline for each approved idea |
| `publish.yml` | On render artifact | Upload + schedule |
| `analytics.yml` | Daily 06:00 | Metrics pull, weight updates |
| `health.yml` | Daily | Quota, key expiry, cost ceiling alerts |

Secrets: `YOUTUBE_OAUTH_REFRESH_TOKEN`, `ANTHROPIC_API_KEY`, `TTS_API_KEY`,
`PEXELS_API_KEY`, `IMAGE_GEN_KEY`. Never in the repo; rotate quarterly.

## 5. State

`state/` as committed JSON, not a database.

```
state/
├── ideas.json        # scored idea pool
├── queue.json        # human-approved, awaiting production
├── published.json    # video registry + metadata
├── metrics.json      # rolling performance history
└── weights.json      # learned scoring parameters
```

No infrastructure, no hosting bill, full version history, trivially inspectable,
and — the point — it means **the entire operation is drivable by an agent
through git alone**. Every state change arrives as a reviewable commit. Migrate
to Postgres only past ~500 videos, which is a problem worth having.

---

## 6. Cost model

Per 8-minute video:

| Line item | Cost |
|---|---|
| Scripting (2-pass, with research context) | $0.30 |
| TTS | $0.20 |
| Tier B stills (~40 × $0.04) | $1.60 |
| Tier C hero clips (first 15s only) | $2.00 |
| Thumbnail variants | $0.15 |
| Render compute (Actions free tier) | ~$0.00 |
| **Total** | **≈ $4.25** |

At 5 videos/week: **~$85/month**, plus ~$30/month of assorted API floors.
Call it **$115/month all-in** and 30 minutes/week of your time.

Push Tier D (Remotion-native) to carry more runtime and per-video cost drops
toward $1.

**Revenue reality:** YPP requires 1,000 subscribers plus 4,000 public watch
hours in 12 months, or 10M Shorts views in 90 days. Realistic timeline to
monetization for a new channel in a competitive niche is **6–12 months**, and a
meaningful fraction of well-run channels never clear it. Budget as a 12-month
experiment, not a 3-month one. The pipeline itself is the durable asset — it
can be pointed at a second niche in a weekend once built.

---

## 7. Phased rollout

**Phase 0 — Validate the format (week 1). Build nothing.**
Choose the niche, write the bible, and produce **three videos entirely by
hand**. This is the most important and most-skipped phase: if the format does
not work manually, automating it only produces failure faster and at volume.
Publish them, wait two weeks, read the retention curves.

**Phase 1 — Script + voice (weeks 2–3).** Ingest, ideate, script, TTS, forced
alignment. Output is an audio file and a script JSON you assemble manually.

**Phase 2 — Visuals + assembly (weeks 4–5).** Remotion compositions, the
Tier-D component library, asset cache, FFmpeg encode. Output is a finished MP4.

**Phase 3 — Packaging + publish (week 6).** Thumbnails, metadata, upload,
scheduling, disclosure. Pipeline is now end-to-end.

**Phase 4 — Close the loop (weeks 7–8).** Analytics ingestion, weight updates,
title/thumbnail priors.

**Phase 5 — Scale (month 3+).** Raise cadence only after CTR and retention are
stable. Then fork the pipeline to a second niche — the code is the asset.

Ship each phase behind the previous one working. Do not build Phase 3 while
Phase 1 output is still bad.

---

## 8. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Inauthentic-content strike / demonetization | **Critical** | Weekly human creative gate; synthetic-content disclosure on every upload; original analysis over rephrased sources; never publish unreviewed in month 1 |
| Format never finds an audience | High | Phase 0 manual validation before any code; kill criteria below |
| Hallucinated facts damage credibility | High | Per-beat source grounding; second critique pass; spot-check every 10th video |
| Single Google account = single point of failure | High | Dedicated account, 2FA with hardware key, recovery configured, never reuse a personal login |
| Copyright / stock licensing | Medium | Licensed-for-commercial sources only; log license per asset in `state/` |
| API key leakage via CI logs | Medium | Secrets only, masked outputs, quarterly rotation, no `set -x` in publish jobs |
| Model or prompt drift off-brand | Medium | Bible-conformance check in CI; monthly human review of 3 random outputs |
| Runaway spend | Low | Hard monthly cost ceiling in `health.yml`, pipeline halts on breach |

**Kill criteria — decide these now, while it costs nothing to be honest:**
after 30 published videos, if CTR is below 2% *and* average percentage viewed is
below 30%, stop producing. The format is wrong, and scaling it converts a small
failure into a large one. Re-diagnose from Phase 0.

---

## 9. What "done" looks like

Sunday morning, a GitHub issue appears with 20 ranked ideas. You spend 20
minutes ticking five and sharpening the angles, and 10 more approving
thumbnails. You close the issue.

By Friday, five videos have been researched, written, critiqued, voiced,
scored, illustrated, assembled, packaged, disclosed, uploaded, and scheduled —
and Monday's ingest run is already weighted by how last week's performed.

That is not a hands-off channel. It is a **one-hour-a-month channel with a
human where the human actually adds value**, which is both the version that
survives policy and the version that gets better over time instead of merely
larger.

---

## Sources

- YouTube inauthentic content policy (renamed from "repetitious content",
  15 July 2025) and 2026 monetization guidance:
  [monetizednow.com](https://monetizednow.com/youtube-ai-content-monetization-policy),
  [auditsocials.com](https://www.auditsocials.com/blog/youtube-inauthentic-content-policy-2026-mass-produced-ai-generated-monetization-creators-brands),
  [quasa.io](https://quasa.io/media/youtube-monetization-rules-in-2026-how-to-avoid-ai-slop)
- YouTube Data API v3 quota:
  [getphyllo.com](https://www.getphyllo.com/post/youtube-api-limits-how-to-calculate-api-usage-cost-and-fix-exceeded-api-quota),
  [channelcrawler.com](https://channelcrawler.com/insights/youtube-api-daily-limit-quotas-costs-and-how-to-scale-beyond-10000-units-channelcrawler)
- TTS pricing:
  [aipricing.guru](https://www.aipricing.guru/ai-voice-tts-api-pricing/),
  [texttolab.com](https://texttolab.com/blog/google-cloud-tts-pricing)
- Remotion + FFmpeg rendering:
  [rendercomp.com](https://rendercomp.com/blog/best-programmatic-video-tools-2026/),
  [yuv.ai](https://yuv.ai/blog/remotion)
