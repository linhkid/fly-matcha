# 10 · Circuit scope

**Question:** can someone who has never seen this circuit tell who excites whom, who inhibits whom, and what fired?

Needs slice 09. Five sub-slices, one visual variable each. Each has its own crop, its own verdict and its own `screenshot-critique` run. Whole-page comparison happens only at the end.

## Contract

Delivers the view that teaches: the cascade from tongue to muscle, drawn from the manifest and the lock, animated only by a recording. Then the two tools that turn watching into experimenting.

## Seam

```ts
// web/src/scope/   pure: no engine, no client, no Worker, no randomness
layoutCircuit(manifest, lock, atlas): { nodes: [{type, nt, hopDepth, nNeurons, x, y}], edges: [{from, to, sign, synapses}] }
renderCircuit(layout, recording | null, tStep, marks): SceneDescription
// paired reruns come from src/client (slice 08): pairedRun(specA, specB)
```

Nodes are cell types, not neurons. Which types appear is decided by rule, not by hand: the taste populations, MN9, and up to 12 others ranked by how much silencing them moved MN9 in the atlas. `hopDepth` is read from the lock, which owns it.

| Sub-slice | Variable judged | Crop | Explicitly out of scope |
|---|---|---|---|
| 10a layout | Does left-to-right read as tongue → relays → muscle? | the node positions, unlit | colour, glow, edges' weight |
| 10b glow and scrubber | Can you see the order in which things fired? Glow is spike count in a stated window ending at the scrub position | nodes during replay | edge styling, cards |
| 10c edges | Can you tell excitation from inhibition, and strong from weak? Colour is sign, thickness is synapse count | edges only | node art |
| 10d cards | Does a card answer four questions: what is this, what is being measured, which data is it from, what is approximated? | one open card | everything else |
| 10e the light wand | Can you silence or activate a type, rerun on the same seed, and see the two results side by side? | marks on nodes and the paired meters | layout polish |

## Rules

- Glow is a pure function of the recording. No recording, no glow. A unit test renders an empty recording and asserts every node is dark.
- A node outside the live subgraph, such as the front-leg motor neurons before branch B2, is drawn hatched and labelled "not simulated". It never glows.
- Edge sign colour is `model`, because sign comes from a predicted transmitter and a policy. Edge thickness is `connectome`. The tags show it.
- Cards use working names until the player earns a nickname (slice 11). Card text is hand-written per type, in the register of `../fly-escape/apps/web/src/neural-explanations.tsx`.
- The wand offers only the types in the envelope, one operation at a time, and none on a one-sided sip. A second simultaneous operation is allowed but runs as `exploratory`, and the badge says so. Anything outside the envelope's types is answered from the atlas, with source `recorded`.

## Verification

- Per sub-slice: a Playwright shot of the crop, then `screenshot-critique` as the last check. From 10b on, also `compare-screenshots` against the previous sub-slice's accepted shot, so each step is judged for whether it made the view less wrong.
- The layout is deterministic: same inputs, same coordinates.
- 10e: silencing the type that slice 06 found to be the strongest brake turns a refusal into a drink, and the expected result is read from `atlas.json`.
- Paired runs differ only in the one requested change. Their input spike trains are identical, which the engine test from slice 02 already guarantees.
- After 10e, one whole-page shot and a final critique.
- **Human checkpoint, non-blocking,** after 10b and after 10e.

## Delegated

Drawing technology (SVG or canvas), colours, animation easing of the scrubber handle, card layout, copy.

## Must stay green

`make check`. The banned-call grep now also covers `src/scope`.

## Feedback that would change this slice

Too many nodes to read: collapse further by rule, never by deleting inconvenient types. The user wants individual neurons: add a drill-down inside a type, still driven only by the recording.
