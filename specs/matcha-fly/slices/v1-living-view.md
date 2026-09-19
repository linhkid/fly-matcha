# V1 · The living view: a dark brain and one live layer

**Question:** can the fly, the tea and the whole brain be on screen, alive and honest, before a single spike exists to show?

Asked for by the user on 2026-09-19: "I want to visualize the fly brews matcha and also the neurons like in the Fly Brain or fly escape... not just taking a look at static html or terminal", and "make a pause brewing, by default it will brew and taste infinitely". While it was being built the user added two things, both below: a pause is a break with a book, and tasting takes its time. Needs slice 01 only. Needs the user's yes for npm packages. It replaces slice 06's step 1 as the one place the `web/` package is specified.

## What changed while it was built, 2026-09-19

The slice was written as "unlit". Three requests from the user changed that, and the file now describes what was built:

1. "Make the HUD/text screen collapsible: it's obscuring the scene." Every panel folds to one line, the reaction card shows what his brain did and his words first, and `H` hides all text.
2. "Try your best to not STAGED things, make it as real as possible for the fly. I want to see real interactions." One layer of his nervous system needs no wiring: the spikes a sip forces in his taste neurons are fixed by `contracts/MODEL.md` from the seed, the body ID and the step alone. They are now computed in the browser as you watch, bit for bit the oracle's, and they light his lips. The cloud stays dark, because what his brain makes of those spikes needs the 508 MB of slice 03. Brewing tea stays staged for ever; no fly brain does that.
3. "Make the fly more beautiful and detailed, more real with movements." `web/src/view/fly.ts`: a male *Drosophila* in jointed placeholder geometry, with a tripod gait, turning before walking, head saccades, antennal twitches, wing flicks and breathing. He does not groom: branch B2 wants that movement to come from his brain.

## Contract

Delivers the page every later slice adds a layer to: a 3D scene with a fly at a tea table, the cloud of his neurons, an endless brewing loop with a pause, and the honesty tags. Nothing in the cloud glows, because his wiring is not loaded. The stage is proven dark before anything is allowed to light it, and the first thing allowed is the input layer: real model spikes, live, on his lips.

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
web/src/view/loop.ts         Loop: select → sift → brew → pour → taste → clean → next sip, forever; pause(), resume(), seek(); how long each phase of each sip lasts
web/src/view/puppet.ts       pose(phase, progress, sip, phaseSeconds) -> where every prop is; onBreak(pose, b); pure, and the one place that could stage a lie
web/src/view/lips.ts         lipLayout(mouthparts) -> one dot per taste neuron, left lobe and right lobe
web/src/view/hud.ts          the words around the stage as markup, so the audit can read them before the page does
web/src/engine/prng.ts       threefry2x32, lane16: the browser engine's first file, held to contracts/fixtures/prng           (pulled forward from slice 08)
web/src/engine/input.ts      InputLayer(seed, neurons).run(from, to, out): the spikes a drive forces, held to every driven fixture of the oracle
web/src/view/fly.ts          the fly's body and how it moves; staged; cannot extend the proboscis
web/src/view/scene.ts        one of the two files that know three.js: builds the room, places what pose() says, lights points from light() and nothing else
web/src/view/reaction.ts     reactionCard(sip, phase, recording | null) -> what the card says, as data with a tag on every line
lab/flylab/codec/build.py    the codec's one writer, created here with the levels and the tea menu; slice 05 adds the decoder
web/src/honesty/             Provenance, SpikeSource, QuantityDef, <Q>, the DOM audit        (moved here from slice 06)
```

`brain.cloud`, little-endian, sections on 8-byte boundaries: `"FSKCLOUD" | u32 version = 1 | u32 n | u64 bodyId[n] ascending | f32 xyz[3n] | u8 group[n]`. One point per typed neuron that has a `somaLocation`, which is 138,556 of 164,506. Coordinates are centred on the middle of the bounding box and divided by its largest extent, nothing else. `group` indexes a short list in the JSON beside it: `none`, `mn9`, `relay`, `proboscis`, and so on, taken from the lock. About 3 MB, committed under `data/built/web/`.

**Taste neurons have no position.** None of the 72 sweet and bitter neurons, and none of the 745 eye bristle sensors, has a cell body inside the imaged volume. They are drawn where they really are: on the fly. A strip of dots on his mouthparts, one per taste neuron, left and right, sweet and bitter. The interface says why.

## The loop

The user set the staging on 2026-09-19: "just movement of it brew the matcha: select, sift, brew, pour to cup and taste. then clean then do that again." Nothing more detailed than that is wanted. Six phases, simple shapes, forever: he **selects** a tea from the menu, **sifts** it, **brews** it with the whisk, **pours** it into the cup, **tastes**, **cleans** up, and starts again with the next sip of a fixed rotation over teas, scoops and sweets.

**A pause is a break, not a freeze.** The user, 2026-09-19: "When hit pause, it should not stop but the fly can take a break and read a Dostoevsky book." The button (and the space bar) holds the ceremony's clock and nothing else. He puts down whatever is in the air, walks to his cushion and reads; the cloud keeps turning. The book changes with the sip: six titles, and the title is printed on the cover. Only titles are used; no line of any book is quoted. The card's heading says what he is reading and his words are about the book. The first three lines of the card stay, because the sip is still waiting on the table. `onBreak()` may only put things down: no tea appears, is drunk or is spilled by a break, and a test holds it to that. While paused, later slices offer the player's own tools: compose a sip (09), bet and silence (06, 10). He reads while the player works.

**Tasting takes its time.** The user, 2026-09-19: "make it quite deliberately when at the stage of sipping/drinking. I want him to fully enjoy, so the time he spends on tasting/drinking can vary." Tasting is the long phase. He stands before the cup, lowers his head slowly until his lips touch the tea, stays, and comes up slowly. Coming and going always take the same seconds; when the phase is longer it is the staying that grows. While his lips are on the tea he goes still, and a ring spreads on the surface. How long he stays varies from 8 to 14 seconds and is never the same twice running.

What sets that time is where honesty bites. Touching the tea is the stimulus, and it is not drinking: in this slice the cup stays full, the sweets stay on the table and the proboscis does not move. **Until a recording exists the time is staged** and comes from a fixed list of eleven that ignores the tea on purpose: eleven has no factor in common with the twenty-five sips of a cycle, nor with the two, six or seven ways a sip can be served, so every named serving meets every time and nobody can read a liking into a long stay. The card says so in its "Did" line, with the seconds tagged `staged`. **From V2 the time is the model's:** he stays for as long as the replayed recording keeps MN9 firing, and the cup drains only while it does. That is what "he enjoys it" will mean here: his brain kept the proboscis out. V2 and slice 05 carry the rule.

## The reaction card

The user also asked that "the feelings and reaction have to be shown somewhere like a text modal with the brain cloud". A card sits beside the cloud and is rewritten every phase. It has four lines, each with its tag, and the split between them is the honest answer to "what does a simulated fly feel":

| Line | Says | Tag |
|---|---|---|
| Served | the tea, the scoops, the sweets, and the bitter and sweet levels they resolve to | `staged` for the tea's tier, `model` for the levels |
| Heard by | which neurons that sip drives and how many: 34 sweet, 38 bitter of which 6 cannot speak in the base model | `connectome` for the counts, `model` for the rates |
| Did | what the brain did: spikes in the taste neurons, the relays and the two MN9 neurons, and the outcome once slice 05 licenses one | `model`, with source `recorded` or `live` |
| In his words | one short line in the fly's voice, chosen by the outcome and by nothing else | `staged` |

Under the card, always: the words are puppetry; the decision is not. The voice line may never say more than the outcome supports. With no recording it says nothing about taste at all.

In this slice the taste phase has nothing to replay. "Did" reads: no recording yet, his wiring is loaded by slice 03, and we do not make reactions up. No proboscis moves, because a verdict nobody computed would be a lie.

The order of the rotation is fixed, not random, so that the same build shows the same sequence. Walking, whisking, pouring and the order of the ceremony are `staged` and tagged so.

## The live layer

One trial per bowl. The seed is the bowl's number; step 0 is the moment the tea touches his lips; each of the 72 taste neurons is driven at the threshold its level sets. How far the trial has run is a function of the ceremony's clock alone, so a break holds it and a still repeats it. His time is shown 50 times slower, so single spikes can be seen: a dot on his lips, and its twin in the magnified panel, stays lit for 6 ms of his time. The card counts the spikes as they come, tagged `model` and `live`, with the seed.

What this is and is not: these are exactly the spikes any run of the whole brain would force for the same seed. They are not everything his taste neurons do in the whole brain, where a taste neuron that receives synapses can also fire by itself, and they are nothing of what happens behind them. The card says both.

## What the human sees

`npm run dev`, then the page: the fly at his table going through the motions of brewing, the grey cloud of 138,556 neurons turning slowly beside him with the taste circuit's named groups in colour, the taste neurons on his lips, the pause button, and a "what is staged here?" toggle.

## Verification

- `light()` on a null recording, and on a recording with no spikes, returns all zeros. A unit test, and the reason the slice exists.
- The cloud file regenerates byte for byte; its body IDs are a subset of the lock's universe; every group in the JSON exists in the lock.
- The loop under a fake clock: the six phases in order, forever; pause freezes the phase and the clock; resume continues from the same point; a loop told how long each phase of each sip lasts reports it and keeps to it.
- The poses: the proboscis never moves, the cup stays full and the sweets stay while he tastes, no level jumps between or within phases, and a break only puts things down. Tasting: he looks first, his lips are on the tea by 3.4 s, he is up before he leaves, and a longer taste is a longer stay. The times never repeat back to back, and every sip of the grid meets every time.
- The card on a break keeps the sip, names the book, and says nothing about the taste of anything.
- The reaction card with no recording claims nothing: no outcome, no voice line about taste, and every line carries its tag.
- The codec's menu table resolves every tea and scoop count to one of the five levels, and the rotation visits all 25 sips of the grid.
- The DOM audit finds every quantity tagged. Group colours are `connectome`. Everything that moves is `staged`.
- The import-boundary test and the banned-call grep pass.
- The browser's generator gives the three published answers and every lane of the oracle's fixture. The spikes `InputLayer` forces are spikes of the oracle's recording in all 21 driven fixtures, and are all of an input neuron's spikes wherever it receives no synapse.
- The card's tenses: "will be driven" before his lips touch, "driven now" while they do, "were driven" after; spike counts carry `data-src="live"`; no decision is said to exist.
- **Visual variable: is it legible what is fly, what is brain, and what is taste neuron?** Crop: the whole frame at rest, paused. Out of scope: art quality, lighting, the fly's anatomy.
- A shot of the paused frame, then `screenshot-critique` as the last check. The page opens as a still from its address, so a shot can be taken twice and be the same: `?sip=3&phase=taste&at=0.5`, with `&break=1` for the break and `&staged=1` for the toggle. Without Playwright the shots are taken by the Chrome already on the machine, headless, with a throwaway profile; nothing is downloaded. The evidence note says so.
- **Human checkpoint, non-blocking:** does it feel like a place? Open the shot, wait about five minutes, decide on the evidence, record it, continue.

## Delegated

All art, which may be placeholder geometry. Camera, colours, the orientation of the cloud, the exact timing of the phases, the UI framework or none, the titles on his shelf and what he says about them.

## Must stay green

`make check`.

## Feedback that would change this slice

The user wants the brain in front and the fly small, or the reverse. The user wants the loop to pick sips at random: allowed, from a seeded generator outside the banned folders, with the seed on screen.
