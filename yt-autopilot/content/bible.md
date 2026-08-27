# Channel Bible

> Injected verbatim into every script prompt. This file *is* the channel's
> voice — the pipeline has no taste of its own, only what is written here.
> Fill in the bracketed sections before your first real build.

## What this channel is

Absurdist meme comedy Shorts with a **recurring cast**. Not a clip farm — a
show with continuity, running jokes, and characters the audience learns.

That distinction is the whole strategy. A cast with lore is defensible: it
accumulates an audience that returns for *these characters*, and it is the
clearest evidence that a human is directing the channel rather than a prompt
loop. Disconnected AI clips at volume are exactly the pattern YouTube's
inauthentic content policy targets. The cast is both the moat and the defense.

## Audience

Teens and adults who are fluent in meme formats and watch Shorts in long
scroll sessions. **Not** children — nothing here is directed at under-13s, and
nothing is uploaded with the Made for Kids flag set.

## Voice rules

1. Deadpan delivery of insane premises. The characters never acknowledge that
   anything is strange.
2. Commit to the bit fully. No winking at the camera.
3. Escalate, never explain. Each beat raises the stakes of the last.
4. Characters have fixed speech patterns. [DEFINE PER CHARACTER IN cast.json]
5. The absurdity is the premise, not the vocabulary. Write plain sentences.
6. Short lines. Under 18 words, usually under 12.
7. The payoff loops back to the hook — a rewatch should land differently.
8. [ADD YOUR OWN — five more rules that are specific to your sense of humor]

## Banned constructions

Never write these. They mark the video as generic within two seconds:

- "Wait for it" / "watch till the end" / "you won't believe"
- "POV:" as an opener (overused to the point of invisibility)
- "Let that sink in"
- "Bro" as a sentence-opener crutch
- Any greeting, channel name, or "welcome back"
- Narrator explaining the joke after it lands
- Trend references that expire — this is a back catalogue, not a news feed

## Structure

| Section | Length | Job |
|---|---|---|
| Hook | ≤ 2.5s, ≤ 12 words | Earn the next two seconds with zero context |
| Beats | 3–6 lines | Escalate. No beat may be setup for later setup |
| Payoff | 1 line | Land it, and loop back to the hook |

Total spoken content: **110–145 words**, 45–58 seconds.

## Visual system

- House style is locked in `src/visual/images.ts` (`STYLE`). Changing it
  mid-catalogue makes old and new videos read as two different channels.
- Every character has a `look` string in `cast.json` that is spliced verbatim
  into every image prompt. Do not paraphrase it between videos.
- Karaoke captions are mandatory — their absence reads as unfinished.
- One punch word per video, maximum. Two is noise.

## Hard constraints

- Never Made for Kids. Never content directed at children.
- Synthetic media disclosure set on every upload.
- No real people, no impersonation, no real brands as targets.
- No slurs, no punching down, nothing sexual, nothing that reads as
  targeting a real private individual.
- Nothing that would look different if a 14-year-old watched it, because one will.
