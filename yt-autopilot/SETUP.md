# Setup

Everything here is one-time. After it, the channel runs on a weekly issue you
tick from your phone.

Budget about **45 minutes** and **~$7** to first video (~$5 in API credit,
~$2 of that spent building the asset library).

---

## What cannot be automated, and why

Four things need a human, permanently. They are not gaps in the code:

| Step | Why it's manual |
|---|---|
| Creating accounts, entering a card | Providers require a human and a payment method |
| The OAuth consent click | Google's flow needs a real browser session — there is a helper script, but you click |
| The weekly gate | Optional — see **Full autopilot** below |
| Filling the last bible section | Your sense of humor is the input the pipeline has no way to infer |

Everything else — ideas, scripts, voice, visuals, assembly, thumbnails,
metadata, upload, scheduling — is unattended.

**On the gate.** Both modes ship. The gate is ~10 minutes a week and is the
load-bearing part of staying monetizable — a closed issue showing a human
picked and edited each premise is the clearest evidence that a person directs
this channel. Autopilot removes it entirely with one repository variable; the
tradeoff is spelled out under **Full autopilot**.

---

## 1 · Accounts and keys (~20 min)

### Google account
Make a **dedicated** one. Not your personal login — it is the single point of
failure for the whole operation. Turn on 2FA, ideally a hardware key, and set
recovery options.

Create the YouTube channel on it.

### Anthropic — scripts
1. [console.anthropic.com](https://console.anthropic.com) → API keys → create
2. Add ~$5 credit. At ~$0.05/video this lasts months.
3. Keep the key for step 3.

### OpenAI — voice and the asset library
1. [platform.openai.com](https://platform.openai.com) → API keys → create
2. Add ~$5 credit. The library costs ~$2 once; voice is ~$0.02/video after.
3. One key covers both `TTS_API_KEY` and `IMAGE_API_KEY`.

### YouTube Data API
1. [console.cloud.google.com](https://console.cloud.google.com) → new project
2. **APIs & Services → Library** → enable **YouTube Data API v3** and
   **YouTube Analytics API**
3. **OAuth consent screen** → External → add your own address as a test user
4. **Credentials → Create credentials → OAuth client ID → Web application**
5. Under *Authorised redirect URIs* add exactly: `http://localhost:8412`
6. Keep the client ID and secret

Then get the refresh token — this is the one browser step:

```bash
YOUTUBE_CLIENT_ID=... YOUTUBE_CLIENT_SECRET=... npx tsx scripts/youtube-auth.ts
```

Open the printed URL, approve, and the token appears in your terminal.

---

## 2 · Make it yours (~15 min)

```bash
npm install
cp .env.example .env      # paste the keys in
npm run doctor            # tells you exactly what is still missing
```

**`content/cast.json`** — three characters ship as a starting point. Rename
them, rewrite the personalities, change the `look` strings. Do this *before*
building the library: once assets exist, changing a look means the character
visibly changes mid-catalogue.

**`content/bible.md`** — fill the last section, the rules specific to your
sense of humor. This file is injected into every script prompt and the
pipeline has no taste of its own. It is the highest-leverage 10 minutes here.

**`content/scenery.json`** — ten locations. Add or swap freely.

---

## 3 · Build the library (~10 min, ~$2)

```bash
npm run library --dry     # prices it first
npm run library           # generates what is missing
git add assets/library && git commit -m "chore: asset library"
```

Commit the assets. CI then needs no image API at all, and builds are
deterministic. Re-running only generates what's missing, so adding a character
or location later costs only the new pieces.

---

## 4 · Prove it end to end (~5 min)

```bash
npm run doctor            # everything green?
npm run build:one         # a seed idea ships in the queue
npm run render
npm run studio            # watch it before anyone else does
```

`DRY_RUN` defaults to `true`, so nothing uploads. Watch the video. If the
format is wrong, fix it here — automating a bad format only produces bad
videos faster.

---

## 5 · Hand it to CI (~5 min)

Push to a **private** repo, then in **Settings → Secrets and variables →
Actions**:

**Secrets:**
`ANTHROPIC_API_KEY`, `TTS_API_KEY`, `IMAGE_API_KEY`,
`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`

**Variables:** leave `DRY_RUN` unset for now. It defaults to `true`.

Then pick a mode with repository **variables**:

- **Autopilot** (no human ever): set `AUTO_APPROVE` = `true`, and
  `DAILY_COUNT` = `3`.
- **Gated** (~10 min/week): leave both unset.

Trigger `Daily` manually once (**Actions** tab → Run workflow). In autopilot
it produces three videos and stops short of uploading, because `DRY_RUN` is
still `true`. Download them from the run's artifacts and watch them.

When you're happy, add **`DRY_RUN` = `false`**. That is the switch that makes
it live.

---

## From then on

In autopilot: nothing. It runs at 06:00 UTC daily, publishes, and commits what
each run cost to `state/costs.json`. Check in whenever you feel like it.

In gated mode: an issue appears, you tick boxes and close it.

---

## Full autopilot

Set repository variable **`AUTO_APPROVE` = `true`**.

`daily.yml` then runs at 06:00 UTC every day with no human in the loop:
generate 12 premises, queue the top `DAILY_COUNT` (default 3), build, render,
publish, commit state. Nothing waits for you.

| Variable | Default | Does |
|---|---|---|
| `AUTO_APPROVE` | unset | `true` removes the human gate entirely |
| `DAILY_COUNT` | `1` | Videos per day in autopilot mode |
| `RETENTION_FLOOR` | `30` | Hold publishing below this average view % |
| `RETENTION_WINDOW` | `10` | Videos the floor is judged over |
| `DRY_RUN` | `true` | `false` makes uploads real |

Leave `AUTO_APPROVE` unset and the same workflow opens a gate issue instead
and stops — pick whichever you want, no code change.

**What you are accepting.** Unattended AI-generated uploads are what the
inauthentic content policy targets, and no code here can fully prevent a
strike — the policy is about absence of human direction, which is what this
mode removes. Enforcement runs warning → 90-day suspension → removal, so a
first offence is a warning, not the end.

Three things in the pipeline push against it: premise dedupe against the whole
catalogue, five rotating script shapes, and per-video visual treatment. Those
attack the *repetitive* half of the policy, which matters more than raw count.
The default cadence is 1/day rather than 3 for the same reason — it is an
unremarkable human posting rate, and it exhausts the premise space three times
more slowly.

At ~$2.40/month this is a survivable bet. Don't build anything on top of this
channel that you would miss, and keep the account separate from anything that
matters.

**Recommended first fortnight, even in autopilot:** leave `DRY_RUN=true` for
the first few runs and watch the artifacts. Automating a bad format only
produces bad videos faster, and this is the one window where fixing it is
cheap.
