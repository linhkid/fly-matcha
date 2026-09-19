# 12 · Tea room

**Question:** can the ceremony be built without adding a single simulation concept?

Needs slice 11. This is where v1 ships.

## Contract

Delivers the framing the user asked for: a small, calm place where you serve a fly and he answers. Everything neural was built by earlier slices. This one adds sequence, staging and an about page.

## Since the living view

The room, the fly and the endless ceremony exist from V1 on. What is left for this slice is what makes it a finished place: the puppet's poses, the pacing, the copy, the seal overlay, the about page, and the static build.

## Seam

```ts
// web/src/routes/tearoom/
Ceremony: prepare → present → taste → verdict → reflect      consumes only decode() outcomes and TrialRecordings
scene.json   { steps[], puppetPoses[], copy[] }              every entry tagged provenance: "staged"
```

Deleting `web/src/routes/tearoom/` must leave `/bench/taste`, `/atlas` and `/journal` working. That is the test that no simulation concept leaked in.

What is staged, and tagged so: the walk to the bowl, whisking, the order of sweet before tea, the fly's posture, any sound, and which tier each tea on the menu belongs to. What is not: whether he drinks. A button, "what is staged here?", lights every staged element at once. The line under it: the legs are puppetry; the decision to move them was not.

A ceremony may end in refusal. There is no forced happy ending.

If branch B2 passed, matcha dust landing on the fly triggers grooming whenever the live circuit says so, and the whisking animation plays then. If it failed, whisking is on a timer and says so.

`/about` shows the manifest, the CC-BY 4.0 attribution to Janelia FlyEM, Cambridge and Google, the model's limits in plain language, the held-out divergence rate from slice 07, and the rival-rule chart from slice 05.

## What the human sees

`/tearoom`, and a static build that runs from any plain file server.

## Verification

- Playwright plays one full ceremony to a drink and one to a refusal.
- No clip plays on an empty recording.
- The DOM audit passes on this route; every staged element carries the tag.
- The delete-the-folder test above.
- `vite build` output served statically works offline.
- Sub-slices by visual variable: 12a staging with placeholders (does the sequence read?), 12b puppet poses, 12c the seal overlay. Each gets a shot and a `screenshot-critique` run as its last check, and `compare-screenshots` against the previous accepted shot.
- **Human checkpoint, non-blocking,** on 12a. Tone and art direction are the user's.

## Delegated

All art, pacing and copy. Placeholders are acceptable for v1.

## Must stay green

Everything.

## Feedback that would change this slice

Theme. The user chose matcha on 2026-09-19 (choices N1). If that ever changes, this is the slice that changes, along with the copy in 09 and 11. Nothing below the bench moves.

## After this slice

Run the `close-spec` skill: archive this folder to `specs/done/` and rewrite it from a build plan into a record of why things are the way they are.
