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
             src/view/     the 3D scene: fly, table, brain cloud, the endless loop; light() is pure
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
| Trial spec and recording | `contracts/TRIAL.md` + the fixtures under `contracts/fixtures/trial/` |
| Python oracle | `lab/flylab/model/oracle.py`. Only the oracle writes fixtures |
| Browser engine | `web/src/engine/`. Reads fixtures, never writes them |
| Dose → spikes, spikes → behaviour, envelope | The file `contracts/codec/taste.codec.json`, written only by `lab/flylab/codec/build.py`. Slices 05, 07 and B2 each add to it through that one writer. One small interpreter per language, both pinned by fixtures |
| Experiments and verdicts | `lab/experiments/<id>/`. `verdict.json` is the artifact; HTML is a rendering of it |
| Which mechanics may ship | `contracts/mechanics.json`, checked by `make check`. One chain, one gate: a puzzle or a route requires mechanics, a mechanic requires an experiment's `pass` |
| The `web/` package scaffold | Slice V1, step 1. Specified in one place |
| The brain cloud | `lab/flylab/web/cloud.py` writes `data/built/web/brain.cloud`; `web/src/view/cloud.ts` reads it. Format in slice V1 |
| The ceremony: its phases, how long each lasts, pause, stills | `web/src/view/loop.ts` |
| Where every prop is at a moment, and what a break may move | `web/src/view/puppet.ts`. The proboscis is held at zero there until a recording carries an outcome |
| The browser's neuron model | `web/src/engine/`, begun in V1 with `prng.ts` and `input.ts`, continued by slice 08. Held to `contracts/fixtures/` |
| The live trial of a bowl: which neurons the tea drives, with which seed, how far it has run, and whether his lips are on the tea | `web/src/view/live.ts`. The page holds the ceremony's clock until the stage reports him back at his work, so this has no second owner |
| The motor pools of his legs | `circuits/legs.circuit.json` and its lock: facts only. What each muscle does is in slice V3, from papers |
| What turns spikes into light | `web/src/view/light.ts`, and nothing else. `scene.ts` only adds what it returns |
| The words on the page | `web/src/view/hud.ts` and `reaction.ts` build markup from data; every number through `Registry.q()`, every citation through `ref()`; `audit()` refuses the rest |
| Honesty tags | `contracts/schemas/provenance.json` + `web/src/honesty/` |

There are two implementations of the model, the oracle and the engine, and never a third. No backend abstraction is built for a future Rust engine. If one is ever needed it is a hard cutover that passes the same fixtures and deletes the TypeScript engine.

## Graph artifact: `.fskg` version 1

Moved to the repository when slice 03 was accepted: **`contracts/GRAPH.md`** is the authority for the layout, for what a reader must refuse, for the manifest and for how the full graph is built. Golden file: `contracts/fixtures/graph/tiny.fskg`. Owners: `lab/flylab/graph/format.py` for the bytes, `lab/flylab/graph/build.py` for what goes in.

## Circuit file and lock

A circuit file lists roles. Each role selects neurons by type name, type pattern, annotation columns or explicit body IDs, states what it expects to find, and carries its evidence: a claim, a source, and a kind (`annotation`, `paper`, `crosswalk` through the dataset's own synonym columns, or `connectivity`). The file also holds literature aliases to look up, anchor counts seen elsewhere, and notes for the report. `validate_circuit` in `lab/flylab/census/census.py` is the authority on its shape. Only roles bound on `annotation` or `paper` evidence may gate a slice. Every expected count states its basis: `paper`, `anchor` (seen elsewhere before the file was downloaded) or `observed` (pinned from this file to catch drift, and not evidence). An unknown key anywhere in a role is an error, so a typo can neither widen a binding nor switch off a check.

```
{ version: 2, circuit, annotationsSha256, transmittersSha256, graphSha256 | null,
  groups: [{ id, bodyIds: [decimal strings, ascending], sides: "LRU…" one letter per body, perSide: {L, R, unknown}, ntHistogram,
             evidenceKind: annotation|paper|crosswalk|connectivity, byType?: [{ type, synapses }] }],
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
- `sides` is what lets a trial drive one side of a group: `resolve(lock, graph)` in `lab/flylab/census/connectivity.py` turns a lock into `{groupId: {indices, sides}}` as `contracts/TRIAL.md` defines it, and refuses a body the graph does not hold and a lock bound against another graph.
- Groups with `evidenceKind: connectivity` are written by `bind_connectivity` and by nothing else, from counts of synapses in the graph named by `graphSha256`: `hub.mn9.in`, the 20 types with most synapses onto MN9, and `hub.grn.out.<population>`, the 10 types that receive most from each bound `grn.*` group. A hub holds every neuron of its types, and `byType` keeps the counts it was ranked by. A taste type may be in its own population's hub: taste neurons synapse onto each other.
- The annotation part of a lock reproduces from the stage A files alone. The connectivity part needs the full graph as well, so a checkout without it can verify the first and must trust the second.

## Neuron model

Materialised by slice 02. The authority is `contracts/MODEL.md` in the repository, with its numbers in `contracts/model/lif-shiu-v1.json` and `contracts/model/variants.json`.

## Trials, recordings and fixtures

Materialised by slice 02. The authority is `contracts/TRIAL.md`: groups, the trial spec and its refusal codes, recordings, hashes and the fixture format.

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

## Honesty

Two tags, on two separate axes, carried as data.

- `provenance`: `connectome` (wiring, counts, transmitter labels), `model` (our equations, doses, decoders), `staged` (puppetry, sequence, anything authored).
- `source`, for anything derived from spikes: `live` or `recorded`, with the seed.

`QuantityDef {id, label, unit, provenance, derivedFrom[], explain, evidence?}`. A derived quantity may not claim better than the worst of its inputs, in the order connectome < model < staged. `<Q id>` is the only way to put a number on screen, including counts such as how many neurons a run covered, which come from the manifest and are never typed into copy. A DOM test fails on any `[data-q]` without `data-prov`. `Math.random` is banned in `src/engine`, `src/scope` and `src/swatch`. Glow is a pure function of spike counts: zero spikes, zero glow. Only the puppet eases; meters show counts in a stated window.
