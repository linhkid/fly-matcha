# 08 · TypeScript engine

**Question:** is the browser engine the same model as the oracle?

The fixture half needs only slice 02 and no connectome data. The real-graph half needs slice 07. The `web/` package is specified by slice 06, step 1. If this slice runs first, execute that step exactly as written, without choosing a UI framework, and note in `choices.md` that it is done. Installing npm packages and Playwright's browser are downloads and need the user's yes.


**Started early, 2026-09-19.** Slice V1 pulled two files of this engine forward, because the user asked for real interactions before the wiring could be loaded: `web/src/engine/prng.ts` (threefry2x32, `lane16`) and `web/src/engine/input.ts` (the spikes a drive forces). Both are held to the oracle's fixtures in `web/tests/engine.test.ts`. They are this slice's to keep, extend or replace; the folder rules (no imports from outside it, no clock, no other randomness) already apply to them.

## Contract

Delivers a pure engine, its Worker wrapper, and a page that proves parity. Does not deliver any game interface.

## Seam

```ts
// web/src/engine/  — imports nothing from the DOM, from a Worker, or from any other src/ folder
readGraph(buf: ArrayBuffer): Graph                     // zero-copy typed-array views, per contracts/GRAPH.md
createSim(graph: Graph, model: Model, seed: number): Sim
Sim.drive(indices, thr16, onStep, offStep)   Sim.silence(indices)   Sim.step(n): Uint32Array   Sim.stateHash(): string
validate(spec): null | ErrorCode          the oracle's codes
runTrial(graph, model, spec: TrialSpec): TrialRecording

// web/src/worker/engine-worker.ts   imports src/engine only
in:  { type: 'load', graphUrl, manifestUrl, modelUrl }  |  { type: 'runTrial', id, spec }
out: { type: 'ready', hashes }  |  { type: 'progress', id, step }  |  { type: 'done', id, recording }  |  { type: 'error', id, code }

// web/src/client/   the only module that talks to the Worker
loadEngine(urls): Promise<EngineHandle>     runTrial(spec): Promise<TrialRecording>
pairedRun(specA, specB): Promise<[TrialRecording, TrialRecording]>     // same seed, one difference
```

Recordings return as transferred buffers. The Worker verifies the graph's SHA-256 against the manifest before use and refuses `synthetic:true`. There is no pacer, no credit scheme and no streaming: play is trial-based, so the engine runs a trial to completion and hands it back.

`A`, `B`, `C` are parsed from the model JSON. Body IDs are 64-bit: read them as pairs of 32-bit words for the generator, never as JavaScript numbers.

## What the human sees

`/lab/engine`: one row per fixture, green or red, with the oracle's hash beside the engine's; then the real-graph parity rows; then a speed readout in simulated seconds per wall second.

## Verification

- Every fixture from slice 02 passes with exact equality, in Node under Vitest and in a headless browser under Playwright.
- `stateHash` matches the oracle at 10 checkpoints on 3 graphs over 10,000 steps.
- After slice 07: `spikeHash` equals the oracle's on 20 enumerated trials on the real subgraph.
- A grep gate in `make check` finds no `Math.random`, `Math.exp`, `Math.fround` or `Date.now` under `src/engine`.
- The import-boundary test passes.
- **Speed target:** one simulated second of the real subgraph in at most one wall second on this M5. **Floor:** five wall seconds. Below the floor, in order: an active-set update (rest is exact, so skipping resting neurons is legal); then a hard cutover to Rust compiled to WebAssembly, passing the same fixtures and deleting this engine. Changing `dt` is not on the list, because that is a model version.

## Delegated

Memory layout, the active-set structure, how the delay ring is stored, test organisation.

## Must stay green

`make check`. The oracle's fixtures are read, never written, from this side.

## Feedback that would change this slice

The user would rather have Rust now: the fixtures and the Worker messages are the seam, so the cutover costs one module. A bit mismatch that resists explanation: it is still a bug. Do not add a tolerance.
