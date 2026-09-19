# V1 · The living view, unlit

**Question:** can the fly, the tea and the whole brain be on screen, alive and honest, before a single spike exists to show?

Asked for by the user on 2026-09-19: "I want to visualize the fly brews matcha and also the neurons like in the Fly Brain or fly escape... not just taking a look at static html or terminal", and "make a pause brewing, by default it will brew and taste infinitely". Needs slice 01 only. Needs the user's yes for npm packages. It replaces slice 06's step 1 as the one place the `web/` package is specified.

## Contract

Delivers the page every later slice adds a layer to: a 3D scene with a fly at a tea table, the cloud of his neurons, an endless brewing loop with a pause, and the honesty tags. Nothing glows, because no recording exists yet. That is the point of the slice: the stage is proven dark before anything is allowed to light it.

Does not deliver spikes (V2), a verdict on any sip (05), lesions (06, 10) or a live engine (08).

## Step 1: the web scaffold

- `web/` with Vite, TypeScript in strict mode, Vitest and three.js. npm, because `bun` is not installed. Playwright is left for the first slice that needs a browser test, because it downloads a browser and needs its own yes.
- The folders of CONTRACTS.md's target layout, plus `src/view/` for the scene. Empty until their slices fill them.
- `make check` gains `npm test`, the import-boundary test, and the banned-call grep: `Math.random`, `Math.exp`, `Math.fround` and `Date.now` under `src/engine`; `Math.random` under `src/scope`, `src/swatch` and the part of `src/view` that turns spikes into light.
- Announce the npm install with package names and get the user's yes.

## Seam

```
lab/flylab/web/cloud.py      export_cloud(annotations, lock) -> data/built/web/brain.cloud + brain.cloud.json
web/src/view/cloud.ts        readCloud(buf) -> Cloud {bodyId: BigUint64Array, xyz: Float32Array, group: Uint8Array}
web/src/view/light.ts        light(cloud, recording | null, tStep, windowSteps) -> Float32Array      pure; null or no spikes gives all zeros
web/src/view/loop.ts         Loop: brew → present → taste → verdict → rest → next sip, forever; pause() and resume()
web/src/honesty/             Provenance, SpikeSource, QuantityDef, <Q>, the DOM audit        (moved here from slice 06)
```

`brain.cloud`, little-endian, sections on 8-byte boundaries: `"FSKCLOUD" | u32 version = 1 | u32 n | u64 bodyId[n] ascending | f32 xyz[3n] | u8 group[n]`. One point per typed neuron that has a `somaLocation`, which is 138,556 of 164,506. Coordinates are centred on the middle of the bounding box and divided by its largest extent, nothing else. `group` indexes a short list in the JSON beside it: `none`, `mn9`, `relay`, `proboscis`, and so on, taken from the lock. About 3 MB, committed under `data/built/web/`.

**Taste neurons have no position.** None of the 72 sweet and bitter neurons, and none of the 745 eye bristle sensors, has a cell body inside the imaged volume. They are drawn where they really are: on the fly. A strip of dots on his mouthparts, one per taste neuron, left and right, sweet and bitter. The interface says why.

## The loop

By default the scene never stops. A sip is composed from the tea menu and the sweets, in a fixed rotation over the 25 sips of the grid and the seeds; he is offered it; the taste phase runs; the outcome shows; a short rest; the next sip. A pause button, and the space bar, hold everything. While paused, later slices offer the player's own tools: compose a sip (09), bet and silence (06, 10).

In this slice the taste phase has nothing to replay. It shows the sip, the dark brain, and one line: "no recording yet: the wiring is loaded by slice 03". No outcome is shown and no proboscis moves, because a verdict nobody computed would be a lie.

The order of the rotation is fixed, not random, so that the same build shows the same sequence. Walking, whisking, pouring and the order of the ceremony are `staged` and tagged so.

## What the human sees

`npm run dev`, then the page: the fly at his table going through the motions of brewing, the grey cloud of 138,556 neurons turning slowly beside him with the taste circuit's named groups in colour, the taste neurons on his lips, the pause button, and a "what is staged here?" toggle.

## Verification

- `light()` on a null recording, and on a recording with no spikes, returns all zeros. A unit test, and the reason the slice exists.
- The cloud file regenerates byte for byte; its body IDs are a subset of the lock's universe; every group in the JSON exists in the lock.
- The loop under a fake clock: phases in order, forever; pause freezes the phase and the clock; resume continues from the same point.
- The DOM audit finds every quantity tagged. Group colours are `connectome`. Everything that moves is `staged`.
- The import-boundary test and the banned-call grep pass.
- **Visual variable: is it legible what is fly, what is brain, and what is taste neuron?** Crop: the whole frame at rest, paused. Out of scope: art quality, lighting, the fly's anatomy.
- A shot of the paused frame, then `screenshot-critique` as the last check. Without Playwright the shot is taken by hand in the browser pane, and the evidence note says so.
- **Human checkpoint, non-blocking:** does it feel like a place? Open the shot, wait about five minutes, decide on the evidence, record it, continue.

## Delegated

All art, which may be placeholder geometry. Camera, colours, the orientation of the cloud, the exact timing of the phases, the UI framework or none.

## Must stay green

`make check`.

## Feedback that would change this slice

The user wants the brain in front and the fly small, or the reverse. The user wants the loop to pick sips at random: allowed, from a seeded generator outside the banned folders, with the seed on screen.
