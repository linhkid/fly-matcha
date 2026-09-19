> Independent planning draft, bias C: seam quality. Written 2026-09-18 by a subagent that saw only `brief.md`. Historical input to `synthesis.md`; not implementation instructions. Start at `../../README.md`.

# Draft C: Matcha Fly, sliced for seam quality

A1–A11 are planner assumptions awaiting user confirmation, never user quotes. Paths: `FE` = `/Users/linhkid/Documents/Fun/fly-escape`, `FB` = `/Users/linhkid/Documents/Fun/FlyBrain`.

## 1. Concept

You host a tea ceremony for one simulated male fly. "Sweet" (wagashi) and "bitter" (matcha, i.e. caffeine) dials drive Poisson spikes into real MaleCNS gustatory neurons. A Shiu-style LIF on the real wiring decides whether MN9 fires and the proboscis extends.

The play is *predict, then break*: silence a cell type or flip glutamate's sign, and see whether your prediction held. A Python lab runs the identical model on the full graph. It is the only place a mechanic can earn the right to ship.

The human learns:
- how sweet and bitter become proboscis extension through GNG hubs;
- why inhibitory sign matters;
- what a connectome does not contain (weights, signs, time constants, state);
- how to tell a result from a cliff-edge artefact (plateau, seeds, controls).

## 2. Layout and single owners

```
contracts/   schemas/ · MODEL.md · model/lif-shiu-v1.json · fixtures/{prng,lif,graph,codec,session}
circuits/    *.circuit.json (+ .lock.json, census.html)        codecs/  *.codec.json
lab/fsk/     data/ graph/ model/ codec/ experiments/ report/    lab/experiments/E0N-*/
packages/    graph-format/ engine/ codec/ engine-client/ honesty/ widgets/
apps/web/    /lab/taste /lab/engine /lab/groom /tea-room /about
data/        raw/, built/full/ (ignored) · built/web/ (small, committed)      specs/matcha-fly/
```

| Concept | Sole owner |
|---|---|
| Raw data + provenance | `lab/fsk/data/fetch.py` → `data/raw/sources.json` |
| Graph artifact format | `contracts/schemas/graph.md`; sole writer `lab/fsk/graph/format.py` |
| Circuit/group definitions, census | `circuits/*.circuit.json` + `lab/fsk/data/census.py` → lock |
| Neuron model | `contracts/MODEL.md` + `lif-shiu-v1.json` |
| Python oracle | `lab/fsk/model/lif.py` |
| Browser engine | `packages/engine` |
| Stimulus encoding + motor decoding | `codecs/*.codec.json` (data), two fixture-pinned interpreters |
| Experiment reports | `lab/fsk/report` (`fsk.report/1`) |
| UI honesty tags | `contracts/schemas/provenance.json` + `packages/honesty` |

## 3. Slice graph

Two tracks run in parallel and join at S06: data (S01→S02→S03) and model (S04→S10). S12 is independent.

**Conventions.**
- Every slice keeps `make check` green: pytest, vitest, schema validation, fixtures regenerate byte-identically, mechanic-gate test. *Green* lists only additions.
- Only the Python oracle writes fixtures; TypeScript reads them.
- Defaults when a field is omitted: *Delegated* = internal structure and naming; *Feedback* = none expected.
- Visual slices end with screenshot-critique. Human checkpoints are non-blocking (preview-shots).
- Unlisted decisions go to `choices.md` (Gap/Reach/Provisional/Reversal/Confidence, as in `FE/specs/done/help-the-fly-escape/choices.md`).

### S00 · Contracts skeleton
- *Q:* can both languages validate one schema set?
- *Seam:* `contracts/schemas/*.json`; `Provenance = connectome | model | scripted`; `make check`.
- *See:* a green `make check`; `specs/matcha-fly/` with a Next Agent Prompt.
- *Verify:* one invalid document per schema is rejected in both languages.
- *Delegated:* tooling: venv plus pinned pip (as `FE/scripts/requirements.txt`), npm workspaces, vitest.
- Measured here: system python3 lacks numpy. `uv`, `bun`, `wasm-pack` and the `wasm32-unknown-unknown` target are absent.

### S01 · Provenance fetch (needs S00)
- *Q:* can sources be pinned reproducibly?
- *Seam:* `fetch(stage) → SourceRecord[{file,url,bytes,md5,sha256,generation}]` → `sources.json`. Downloads are streamed and checked against `x-goog-hash`, as in `FE/scripts/connectome/download.py`.
- Two consent stops (A11), each printing names, source and sizes:
  - **A** = annotations 14.5 MB + neurotransmitters 43 MB.
  - **B** = traced-only weights, ~500 MB (as `FB/fly/paso0.py`).
- *See:* `fsk data fetch --stage A`.
- *Verify:* a re-run is a no-op; a flipped byte is refused.
- *Feedback:* traced-only vs the full 1.05 GB file.

### S02 · Census + circuit file (needs S01 stage A)
- *Q:* do the names we plan around exist in MaleCNS?
- *Seam:* `circuits/taste.circuit.json`, one entry per group:
```json
{"id":"mn9","role":"readout","select":{"type":["MN9"],"side":"any","bodyIds":null},
 "expect":{"count":2,"perSide":1,"nt":"acetylcholine"},"required":true,
 "evidence":{"claim":"rostrum protractor","source":"<paper/table>","confidence":"literature"},"explain":"…"}
```
- `census(circuit, annotations, nt) → Lock | Failure[]`.
  - Lock = `{annotationsSha256, groups:[{id, bodyIds[], perSide, ntHistogram}]}`, with bodyIds as decimal strings.
  - Failures are data: `{group, code: TYPE_NOT_FOUND|COUNT_OUT_OF_RANGE|NT_MISMATCH|SIDE_IMBALANCE|BODYID_ABSENT, found, nearest[]}`.
  - Any `required` failure means a non-zero exit and **no lock written**.
  - `nearest` catches the DNg12 → DNg12_a class of miss.
- Explicit bodyId lists need a per-list `evidence.source`. `FE/scripts/connectome/pathways.json` has one prose string for 18 lists.
- Type names come only from annotations. The weights file's `type_pre/type_post` columns are ignored, because they would be a second owner.
- Index resolution is one function per language, `resolve(lock, graph)`, which fails loudly on absent bodies.
- *See:* `census.html` with a literature-alias table (Usnea, Rattle, Phantom, G2N-1 → MaleCNS type or null).
- *Verify:* synthetic annotations per failure code; the lock is byte-stable.
- *Delegated:* the nearest-name metric.
- *Feedback:* which source to trust for the LB-subtype → modality mapping.

### S03 · Graph artifact (needs S00; the full build needs S01 stage B)
- *Q:* can lab and browser share one format?
- *Seam:* `.fskg` v1, little-endian, sections 8-byte aligned:
```
0 char[8] "FSKGRAPH" | 8 u32 version | 12 u32 N | 16 u32 E | 20 u32 minSynapses
24 u64 bodyId[N] ascending (index = rank) | u8 nt[N] (0 unknown,1 ACh,2 GABA,3 Glu,4 His,5 DA,6 OA,7 5HT)
u8 flags[N] (bit0 sentinel) | u32 outOffset[N+1] (rows = PRESYNAPTIC) | u32 target[E] ascending | u16 synCount[E]
```
- The file holds no floats and no signs. It is purely *from the connectome*. Sign policy and weight scale belong to the model.
- Manifest `fsk.graph-manifest/1`: `{kind: full|subgraph, dataset{name,version,license,attribution}, sources[], graph{file,sha256,N,E,minSynapses}, filters, counts{ntHistogram,unknownNt,droppedUntyped}, parent?{graphSha256}, extraction?{lockSha256,codecSha256,modelId,rule,seeds,heldOutBreachRate,sentinels}, exporter{gitRev,sourceSha256}, synthetic:false}`.
- The manifest carries **no groups**. fly-escape's 625 KB manifest couples `FE/crates/sim/src/graph.rs` to game group names and a 16-group cap.
- Readers: `read_graph` (np.frombuffer) and `readGraph` (zero-copy views, SHA-256 verified in the Worker).
- *See:* `fsk graph info` prints N, E, the NT histogram and the top inputs to MN9. GNG015 and GNG095 must appear.
- *Verify:*
  - a golden `tiny.fskg` is read identically by both readers;
  - truncation, misalignment and unsorted rows are rejected;
  - it asserts `bodyId < 2^32` and `synCount ≤ 65535`.
- *Delegated:* build memory strategy.
- *Feedback:* the synapse threshold of 5.

### S04 · Model contract, PRNG, oracle (needs S00; parallel to S01–S03)
- *Q:* can two languages disagree about the model?
- *Seam:* `contracts/MODEL.md` plus `lif-shiu-v1.json`: `{dtMs:0.1, delaySteps:18, refracSteps:22, vTh:7.0 (mV above rest), A, B, C, wSynMv:0.275, poissonScale, signPolicy{ACh:1,GABA:-1,Glu:-1,His:-1,DA:0,OA:0,5HT:0,unknown:0}, prng:"threefry2x32-20"}`.
- State is f64. A = e^(−dt/τm), B = e^(−dt/τs) and C = (A−B)·τs/(τm−τs) are frozen as 17-digit decimal strings. Engines never call `exp`, because libm transcendentals diverge across platforms (`FB/CLAUDE.md`).
- Step *t*, normative:
  1. Deliver `spikes[t−18]`: `acc[target] += sign[nt[src]]·synCount` in **int32**. Integer sums are order-free, so no summation-order contract is needed. `FE/crates/sim/src/lif.rs` needed one.
  2. Per neuron, ascending:
     - A lesioned neuron sets v = g = 0 and is skipped.
     - `g += wSyn·acc; acc = 0`.
     - `forced = threefry(key=seed, ctr=(bodyId,t)).w0 < pU32[i]`.
     - If refractory and not forced: decrement and skip. v and g stay frozen and arrivals are kept.
     - Otherwise `v = v·A + g·C` (using the old g), then `g = g·B`.
     - Spike iff forced or `v > vTh` (strict). A spike sets v = g = 0 and refractory = 22 (0 while driven).
  3. Emit spikes in ascending order.
- This follows Shiu's `model.py`. I fetched and checked it: `method='linear'`, reset clears g, driven neurons get `rfc=0`, Poisson weight is 250×w. Deviations are listed in MODEL.md.
- The PRNG is counter-based and **keyed by bodyId**. Poisson trains are therefore identical in any index space and under any lesion. There is no "silenced neurons still consume samples" hack (`lif.rs:170`).
- `Sim(graph, model, seed).step(pU32, lesioned) → spikes`.
- No FMA, ever. The oracle uses plain NumPy ufuncs, with no numba or numexpr.
- *See:* `fsk model demo`.
- *Verify:*
  - Random123 known-answer vectors for the PRNG.
  - Oracle-captured fixtures (pattern: `FE/scripts/reference/generate_lif.py`) for strict threshold, refractory freeze, delay, g reset, forced spike, lesion, and zero-preservation (active-set ≡ full update).
  - **Exact equality, no tolerance.**
- *Delegated:* vectorisation.
- *Feedback:* the unknown-NT sign. It is 0 here; `FE/scripts/connectome/extract.py` used +1.

### S05 · Codec as data (needs S02)
- *Q:* can dose→spikes and spikes→behaviour have one owner across two languages?
- *Seam:* `codecs/taste.codec.json`:
```json
{"channels":[{"id":"sweet","group":"grn.sugar","knots":[[0,0],[1000,200]],"tag":"model"}],
 "decoders":[{"id":"proboscis","group":"mn9","windowSteps":1000,"onSpikes":null,"offSpikes":null,"evidence":null,"tag":"model"}],
 "modulators":[],"envelope":{"lesionable":["hub.*"],"maxConcurrentLesions":1,"variants":["base","gluExcitatory"]}}
```
- `encode(channel, dose 0..1000) → pU32` and `decode(decoder, windowSpikeCount, prev) → state`. Integers go in and integers come out. Hz exists only for display. Each interpreter is ≤60 lines.
- It lives in exactly one place because:
  1. lab verdicts are about this exact map;
  2. the subgraph envelope derives from it;
  3. honesty tags attach to it;
  4. in the browser it runs inside the Worker, so UI code never sees rates or thresholds.
- Internal-state knobs (A4) are `modulators` tagged `scripted`. Contrast fly-escape's hand-made `feeding_gain`.
- *See:* `fsk codec table`.
- *Verify:* an exhaustive fixture covering 1001 doses × channels and every window count.
- *Delegated:* provisional knot values.
- *Feedback:* dial semantics.

### S06 · Experiment harness + report (needs S03–S05)
- *Q:* can an experiment fail honestly?
- *Seam:* `run(prereg) → Report`.
  - `prereg.json` holds conditions, seeds, controls, criteria and the plateau rule.
  - The runner refuses an uncommitted or post-hoc-edited prereg. The blob hash is recorded.
  - Controls are pure functions (`shuffle(graph, seed)`, size-matched `random_population`), never artifacts on disk.
- `fsk.report/1`: `{id, question, prereg{sha256,gitRev}, inputs{graphSha256,lockSha256,modelId,codecSha256,seeds}, conditions[], measures[{id,unit,tag}], results[], criteria[{id,expr,plateau{param,values,minPassing},verdict}], verdict, gates[]}`. HTML is only a rendering of it.
- `apps/web/mechanics.json` maps each mechanic to a report. Enabling a mechanic whose verdict is not `pass` fails `make check`.
- *See:* `fsk exp run E00-synthetic`.
- *Verify:*
  - a synthetic graph with a known answer yields one pass and one fail;
  - single-point passes are rejected. `FB/fly/README.md` records a 25.6× result measured on the slope of the cliff.
- *Feedback:* how strict the criteria should be.

### S07 · E01 sugar→MN9, full brain (needs S02, S06, S01 stage B)
- *Q:* does feeding initiation reproduce under our discretisation?
- Pre-written criteria:
  - MN9 rate is ≥10× both a size-matched random sensory population and a shuffled graph;
  - this holds at ≥2 adjacent wSyn values and ≥5 seeds;
  - the dose-response is monotone.
- The report also records the ever-spiked set (input to S09).
- It also records a two-line-rule baseline (FlyBrain's "`if looming > threshold`" caveat). That is reported but does not gate anything.
- *See:* `report.html`.
- *Delegated:* nothing scientific.
- *Feedback:* criteria, and only before the run.

### S08 · E02 bitter, sign flip, lesions (needs S07)
- *Q:* three questions:
  - does bitter suppress MN9?
  - does that suppression vanish with Glu = +1?
  - do single-hub lesions give *distinguishable* outcomes?
- The third question decides whether lesion play is real or decorative.
- This slice writes the decoder thresholds, each with an `evidence` pointer.
- It gates `bitter-reject`, `glu-flip` and `lesion-play`.
- *See/Verify:* as S07.

### S09 · Envelope + subgraph (needs S08)
- *Q:* how small a graph reproduces the full brain over what the toy offers?
- *Seam:* `extract(full, lock, codec.envelope, model, seeds) → .fskg + manifest`.
  - Members = every neuron that spiked, or reached vmax ≥ 0.5θ, over envelope corners × declared lesions × variants × seeds.
  - Edges = every full-graph edge among members, plus member→sentinel.
  - **Sentinels** = one-hop targets with vmax ≥ 0.25θ, simulated without out-edges.
  - `spikeHash = sha256(sorted (step, bodyId))` over members.
- *Verify:*
  - H_full = H_sub on every extraction tuple;
  - held-out seeds and interior doses report a breach rate against a pre-written bound of ≤1%.
- Contrast: fly-escape's 70k cut (`extract.py`: seeds plus one-hop, seed-touching edges only) was structural and never checked against a full run.
- *See:* the extraction report.
- *Green:* E01/E02 verdicts unchanged.
- *Delegated:* margins within the bound.
- *Feedback:* the lesion list.

### S10 · TS engine (needs S03, S04)
- *Q:* is the browser engine the same model?
- *Seam:* `packages/engine`, pure, with no DOM or Worker, and the same `Sim` signature.
- *Verify:*
  - S04 fixtures are bit-exact in Node and in a headless browser;
  - after S09, H_ts = H_sub on 20 sessions;
  - a perf probe runs against a budget of ≥1× real time on the M5.
- *See:* `npm run probe:engine`.
- *Delegated:* active-set optimisation, memory layout.

### S11 · Engine client (needs S05, S10)
- *Q:* can the UI drive the engine without owning any of it?
- *Seam:*
```ts
Command = load{urls} | reset{seed, variant} | setDose{channel,dose} | setLesion{group,on} | grant{frames}
Event   = ready{hashes, groups[], channels[], quantities[]}
        | frame{seq, stepStart, stepCount, applied[{step,cmd}], groupCounts:Uint32Array, spikes?:Uint32Array, truncated, decoded{}, breaches}
        | breach{step} | error{code}          // all generation-tagged
```
- Commands apply only at frame boundaries and are echoed with their step. `SessionRecord{hashes, seed, commands[], spikeHash}` therefore replays anywhere.
- Back-pressure follows `FE/packages/sim-client/src/attempt-worker.ts`: credits with ≤2 frames outstanding, transferred buffers, MessageChannel yield.
- `Pacer(wallClock, simClock) → credits` owns speed. A slow engine shows "0.6×". It never skips steps or changes dt.
- *See:* `/lab/engine`.
- *Verify:* fake-clock Pacer tests; a browser export run through `fsk replay` gives an identical hash.
- *Delegated:* frame size.

### S12 · Honesty registry (needs S00)
- *Q:* can a number reach the screen untagged?
- *Seam:* `QuantityDef{id,label,unit,provenance,derivedFrom[],explain,evidence?}`. The registry is assembled from the lock (connectome), the model and codec (model), and scene files (scripted).
- `join = max` under the order connectome < model < scripted. A quantity may not claim less than the join of its inputs.
- `<Q id>` is the only way to print a number. `/about` renders attribution from the manifest.
- *Verify:* a registry closure test; a DOM test that every `[data-q]` carries `data-prov`.
- *See:* the honesty overlay toggle.

### S13 · Taste bench `/lab/taste` (needs S09, S11, S12 and the gates)
- *Q:* is A7's first playable checkpoint playable?
- This is A7's checkpoint. It is permanent, not scaffolding. `FE/specs/done/help-the-fly-escape/CONTRACTS.md` says lab routes expose the same owners as the product.
- *Seam:* widgets consume engine-client events only.
- Sub-slices judge one visual variable each: cascade legibility, meter, lesion affordance.
- *See:* `/lab/taste`.
- *Verify:* a Playwright flow: sweet up → proboscis extends; bitter up → it retracts; a lesion changes the outcome as E02 predicts.
- *Green:* the replay-hash test.
- *Feedback:* what confuses the user.

### S14 · Tea room (needs S13)
- *Q:* can the ceremony be built without adding any simulation concept?
- *Seam:* it adds **zero** simulation concepts. A scene file (tagged scripted) sequences wagashi → matcha. Outcomes come from `decoded`.
- *See:* `/tea-room`.
- *Verify:* deleting `apps/web/tea-room` leaves `/lab/taste` untouched.
- *Feedback:* tone and art.

### S15 · E03 dust→grooming decision (needs S06)
- *Q:* does matcha dust select a grooming command neuron?
- First run a `groom.circuit.json` census. It covers DNg11, DNg12_* and JO/bristle inputs. aDN1 and aBN1 are known 404s.
- Then test selectivity against a random control.
- It gates `dust-groom`. The animation is scripted either way (DesktopFly precedent).
- *See:* the report and `/lab/groom`.

### S16 · E04 whisk rhythm (needs S15)
- *Q:* does DNg11/DNg12 drive through 13A/13B produce a 5–12 Hz alternating T1 rhythm in LIF?
- Time-boxed and Python-only.
- *Verify:* the kill criteria in section 4.
- *See:* a report, pass or fail.

### S17 · Brain swatch (needs S11)
- *Q:* can a session's spike raster become a knit chart without a second recording format?
- *Seam:* a knit chart rendered from `SessionRecord`. No new recording format.
- *See:* a PNG of your own session.
- *Verify:* the same record gives the same pixels.

Unsliced until reached: tarsal sweet → stop, KC→MBON aroma learning, male foreleg pheromone, soma point cloud.

## 4. Risks and fog

- **Names (S02).** The LB modality mapping and hub aliases are unverified. Fallback: functional rediscovery inside E01, labelled *model*, not *connectome*.
- **Reproduction (S07).** Low risk: flyverse-core reports 139.9 → 0.8 Hz on MaleCNS. Kill: no plateau. Then stop and audit the MODEL.md deviations. Nothing downstream starts.
- **Lesion play is decorative (S08).** If hubs are indistinguishable, the toy keeps the dials and the glu-flip, and says so.
- **Envelope leak (S09).** Lesioning inhibitory hubs recruits never-seen neurons. Fallbacks, in order:
  1. widen the margin;
  2. shrink the lesion list;
  3. replay lab-made SessionRecords, which is free because the format is the same.
- **Performance (S10).** The engine runs 10,000 steps per simulated second. Fallbacks:
  1. active set;
  2. record-then-play;
  3. Rust, only as a hard cutover that passes the same fixtures and deletes the TS engine. This needs `rustup target add`, which needs the user's consent.
- **Bit identity (S04/S10).** A mismatch is a bug to find, never a tolerance to loosen.
- **Grooming names (S15).** Kill means dust triggers scripted grooming, tagged scripted.
- **Whisk rhythm (S16).**
  - `FB/fly/README.md` measured that LIF ×3 gain self-ignites and ×10 convulses.
  - Their rate-based VNC oscillates too easily (21% of DN types vs 3.4% in the paper).
  - Kill: two sessions without a 5–12 Hz alternating plateau over ≥2 parameter values and ≥3 seeds.
  - The fallback already ships in S15. There is no second browser engine in v1.
- **Learning.** Expected to be weak. FlyBrain's no-plasticity control behaves the same. It stays a lab curiosity.

## Where I disagree with the brief

1. **A8, "exactly equivalent" subgraph.** Exactness holds only for sampled (stimulus, lesion, seed) tuples, and lesions break it through disinhibition.
   - It needs a lesion-closed and variant-closed envelope, sentinels and a breach event.
   - It is only testable if Poisson draws are keyed by bodyId rather than by stream position.
2. **A8, "narrow interface for a Rust swap".** Build no backend abstraction. The seam is the fixtures plus the Worker protocol. There should never be more than two implementations of the model.
3. **Inheriting fly-escape's signed f64 weights.**
   - They fuse connectome counts, predicted transmitter and model scale into one number.
   - That breaks the honesty split at the data level and forces summation-order contracts.
   - Store integer counts and NT codes. Sign and scale live in the model. The glutamate flip then becomes a parameter, not a new artifact.
4. **A5(iii) vs A2/A3.** "One neuron model" contradicts the expected rate model for whisking. Keep any rate model lab-only.
5. **A6, HTML/PNG reports.** JSON is the artifact, because mechanic gating must read verdicts.
6. **A11, download consent.** Split it. The 58 MB census is the step most likely to reshape the plan, so it should come before the ~500 MB download.
7. **A7, bench then tea room.** This invites scaffolding. The bench is permanent and the tea room adds no simulation concept.
8. **Knit swatch.** It must consume `SessionRecord`, or it becomes a parallel recording format.
9. **dt, threshold 5 and unknown-NT sign.** These are model or artifact *versions*. Changing one re-runs E01/E02. It is never a browser-only tweak.
10. **A1, ten minutes of non-scripted play.** From a two-dial reflex this is credible only as predict-then-lesion. A1 should say so.

### Critical Files for Implementation
- /Users/linhkid/Documents/Fun/fly-escape/scripts/connectome/artifact.py
- /Users/linhkid/Documents/Fun/fly-escape/scripts/reference/generate_lif.py
- /Users/linhkid/Documents/Fun/fly-escape/crates/sim/src/lif.rs
- /Users/linhkid/Documents/Fun/fly-escape/packages/sim-client/src/attempt-worker.ts
- /Users/linhkid/Documents/Fun/FlyBrain/fly/red.py
