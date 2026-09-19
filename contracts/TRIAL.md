# Trials, recordings and fixtures

Play and experiments share one unit: a trial. An engine computes it to the end, and only then is it shown, slowly. A taste decision is over in tens of milliseconds, so a slow replay is the only way to see it.

## Groups

A trial names groups, not neurons. Before a trial runs, each name is resolved against the graph into neuron indices, ascending, and one side letter per neuron: `L`, `R` or `U` for unknown.

```json
{ "grn.sweet": { "indices": [4, 9, 12], "sides": "LRL" } }
```

A drive on `left` reaches the `L` members, on `right` the `R` members, on `both` every member including `U`. Activation and silencing have no side and reach every member. Indices are strictly ascending and fit the graph, and there is exactly one side letter per index; a group that breaks this is a bug in the resolver, and an engine raises an error instead of returning a refusal code. Resolution from the circuit lock is slice 03's job; an engine receives groups already resolved.

## TrialSpec

Strings and integers only, by design, so that it has one canonical form. A number counts as an integer when its value is integral, however it was written: `1.0` and `3e1` are the integers 1 and 30, because `JSON.parse` cannot tell them from `1` and `30` and both validators must agree. A spec is normalised that way before it is checked or hashed. `1.5`, `true` and `"1"` are not integers.

```json
{ "modelId": "lif-shiu-v1", "variant": "base", "graphSha256": "", "codecSha256": "",
  "seed": 1, "durationSteps": 10000,
  "drives":    [ { "group": "grn.sweet", "side": "both", "thr16": 655, "onStep": 0, "offStep": 10000 } ],
  "silenced":  [ "hub.a" ],
  "activated": [ { "typeOrGroup": "hub.b", "thr16": 327, "onStep": 0, "offStep": 10000 } ] }
```

`graphSha256` is the hash of the `.fskg` file the trial is meant for, or the empty string for an in-memory graph. `codecSha256` is the hash of the codec that produced the thresholds, or the empty string when none did.

`specSha256` is SHA-256 of the spec's canonical JSON: UTF-8, keys sorted, no whitespace, non-ASCII characters not escaped.

### Refusals

An invalid spec is refused with one stable code, the same in every implementation. Checks run in this order and the first failure wins.

| Code | When |
|---|---|
| `BAD_FIELD` | The spec, a drive or an activation is not an object with exactly its keys; a value has the wrong type; `seed` is outside 0 … 2^32 − 1; `durationSteps` is outside 1 … 2^31 − 1; `thr16` is outside 0 … 65535; `side` is not `both`, `left` or `right`; or a window does not satisfy `0 <= onStep < offStep <= durationSteps` |
| `UNKNOWN_MODEL` | `modelId` is not the loaded model |
| `UNKNOWN_VARIANT` | `variant` is not registered, or is not the variant the engine was loaded with |
| `GRAPH_MISMATCH` | `graphSha256` is not the loaded graph's |
| `UNKNOWN_GROUP` | A drive, activation or silencing names a group that was not resolved |
| `NEURON_DRIVEN_TWICE` | After resolving sides, a neuron sits in two drives or activations, overlapping in time or not |
| `NEURON_SILENCED_AND_DRIVEN` | A neuron is both silenced and an input |

There are no JSON Schema files. A schema would be a second owner of what a valid trial is, with nothing to hold it to the validators. The fixtures under `contracts/fixtures/trial/` carry one invalid spec for every way of being refused, and one with two defects for every neighbouring pair of checks, so that the order above is pinned too. Both validators must agree with all of them.

## TrialRecording

```json
{ "spec": { }, "specSha256": "…",
  "spikeStep": [0, 18], "spikeBodyId": ["10", "20"],
  "spikeHash": "…", "sentinelBreaches": [18],
  "engine": { "name": "flylab-oracle", "version": "1" } }
```

- `spikeStep` and `spikeBodyId` run in parallel, sorted by step and then by body ID. Body IDs are decimal strings, because they do not fit a JavaScript number, and because an ID means the same thing in the whole brain and in a subgraph where an index does not.
- Sentinel neurons are left out of both lists. A sentinel is a neuron on the boundary of a subgraph, simulated only to notice escapes. The steps at which any sentinel fired are listed in `sentinelBreaches`, ascending, each once. A recording with a breach has left the envelope it was verified for.
- `spikeHash` is SHA-256 over the listed spikes in order, each as `step` in 32 unsigned bits followed by `bodyId` in 64 unsigned bits, little-endian. Two runs are the same run iff their hashes match. To compare a whole-brain run with a subgraph run, hash the whole-brain spikes of the subgraph's member neurons only; any other whole-brain spike is itself a breach.
- On disk a recording is this JSON. The knit swatch, the journal and the atlas all read it. Nothing may invent a second recording format.

## Fixtures

Written only by `python -m flylab model fixtures`. An engine reads them and must match every value exactly, except `recording.engine`, which names whoever made the recording. In a trace, every float64 appears as its IEEE-754 bit pattern in 16 hex digits, most significant first, for example `"0x3fefd70a3d70a3d7"`, so that no parser can round it. The numbers inside `model` are ordinary JSON: `A`, `B` and `C` as 17-digit strings, the rest as the shortest decimals that round-trip, which JavaScript and Python parse to the same bits.

```
contracts/fixtures/prng/   the generator: published vectors, then lane16 samples
contracts/fixtures/lif/    { fixture, about, model, variant, graph, groups, spec, trace, recording }
contracts/fixtures/trial/  { fixture, about, model, variant, graph, groups, spec, error }
```

Each fixture is self-contained. `model` is the full model JSON the trial ran under, with its variant or a test-only override already applied; two fixtures set the threshold to the exact peak of a potential, and one bit below it, to pin the strict comparison. `graph` holds the fields of the graph format as plain lists. `trace` holds, for chosen steps, the state after that step: `v`, `g`, `refr`, the indices that spiked, and the state hash. `recording` is the whole trial's recording.

While writing a fixture the oracle runs the trial twice, once visiting every neuron and once visiting only those that are not at rest, and refuses to write if the two ever differ.
