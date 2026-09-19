# 07 · Envelope and browser artifact

**Question:** how small a graph reproduces the whole brain, spike for spike, over everything the toy lets a player do?

Needs slice 06. **Kill point: the architecture.**

## Why this can work

The model has no background activity. A neuron that never spikes influences nothing. So the neurons that spike anywhere in an enumerated set of trials, run as a subgraph, give exactly the whole-brain result on those trials. The equivalence is a test. It is exact only for trials that were enumerated, and only because random input is keyed by body ID and not by position in a stream.

## Contract

Delivers the envelope definition, the subgraph `.fskg` with its manifest, and a report. Does not deliver the browser engine.

## Seam

The `envelope` block of `contracts/codec/taste.codec.json`, written through `lab/flylab/codec/build.py`: `sides`, `opsOnOneSidedSips: false`, `lesionable` types (the ones slice 06 showed to matter), `activatable` types, `maxConcurrentOps: 1`, `seeds` (a fixed verified list of five), `variants: ["base"]`.

```
flylab.graph.extract(full, lock, codec.envelope, model) -> (subgraph .fskg, manifest, report)
```

- **Enumerated trials:** the five-by-five level grid, both sides, × (no operation + each single lesion + each single activation) × seeds; plus the same grid on the left alone and on the right alone with no operation × seeds. With 12 lesionable and 6 activatable types and 5 seeds that is about 2,600 one-second whole-brain trials. Poisson trains are shared across them, and they parallelise across cores.
- **Members:** every neuron that spiked, or whose `v` peaked at half of threshold or more, in any enumerated trial.
- **Sentinels:** every neuron outside the members that receives an excitatory edge from a member. They are simulated and have no out-edges. If a sentinel spikes, the trial has left the envelope and the recording says so in `sentinelBreaches`. The first neuron to escape must be a sentinel, so this guard is sound.
- **Edges:** every whole-brain edge among members, plus member → sentinel.
- Output to `data/built/web/`, committed, because it is small and the app needs it.

## Pre-written pass

1. `spikeHash` of the subgraph run equals the whole-brain run on 100% of enumerated trials.
2. The member set saturates: the last quarter of the enumeration adds under 2% new members.
3. Size: at most 8,000 members, 25,000 sentinels, 12 MB.
4. On 200 held-out trials (new seeds, pairs of lesions, lesions on one-sided sips), the MN9 count differs from the whole brain in at most 1% of trials, and at least 95% of the trials that differ raised a sentinel breach.

## What the human sees

An extraction report: member count against trials enumerated, the size table, the held-out divergence and breach recall, and a list of which cell types ended up inside.

## Fallbacks, in order

1. Too many sentinels: keep only sentinels whose `v` reached a quarter of threshold in some enumerated trial. This is declared here, before any result exists. The manifest records `sentinelRule: "partial"`, criterion 4 must still pass, and the app's badge wording changes to match.
2. Divergence too high: shrink the lesionable list, or drop activation from the live envelope and ship those as recordings.
3. Still failing: the browser does not compute. Slices 08 and 09 become a player for recorded whole-brain trials, which is what both reference projects ship. Tell the user.

## Verification

The four criteria, as an experiment `E03-envelope` under the slice 04 runner. Slice 05's verdict re-passes on the subgraph.

## Delegated

The margin within the stated rule, enumeration order, parallelism.

## Must stay green

`make check`. E01 and E02 verdicts unchanged.

## Feedback that would change this slice

The user wants more ingredients or double lesions in live play: that grows the enumeration, and the size criterion says whether it still fits.
