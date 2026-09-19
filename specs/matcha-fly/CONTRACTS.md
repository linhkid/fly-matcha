# Contracts

What crosses a seam, and who owns it. Slices cite this file instead of restating it. It stays the authority for the life of the spec. When a slice materialises part of it under `contracts/` in the repo (slice 02 does this for the model), that slice replaces the section here with a pointer, so there is never a second copy to drift.

Conventions used throughout: integers are little-endian when turned into bytes; every hash is SHA-256, written as lowercase hex; step indices start at 0.

## Target layout

```
contracts/   MODEL.md  GRAPH.md  TRIAL.md  model/lif-shiu-v1.json  model/variants.json
             codec/taste.codec.json  schemas/*.json  fixtures/{prng,lif,graph,codec,trial}/  mechanics.json
circuits/    taste.circuit.json  taste.lock.json  taste.census.html   (one set per circuit)
lab/         flylab/{data,census,graph,model,codec,experiments,report}/   requirements.txt
             experiments/E01-taste-law/{prereg.json,run.py,consumed.json,verdict.json,report.html}   runs/ ignored
web/         one Vite + TypeScript package
             src/engine/   pure: the model and the graph reader, nothing else
             src/worker/   the Worker entry; imports src/engine only
             src/client/   the only module that talks to the Worker: loadEngine, runTrial, pairedRun
             src/codec/    src/honesty/    src/scope/ (pure drawing from a recording)    src/swatch/ (branch B1)
             src/routes/{atlas,lab-engine,bench-taste,journal,tearoom,about}/   plus swatch and bench-groom if their branches land
data/        raw/ and built/full/ ignored     built/web/ small and committed
specs/matcha-fly/
```

Names are theme-free up to the engine (`flylab`, `FSKGRAPH`), so a change of theme touches only routes, copy and art.

One `web/` package, not a workspace of packages. Seams inside it are enforced by an import test: `src/engine` imports nothing from the DOM, a Worker or any other `src/` folder; `src/scope` and `src/swatch` import no engine, client or Worker; only `src/client` touches the Worker; routes import client, codec, honesty, scope and swatch. If a second app ever appears, extract then.

## One owner per concept

| Concept | Sole owner |
|---|---|
| Raw data and provenance | `lab/flylab/data/fetch.py` → `data/raw/sources.json` |
| Graph artifact format | `contracts/GRAPH.md`. Sole writer `lab/flylab/graph/format.py`. Sole browser reader `web/src/engine/graph.ts` |
| Circuit definitions and census | `circuits/*.circuit.json` + `lab/flylab/census/` → `*.lock.json`. The lock also owns each type's `hopDepth` |
| Neuron model and its variants | `contracts/MODEL.md` + `contracts/model/lif-shiu-v1.json` + `contracts/model/variants.json` |
| Trial spec and recording | `contracts/TRIAL.md` + schema |
| Python oracle | `lab/flylab/model/oracle.py`. Only the oracle writes fixtures |
| Browser engine | `web/src/engine/`. Reads fixtures, never writes them |
| Dose → spikes, spikes → behaviour, envelope | The file `contracts/codec/taste.codec.json`, written only by `lab/flylab/codec/build.py`. Slices 05, 07 and B2 each add to it through that one writer. One small interpreter per language, both pinned by fixtures |
| Experiments and verdicts | `lab/experiments/<id>/`. `verdict.json` is the artifact; HTML is a rendering of it |
| Which mechanics may ship | `contracts/mechanics.json`, checked by `make check`. One chain, one gate: a puzzle or a route requires mechanics, a mechanic requires an experiment's `pass` |
| The `web/` package scaffold | Slice 06, step 1. It may be executed early by slice 08's fixture half, but it is specified in one place |
| Honesty tags | `contracts/schemas/provenance.json` + `web/src/honesty/` |

There are two implementations of the model, the oracle and the engine, and never a third. No backend abstraction is built for a future Rust engine. If one is ever needed it is a hard cutover that passes the same fixtures and deletes the TypeScript engine.

## Graph artifact: `.fskg` version 1

Little-endian. Every section starts on an 8-byte boundary, zero padded.

```
char[8]  "FSKGRAPH"
u32      version = 1
u32      N            neurons
u32      E            edges
u32      minSynapses  edge threshold used at build (5)
u64[N]   bodyId       ascending; neuron index = rank
u8[N]    nt           0 unknown 1 acetylcholine 2 GABA 3 glutamate 4 histamine 5 dopamine 6 octopamine 7 serotonin
u8[N]    flags        bit0 = sentinel (simulated, out-edges omitted)
u32[N+1] outOffset    rows are PRESYNAPTIC
u32[E]   target       ascending within a row
u16[E]   synCount     build asserts <= 65535
```

**The file holds facts only.** No floats, no signs, no group names. Sign policy and weight scale belong to the model, so flipping glutamate is a model variant and not a new artifact. This is a deliberate break from fly-escape's `FLYGRAPH`, whose signed f64 weights fuse synapse counts, predicted transmitter and model scale into one number and then need a summation-order contract.

Build rules for the full graph: bodies with a non-null `type`; the traced-only weights file; if the file has more than one row per `(pre, post)` pair, sum them first; then keep edges with at least 5 synapses; drop self-edges, which in electron microscopy are mostly segmentation artefacts, and count them in the manifest. `nt` comes from `consensus_nt`, lower-cased, matched against the seven names above; anything else is 0.

The manifest beside it: `{kind: full|subgraph, dataset{name,version,license,attribution}, sources[], graph{file,sha256,N,E,minSynapses}, filters{droppedUntyped,droppedSelfEdges,summedDuplicatePairs}, counts{ntHistogram,unknownNt}, parent?{graphSha256}, extraction?{lockSha256,codecSha256,modelId,rule,seeds,heldOutBreachRate,sentinelRule}, exporter{gitRev,sourceSha256}, synthetic:false}`. A reader refuses `synthetic:true` outside tests. Groups live in the circuit lock, not here.

## Circuit file and lock

A circuit file lists roles. Each role selects neurons by type name, type pattern, annotation columns or explicit body IDs, states what it expects to find, and carries its evidence: a claim, a source, and a kind (`annotation`, `paper`, `crosswalk` through the dataset's own synonym columns, or `connectivity`). The file also holds literature aliases to look up, anchor counts seen elsewhere, and notes for the report. `validate_circuit` in `lab/flylab/census/census.py` is the authority on its shape. Only roles bound on `annotation` or `paper` evidence may gate a slice. Every expected count states its basis: `paper`, `anchor` (seen elsewhere before the file was downloaded) or `observed` (pinned from this file to catch drift, and not evidence). An unknown key anywhere in a role is an error, so a typo can neither widen a binding nor switch off a check.

```
{ version: 1, circuit, annotationsSha256, transmittersSha256, graphSha256 | null,
  groups: [{ id, bodyIds: [decimal strings], perSide: {L, R, unknown}, ntHistogram, evidenceKind: annotation|paper|crosswalk|connectivity }],
  types:  [{ type, nNeurons, nt, hopDepth: int | null }] }
```

- The census universe is typed bodies only, because the graph holds nothing else. A lock never names a body the graph will lack.
- A body may belong to at most one `grn.*` group. An overlap is a census failure (`OVERLAP`) for every group involved, whatever order the file lists them in.
- `types[]` describes whole types, bound or not: `nNeurons` counts every neuron of the type in the dataset and `nt` is the type's majority label, because `hopDepth` is a property of the type.
- Transmitter labels are the seven names of the graph format or `unknown`. The source's `unclear`, and a body with no prediction, both become `unknown`.
- Side of a neuron: `somaSide` if it is L or R, else `rootSide` if it is L or R, else `unknown`. Taste neurons have no cell body in the volume, so theirs comes from `rootSide`; `entryNerve` carries no side in this release, and a name suffix alone is not treated as evidence. A neuron of unknown side is driven only by a `both` sip.
- `expect.nt` is met when at least half of a group's neurons carry that transmitter.
- `hopDepth` is the smallest number of edges on a directed path from any neuron of any bound `grn.*` group to any neuron of the type, over the full graph, ignoring sign. Taste neurons are 0. Unreachable is `null`. `bind_connectivity` recomputes it for every type whenever the lock changes; nothing else computes it.
- Ranking by synapse count breaks ties by type name, ascending.

## Neuron model: `lif-shiu-v1`

The published Shiu et al. model, discretised so two languages cannot disagree. Read from `model.py` in the authors' repo: exact (`linear`) integration, `(unless refractory)` on both `v` and `g`, reset clears `g`, driven neurons have no refractory period, a Poisson event forces a spike.

State per neuron: `v` and `g` as float64 in mV above rest, `refr` as int32 steps, `acc` as int32. At `t = 0` everything is zero and no spikes are in flight.

```json
{ "id": "lif-shiu-v1", "dtMs": 0.1, "delaySteps": 18, "refracSteps": 22, "vThMv": 7.0,
  "A": "<17 digits>", "B": "<17 digits>", "C": "<17 digits>", "wSynMv": 0.275, "snapEpsMv": 1e-9,
  "signPolicy": {"acetylcholine":1,"gaba":-1,"glutamate":-1,"histamine":-1,
                 "dopamine":0,"octopamine":0,"serotonin":0,"unknown":0},
  "prng": "threefry2x32-20/lane16" }
```

`A = exp(-dt/tau_m)`, `B = exp(-dt/tau_s)`, `C = (A - B) * tau_s / (tau_m - tau_s)` evaluated left to right in float64, with `tau_m = 20 ms`, `tau_s = 5 ms`. The oracle computes them once and freezes them as 17-significant-digit decimal strings. Only the frozen strings are normative. **Engines never call `exp`**, because transcendental functions differ between platforms (FlyBrain's `CLAUDE.md` records what that cost them).

**Input neurons.** A neuron named by any drive or activation in the `TrialSpec` is an input neuron for the whole trial. Input neurons have no refractory period, as in the published code. A spec that names the same neuron in two drives or activations, or that both silences and drives a neuron, is invalid, and both implementations reject it with the same error code.

Step `t`, for `t = 0 … durationSteps - 1`, normative:

1. **Deliver.** For each neuron `j` that spiked at step `t - 18` (none when `t < 18`), ascending, for each out-edge `(j → i, count)`: `acc[i] += sign(nt[j]) * count`. Integer sums are order-free, so there is no summation-order contract.
2. **Update**, for each neuron `i` ascending:
   1. If silenced: `v = g = 0`, `acc = 0`, skip. A silenced neuron emits nothing. (Shiu zeroes its outgoing weights instead; downstream effects are identical.)
   2. `g += wSyn * acc; acc = 0`. This happens even while refractory: arrivals are kept.
   3. If `refr > 0`: `refr -= 1`, skip. `v` and `g` stay frozen. This never happens to an input neuron.
   4. `v = v*A + g*C` using the old `g`, then `g = g*B`.
   5. `forced` is true iff `i` is an input neuron, `onStep <= t < offStep` for its drive, and `lane16(seed, bodyId[i], t) < thr16` (strict, so `thr16 = 0` never fires).
   6. Spike iff `forced` or `v > vTh` (strict). On a spike: record `(t, i)`, `v = g = 0`, and `refr = 22` unless `i` is an input neuron.
   7. If `|v| < snapEps` and `|g| < snapEps`: `v = g = 0`. This gives an exact rest state, which makes active-set updates legal and keeps denormals out.
3. Spikes recorded at `t` are delivered at `t + 18`.

No fused multiply-add anywhere. The oracle uses plain NumPy ufuncs.

**Random input.** Counter-based, so a neuron's Poisson train depends only on `(seed, bodyId, step)`. It is identical in the full graph, in any subgraph and under any lesion, which is what makes paired comparisons and the envelope test exact. `threefry2x32` with 20 rounds, as `threefry2x32_20(counter, key)` in Random123: `seed` is a u32; key is `(seed, floor(t/4))`; counter is `(bodyId & 0xFFFFFFFF, bodyId >> 32)`; the outputs are `w0 = X[0]`, `w1 = X[1]`. Step `t` uses 16-bit lane `t mod 4`: `w0 & 0xFFFF`, `w0 >>> 16`, `w1 & 0xFFFF`, `w1 >>> 16`, with `>>>` a logical shift. Thresholds are integers, `thr16 = floor(rateHz * dtMs * 65.536)`, stored in the codec. No float takes part in deciding a spike. Known answers for the core, which slice 02 confirms against Random123's `kat_vectors` before relying on them: key `0,0` counter `0,0` → `6b200159 99ba4efe`; all ones → `1cb996fc bb002be7`; key `13198a2e 03707344` counter `243f6a88 85a308d3` → `c4923a9c 483df7a0`.

**Activation** of a cell type, the player's red light, is the same mechanism as sensory drive. An activated neuron therefore fires at the drive rate whatever its own inputs say, exactly as in the published activation experiments. A sufficiency test asks what the circuit downstream of the activated type does. It never asks whether the activated type "responded".

**Variants.** `contracts/model/variants.json` registers named override sets, for example `gluExcitatory: {"signPolicy.glutamate": 1}`. A `TrialSpec` names the base `modelId` and one `variant`, `base` by default. The browser computes only `base`; other variants reach it as recordings.

**Versions.** The shipped model is one point: the JSON above. An experiment may sweep overrides of it, declared in its prereg, and those overrides exist only inside that experiment's runs. Changing what ships (`dt`, the synapse threshold, a sign, `wSyn`, `snapEps`) makes a new model or artifact version and re-runs every experiment that depends on it. It is never a browser-only tweak.

`stateHash` at step `t`: SHA-256 over `t` as u32, then for each neuron ascending `v` as f64, `g` as f64, `refr` as i32.

## Trials

Play and experiments share one unit: a trial. The engine computes it in full, then the interface replays it in slow motion. A taste decision is over in tens of milliseconds, so slow replay is where it can be seen.

```
TrialSpec      { modelId, variant, graphSha256, codecSha256, seed, durationSteps,
                 drives:    [{group, side: both|left|right, thr16, onStep, offStep}],
                 silenced:  [typeOrGroup],
                 activated: [{typeOrGroup, thr16, onStep, offStep}] }
TrialRecording { spec, specSha256, spikeStep[], spikeBodyId[] (decimal strings), spikeHash, sentinelBreaches: [step], engine: {name, version} }
```

- A `TrialSpec` contains only strings and integers, by design. `specSha256` is the hash of its canonical JSON: UTF-8, keys sorted, no insignificant whitespace.
- `spikeHash` is the hash of the concatenation, over spikes of non-sentinel neurons sorted by step and then by body ID, of `step` as u32 and `bodyId` as u64. Two runs are the same run iff their hashes match. When a whole-brain run is compared with a subgraph run, the whole-brain hash is taken over the subgraph's member body IDs, and any whole-brain spike outside that set is itself a breach.
- On disk a recording is one JSON file with body IDs, not indices, so it means the same thing against the whole brain and against a subgraph. In memory engines use typed arrays of indices.
- The knit swatch, the journal and the atlas all consume `TrialRecording`. Nothing may invent a second recording format.

## Codec

`contracts/codec/taste.codec.json` holds every number that turns the player's hands into spikes and spikes into behaviour.

```json
{ "id": "taste/1",
  "channels": [
    { "id": "sweet",  "group": "grn.sweet",  "tag": "model",
      "levels": [ {"label":"none","hz":0,"thr16":0}, {"label":"1 piece","hz":25,"thr16":163}, {"label":"2 pieces","hz":50,"thr16":327},
                  {"label":"3 pieces","hz":100,"thr16":655}, {"label":"4 pieces","hz":200,"thr16":1310} ] },
    { "id": "bitter", "group": "grn.bitter", "tag": "model", "levels": "same five rates, labelled in scoops" } ],
  "decoders": [ { "id": "proboscis", "group": "mn9", "stat": "spikes_sum", "window": [2000, 10000],
                  "extendAtLeast": null, "refuseAtMost": null, "evidence": null, "tag": "model" } ],
  "envelope": { "sides": ["both","left","right"], "opsOnOneSidedSips": false, "lesionable": [], "activatable": [],
                "maxConcurrentOps": 1, "seeds": [], "variants": ["base"] } }
```

- **Levels are the same five everywhere:** 0, 25, 50, 100 and 200 Hz, as levels 0 to 4. Slice 05 measures the whole five-by-five grid, the bench offers exactly those sips, and slice 07 enumerates exactly those trials. Discrete doses fit the theme and make the envelope enumerable.
- **The decoder** reads the summed spike count of both MN9 neurons in steps 2000 to 9999 of a 10000-step trial, skipping the onset. At or above `extendAtLeast` it returns `extend`; at or below `refuseAtMost`, `refuse`; between them, `hesitate`. "MN9 rate" anywhere in this spec means that count divided by two neurons and 0.8 s. Never membrane voltage: fly-escape found voltage "tonically above the provisional gate even without taste". Slice 05 sets the two thresholds by a rule written before the run and checks them on held-out seeds.
- **The envelope** is what the browser may compute live. One operation at a time, and none on one-sided sips. Anything else runs as `exploratory` or is answered from recordings.

Both interpreters are lookups. Hz exists only for display.

## Experiments

```json
{ "id": "E01-taste-law", "question": "…", "graph": "full", "circuit": "taste", "modelId": "lif-shiu-v1",
  "sweep":      [ {"param": "wSynMv", "values": [0.19, 0.275, 0.36]}, {"param": "signPolicy.unknown", "values": [0, 1]} ],
  "conditions": [ {"id": "s3b0", "drives": [{"channel": "sweet", "level": 3, "side": "both"}], "ops": []} ],
  "controls":   [ {"id": "shuffle", "kind": "shuffle", "n": 100}, {"id": "randpop", "kind": "random_population", "like": "grn.sweet", "n": 10} ],
  "seeds":      { "pilot": [0,1,2], "confirm": [100,101,102,103,104,105,106,107,108,109], "holdout": [110,111,112,113,114,115,116,117,118,119] },
  "durationSteps": 10000,
  "measures":   [ {"id": "mn9", "group": "mn9", "stat": "spikes_sum", "window": [2000, 10000]} ],
  "criteria":   [ {"id": "P1", "kind": "threshold", "measure": "mn9", "condition": "s3b0", "op": ">=", "value": 32, "overSeeds": {"atLeast": 9, "of": 10}} ],
  "plateau":    { "param": "wSynMv", "minAdjacent": 2, "mustHoldForAll": ["signPolicy.unknown"] } }
```

Criteria come from a fixed list of kinds, not a free expression language: `threshold`, `ratio_vs_control`, `paired_drop` (same seed, two conditions), `monotone` (across an ordered list of conditions, with a tolerance), `control_fraction` (at most n of N control runs reach a fraction of the real value), `fraction_active`, `decoder_accuracy`. Each carries `overSeeds`. A new kind is added to the harness with a test, never inlined in one experiment.

Rules the runner enforces:

- The prereg must be committed. Before the first confirmation seed runs, the runner writes `consumed.json` beside it: the prereg's hash and the seeds it is about to consume. If `consumed.json` exists and the prereg's hash differs, the runner refuses. Deleting the ledger shows in git history.
- Pilot seeds may be run freely and never count. Confirmation seeds are consumed once. Held-out seeds are touched only by criteria of kind `decoder_accuracy` and by the rival-rule evaluation.
- A rerun after a fallback is a new experiment with a new id (`E01b`) and fresh seeds (200–219). At most two reruns. The report of the last attempt lists every attempt, passed or failed.
- The plateau rule is applied along one swept parameter. Every other swept parameter must pass at all of its values.
- Controls are pure functions. `shuffle(graph, seed)` keeps every neuron's out-degree and its multiset of synapse counts and randomises who receives them. `random_population(graph, like, seed)` draws a size-matched set from the same superclass.

```
verdict.json { id, question, attempts: [ids], prereg{sha256,gitRev}, inputs{graphSha256,lockSha256,modelId,codecSha256|null,sweep,seeds},
               criteria: [{id, kind, observed, pass}], plateau{param, values, passing},
               verdict: pass|fail|inconclusive, gates: [mechanicId], notes }
```

No timestamps: a rerun of a finished experiment reproduces `verdict.json` byte for byte.

A criterion that passes at a single parameter value is rejected. FlyBrain measured a 25.6× effect "on the slope of the cliff".

`contracts/mechanics.json` is `[{id, requires: experimentId, enabled}]`. `make check` fails if a mechanic is enabled without a `pass`. A failed experiment keeps its report and becomes a page in the journal's "Didn't work" chapter.

## Fixtures

JSON, written only by the oracle. Every float64 appears as its 16-hex-digit IEEE-754 bit pattern, for example `"0x3fefd70a3d70a3d7"`, so no parser can round it. Integers are JSON numbers. Body IDs are decimal strings.

```
{ fixture, modelId, variant, graph: {bodyId[], nt[], flags[], outOffset[], target[], synCount[]},
  spec: TrialSpec, trace: [{t, v[], g[], refr[], spikes[]}], spikeHash, stateHashAt: {"<t>": hash} }
```

`trace` holds the state after step `t` completes. A fixture passes when every listed value matches exactly.

## Honesty

Two tags, on two separate axes, carried as data.

- `provenance`: `connectome` (wiring, counts, transmitter labels), `model` (our equations, doses, decoders), `staged` (puppetry, sequence, anything authored).
- `source`, for anything derived from spikes: `live` or `recorded`, with the seed.

`QuantityDef {id, label, unit, provenance, derivedFrom[], explain, evidence?}`. A derived quantity may not claim better than the worst of its inputs, in the order connectome < model < staged. `<Q id>` is the only way to put a number on screen, including counts such as how many neurons a run covered, which come from the manifest and are never typed into copy. A DOM test fails on any `[data-q]` without `data-prov`. `Math.random` is banned in `src/engine`, `src/scope` and `src/swatch`. Glow is a pure function of spike counts: zero spikes, zero glow. Only the puppet eases; meters show counts in a stated window.
