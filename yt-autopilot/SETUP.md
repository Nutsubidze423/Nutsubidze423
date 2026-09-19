# Setup — step by step

Work through these in order. Budget **~60 minutes** and **~$12** ($10 of API
credit, ~$2 of which gets spent building the asset library).

Two things that will silently break everything if you skip them are called out
as **⚠ Critical** below. Don't skip those.

---

## Step 1 · Give the code its own repo

The code currently sits in a folder inside your profile repo, on a branch.
It cannot run there.

> **⚠ Critical:** GitHub only runs scheduled workflows from a repository's
> **default branch**. A `cron:` on any other branch never fires. The whole
> point of this project is the schedule, so it needs its own repo with this
> code on `main`.

1. On github.com → **New repository** → name it `yt-autopilot` → **Private** →
   don't initialise with anything.

2. On your machine:

```bash
git clone --branch claude/faceless-yt-automation-plan-qwcyxz \
  https://github.com/Nutsubidze423/Nutsubidze423.git tmp-profile

cp -r tmp-profile/yt-autopilot ./yt-autopilot
rm -rf tmp-profile
cd yt-autopilot

git init -b main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/Nutsubidze423/yt-autopilot.git
git push -u origin main
```

---

## Step 2 · Accounts and keys (~20 min)

### 2a · A dedicated Google account

Make a **new** one. Not your personal login — it is the single point of
failure for the whole operation, and if the channel gets actioned you do not
want that attached to your real identity. Turn on 2FA and set recovery options.

Create the YouTube channel on it.

### 2b · Anthropic — writes the scripts

1. [console.anthropic.com](https://console.anthropic.com) → **API keys** → create one
2. Add **$5** of credit. At ~$0.05/video that lasts months.

### 2c · OpenAI — voice, images, and deduplication

1. [platform.openai.com](https://platform.openai.com) → **API keys** → create one
2. Add **$5** of credit
3. The same key goes in both `TTS_API_KEY` and `IMAGE_API_KEY`

### 2d · YouTube API access

Signed in as the **new** Google account:

1. [console.cloud.google.com](https://console.cloud.google.com) → **New project**
2. **APIs & Services → Library** → enable both:
   - **YouTube Data API v3** (uploading)
   - **YouTube Analytics API** (the retention breaker)
3. **OAuth consent screen** → **External** → add the new account's own address
   as a **test user**
4. **Credentials → Create credentials → OAuth client ID → Web application**
5. Under *Authorised redirect URIs* add exactly: `http://localhost:8412`
6. Copy the **client ID** and **client secret**

### 2e · The refresh token

This is the only step that needs a browser. From inside `yt-autopilot`:

```bash
npm install
YOUTUBE_CLIENT_ID=your-id YOUTUBE_CLIENT_SECRET=your-secret \
  npx tsx scripts/youtube-auth.ts
```

Open the printed URL, approve (you'll see an "unverified app" warning — that's
expected for a personal OAuth client, continue past it), and the refresh token
prints in your terminal.

---

## Step 3 · Make it yours (~15 min)

```bash
cp .env.example .env
```

Fill in `.env` with the five values from Step 2. Then:

```bash
npm run doctor        # tells you exactly what is still missing
```

### 3a · The cast — `content/cast.json`

Three characters ship as a starting point. Rename them, rewrite the
personalities, change the `look` strings to whatever you actually find funny.

> **⚠ Critical:** Do this **before** Step 4. The `look` string is baked into
> every sprite. Once the library exists and you've published videos, changing
> a look means the character visibly changes mid-catalogue — your channel
> splits into a before and after.

### 3b · The bible — `content/bible.md`

Fill the section marked `[ADD YOUR OWN]`. This file is injected into every
script prompt and the pipeline has no taste of its own — this is the single
highest-leverage thing you will write. Everything downstream is machinery.

### 3c · Locations — `content/scenery.json` *(optional)*

Ten locations ship. Add or swap freely; each new one costs ~$0.08.

---

## Step 4 · Build the asset library (~10 min, ~$2)

```bash
npm run library -- --dry     # prices it before spending
npm run library              # generates the 25 assets

git add assets/library
git commit -m "Asset library"
```

Commit the images. CI then never touches the image API, and every build is
deterministic. Re-running later only generates what's missing, so adding a
character or location costs just the new pieces.

---

## Step 5 · Prove it works locally (~10 min)

```bash
npm run doctor               # everything green?
npm run build:one            # a seed idea ships in the queue
npm run render
npm run studio               # watch it
```

`DRY_RUN` defaults to `true`, so nothing uploads. **Actually watch the video.**
If the format is wrong, this is where fixing it is cheap. Automating a bad
format only produces bad videos faster.

---

## Step 6 · Hand it to CI (~5 min)

```bash
git push
```

### 6a · Workflow permissions

> **⚠ Critical:** New repositories default the Actions token to **read-only**,
> which makes the "commit state" step fail every run — and the pipeline
> silently loses its memory of what it has already published, which defeats
> the deduplication.

**Settings → Actions → General → Workflow permissions** →
select **Read and write permissions** → Save.

### 6b · Secrets

**Settings → Secrets and variables → Actions → Secrets → New repository secret:**

| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | from 2b |
| `TTS_API_KEY` | OpenAI key from 2c |
| `IMAGE_API_KEY` | the same OpenAI key |
| `YOUTUBE_CLIENT_ID` | from 2d |
| `YOUTUBE_CLIENT_SECRET` | from 2d |
| `YOUTUBE_REFRESH_TOKEN` | from 2e |

### 6c · Variables

Same page, **Variables** tab:

| Variable | Set to | Why |
|---|---|---|
| `AUTO_APPROVE` | `true` | No human gate — full autopilot |
| `DAILY_COUNT` | `1` | One video a day |

Leave `DRY_RUN` **unset** for now. It defaults to `true`.

---

## Step 7 · A live rehearsal

**Actions → Daily → Run workflow.**

It will generate a premise, write, voice, render — and stop short of
uploading, because `DRY_RUN` is still true. Download the MP4 from the run's
**Artifacts** section and watch it.

Do this **three or four times over a few days.** This is your only cheap
window to see what the machine actually produces before it starts publishing
for real.

---

## Step 8 · Go live

Add one more repository variable:

| Variable | Set to |
|---|---|
| `DRY_RUN` | `false` |

That's the switch. From now on it runs at **06:00 UTC daily** with no
involvement from you: pulls analytics, checks the retention breaker, generates
a premise, screens it against everything ever made, writes, voices, renders,
publishes, and commits what it spent.

---

## After that

Nothing. That's the point.

If you want to check in, `state/costs.json` has every dollar and
`state/published.json` has every video. The daily commit keeps the repo active,
which also stops GitHub disabling the schedule for inactivity.

### The safety rails, and how to adjust them

| Variable | Default | What it does |
|---|---|---|
| `DAILY_COUNT` | `1` | Videos per day |
| `RETENTION_FLOOR` | `30` | Holds publishing below this average view % |
| `RETENTION_WINDOW` | `10` | Videos the floor is judged over |
| `MONTHLY_COST_CEILING_USD` | `120` | Halts everything at this spend |
| `DISABLE_BREAKER` | unset | `true` overrides the retention hold |

The breaker needs analytics for most of its window before it can fire, and
YouTube's data lags publication by a day or two. So for roughly the **first
two weeks it will publish unconditionally** — which is the correct behaviour,
but it does mean the early videos ship without brakes. Another reason to spend
real time on Step 7.

### What you're accepting

Unattended AI-generated uploads are what YouTube's inauthentic content policy
targets. Three things in the pipeline push against it — premise deduplication
against the whole catalogue, five rotating script shapes, and per-video visual
treatment — and the 1/day default is an unremarkable human posting rate. None
of that is a guarantee. Enforcement runs warning → 90-day suspension →
removal, so a first strike is a warning rather than the end.

At ~$2.40/month this is a survivable bet. Keep the account separate from
anything that matters, and don't build anything on top of this channel you
would miss.
