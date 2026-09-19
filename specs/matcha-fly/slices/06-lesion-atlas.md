# 06 · Lesion atlas

**Question:** is "predict, then silence a cell type, then see" deep enough to carry a game?

Needs slice 05. **Kill point: the product.** This is the first thing anyone can play, and it needs no browser engine, so it tests the fun before the expensive half of the plan is built.

## Contract

Delivers experiment `E02-lesion-atlas`, run on the whole brain, and a static quiz page that plays back its results. It also starts the `web/` package and the honesty module.

Does not deliver a live engine, the circuit view or the tea room.

## The experiment

Six conditions from slice 05's grid: sweet 3 alone; sweet 3 with bitter 1, 3 and 4; bitter 3 alone; and the cell where the rival rule was most wrong on held-out seeds. For each, silence one cell type at a time, both sides. Three seeds each. Record the MN9 count with and without the lesion, on the same seed.

**Which types, chosen by wiring alone:** every type in `hub.mn9.in` and in each `hub.grn.out.*` group from slice 03. No type is picked because of what it did in slice 05. Selecting by effect and then testing for an effect would be circular.

**Pre-written pass:** at least 8 types shift the MN9 count by 30% or more in some condition, and at least 3 of them raise it. The ones that raise it are the fun ones: cutting a brake.

This is a product gate. It asks whether lesions are distinguishable enough to play with. It makes no claim that these are the only types that matter.

Also run, for the same types, activation alone at 50 Hz with no taste input. Necessity and sufficiency are different, and the quiz can ask about both.

## Seam

```
data/built/web/atlas.json   { conditions[], types[{type, nt, hopDepth, nNeurons}], cells[{condition, type, op: silence|activate, seeds[], mn9Base[], mn9Op[]}],
                              recordings[{id, specSha256, file}] , source: "recorded", graphSha256, modelId }
                            written only by E02's run.py; hopDepth is copied from the lock, not recomputed
contracts/schemas/provenance.json      the two tags, as a schema both languages validate
web/src/honesty/            Provenance, SpikeSource, QuantityDef, <Q>, the DOM audit
web/src/routes/atlas/       consumes atlas.json only
```

A handful of full `TrialRecording` files ship for showcase panels. The rest is the table.

## Step 1: the web scaffold

This step is the one specification of the `web/` package. Slice 08's fixture half may execute it early; nobody else defines it.

- `web/` with Vite, TypeScript in strict mode, Vitest, and Playwright for shots and browser tests. npm, because `bun` is not installed here.
- The folders from CONTRACTS.md's target layout, empty until their slices fill them.
- `make check` gains: `npm test`, the import-boundary test, and the banned-call grep (`Math.random`, `Math.exp`, `Math.fround`, `Date.now` under `src/engine`; `Math.random` under `src/scope` and `src/swatch`).
- Installing npm packages and Playwright's browser are downloads. Announce them and get the user's yes.
- The UI framework is chosen in this slice, not in step 1, and recorded in `choices.md`. The engine, scope and swatch folders must not depend on it. If slice 08 executed step 1 early, the choice is still made here.

## What the human sees

`/atlas`. Each round shows a sip, a cell type with a card (transmitter, how many hops from the tongue, what it talks to), and asks: will he drink more, less or the same? The player bets. The reveal shows paired bars for the recorded MN9 rate with and without the lesion, per seed, and the line "recorded from the whole-brain run, seed N", with the neuron count read from the manifest through `<Q>`. A running score tracks how well calibrated the player's bets are.

Cell types appear under plain working names such as "relay 3 (GNG015)". Nicknames are earned later, in slice 11.

## Verification

- The experiment's pass criterion above.
- Every number on the page goes through `<Q>` and the DOM audit finds no untagged quantity.
- The page's bars equal `atlas.json` values exactly.
- **Visual variable: legibility of the reveal panel.** Crop: the paired bars and the outcome line. Out of scope: art, layout polish, the card's typography.
- Take a Playwright shot of a bet and a reveal. Run `screenshot-critique` on it as the last check before accepting the slice.
- **Human checkpoint, non-blocking:** open the shots with `preview-shots` and ask one question: is predicting fun for five minutes? Wait about five minutes. If the user is silent, decide on the evidence, record it in `choices.md`, close the shots, continue.

On a pass this slice enables `taste.lesion` and `taste.activate` in `contracts/mechanics.json`.

## Fallbacks

Fewer than 8 types matter: widen the ingredients (water, low salt, the touch brake) and run once more, as a new experiment `E02b` with fresh seeds, as the harness requires. Still thin: re-scope the product to a guided explainer of the taste law with the shuffle and sign-flip comparisons, and tell the user before any engine work begins.

## Delegated

Layout, colour, copy tone, framework choice, how bets are scored.

## Must stay green

`make check`, which now runs TypeScript tests, the DOM audit and the import-boundary test.

## Feedback that would change this slice

The user finds betting tedious: drop the score, keep the reveal. The user wants to explore freely instead of being quizzed: add a browse mode over the same table.
