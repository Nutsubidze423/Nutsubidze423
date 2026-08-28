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
| The weekly gate | Deliberate. See below. |
| Filling the last bible section | Your sense of humor is the input the pipeline has no way to infer |

Everything else — ideas, scripts, voice, visuals, assembly, thumbnails,
metadata, upload, scheduling — is unattended.

**On the weekly gate.** It is ~10 minutes and it is the load-bearing part of
staying monetizable. YouTube's inauthentic content policy targets mass-produced
templated uploads; a closed GitHub issue showing a human picked and edited each
premise is the clearest evidence you have that a person directs this channel.
It is also where the quality comes from — idea selection beats production
quality by a wide margin.

If you want it fully hands-off anyway, see **Full autopilot** at the bottom.
It's one config change, and the tradeoff is stated there.

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

Then trigger `Weekly selection gate` manually once (**Actions** tab → Run
workflow). An issue appears with twenty premises.

Tick a few, close it. `Produce` fires, builds, renders, and — still in dry run
— stops short of uploading. Download the videos from the run's artifacts.

When you're happy, add repository variable **`DRY_RUN` = `false`**. That is
the switch that makes it live.

---

## From then on

Sunday morning an issue appears. Tick five boxes, close it. By Monday the
videos are published and the state files are committed back with what
everything cost.

That is the whole ongoing commitment.

---

## Full autopilot

If you want zero weekly involvement, add a step to `propose.yml` that ticks
the top five itself and closes the issue immediately.

The tradeoff, stated once: the closed-issue trail stops being evidence that a
human directed the channel, because one didn't. On a niche that is already
AI-generated meme content at volume, that trail is the main thing separating
you from the pattern the inauthentic content policy exists to catch. Videos
also stop improving, because nobody is steering.

My recommendation is to keep the gate and spend ten minutes a week. But it's
your channel, and it's a five-line change if you want it.
