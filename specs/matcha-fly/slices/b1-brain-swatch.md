# B1 · Brain swatch

**Question:** can one second of brain activity become a piece of knitting that means something?

Needs slice 06, because it needs real recordings. Blocks nothing. This is the user's knitting idea, kept cheap, and it is the quickest route to something worth showing a friend. A good candidate for the first branch.

## Contract

A pure function from a recording to a knit chart.

```ts
// web/src/swatch/
recordingToSwatch(recording, lock, opts: {rows: 'types'|'neurons', binSteps, palette}): StitchGrid
renderSwatch(grid): SVG          exportChart(grid): knitting chart as PNG and as text rows
```

One column per cell type, ordered by hop depth from the tongue. One row per time bin. Stitch colour is spike count in that bin. The selvedge, the edge stitches, encodes the seed and the first bytes of `specSha256` and `graphSha256`, so every swatch is a reproducible record of an experiment and two swatches can be told apart by their edges.

It consumes `TrialRecording` and nothing else. It must not invent a second recording format.

## What the human sees

`/swatch`: drop in a recording, or pick one from the atlas. A sweet sip and a bitter sip make visibly different cloth. The chart can be printed and actually knitted.

## Verification

- A golden grid for one fixture recording.
- An empty recording gives plain fabric. No spikes, no pattern.
- Same recording, same pixels.
- **Visual variable: can you tell a drink from a refusal by the cloth alone?** Shot of two swatches side by side, then `screenshot-critique` as the last check.

## Delegated

Palette, stitch glyphs, bin width, export formats.

## Feedback that would change this slice

The user wants rows to be neurons, or wants a scarf built from a whole session. Both are options on the same function.
