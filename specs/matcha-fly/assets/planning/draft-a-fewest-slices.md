> Independent planning draft, bias A: fewest slices. Written 2026-09-18 by a subagent that saw only `brief.md`. Historical input to `synthesis.md`; not implementation instructions. Start at `../../README.md`.

# Matcha Fly — Draft A (fewest slices)

This is the fewest-slices draft. I wrote no files. Path aliases used below are absolute: `FB` = `/Users/linhkid/Documents/Fun/FlyBrain`, `FE` = `/Users/linhkid/Documents/Fun/fly-escape`, `K` = `/Users/linhkid/Documents/Fun/fly-sim-k`. Everything in brief §6 is treated as a planner assumption, never as a user statement.

## 1. Concept

You host a tea ceremony for one guest: a simulated male fruit fly. Whether it extends its proboscis to your bowl is computed live in the browser. The computation uses the real MaleCNS wiring from its taste neurons to its two MN9 motor neurons, under the published Shiu LIF rules, with no training and no per-neuron tuning. You offer sweet (wagashi), bitter (matcha, i.e. caffeine) and water. Then you break things by silencing a cell type and watch the decision change. A Python lab runs the same model on the whole connectome with controls, and it is the only place claims are made.

What the human learns by doing:
- **Convergence:** hundreds of taste neurons feed a few hubs, which feed two motor neurons.
- **What a connectome gives:** topology and synapse counts, but not sign, weight units or time constants (`FB/fly/red.py` docstring).
- **Why controls matter:** a shuffled connectome should fail where the real one succeeds.
- **A visible model limit:** inhibition only shows against drive, so bitter alone does nothing.
- **What this model cannot do:** hunger, rhythm, learning.

v1 is five slices with four human checkpoints. Everything else is parked by name.

## 2. Repo layout and single owners

The layout is `K/lab` (Python), `K/web` (one Vite app), `K/data` (ignored) and `K/specs/matcha-fly`. The spec folder holds a README with a Next Agent Prompt, `slices/`, `choices.md` in FE's ledger format, and `assets/evidence/NN`. There is no `apps/` + `packages/` split. FE needed one for two apps plus a renderer (`FE/specs/done/help-the-fly-escape/CONTRACTS.md`); we have one app.

| Concept | Single owner |
|---|---|
| Raw data + provenance | `lab/data.py` → `data/raw/sources.json`; raw data never committed |
| Graph artifact format | `lab/artifact.py` (write + read); sole TS reader is `web/src/engine/artifact.ts` |
| Circuit/group definitions | `lab/circuits.json`; every write goes through `lab/census.py` and carries provenance (census or experiment) |
| Neuron-model definition | `lab/model.json` (parameters, update order, PRNG id) |
| Python oracle | `lab/lif.py` |
| Browser engine | `web/src/engine/lif.ts` + `worker.ts` |
| Stimulus encoding, motor decoding | `web/src/coupling.ts` (`doseToHz`, `decodeProboscis`); the lab speaks only Hz and spikes, so neither concept exists twice |
| Experiment reports | `lab/report.py` → `lab/reports/<exp>/<commit>/index.html`; accepted copies go to spec evidence |
| UI honesty tags | `web/src/honesty.ts` |

Two cross-cutting rules:
1. **The artifact stores only facts.** It holds outgoing CSR with signed integer synapse counts. `w = 0.275 mV` lives in `model.json`, so the split between facts and model is in the file format.
2. **Cheapest preregistration.** Pass criteria are constants at the top of the experiment file, committed before confirmation seeds run. The report prints both commit hashes, and failed reports stay in evidence.

Tooling:
- **Python:** `python3 -m venv` plus pinned requirements. The pins come from `FE/scripts/requirements.txt` (numpy 2.5.2, pandas 3.0.5, pyarrow 25.0.1, scipy 1.18.1), with matplotlib added. Tests use stdlib `unittest`.
- **Web:** Vite + TypeScript + vitest, no UI framework (`FB/web/src` is framework-free), npm, and Playwright for screenshots (both repos use it).
- **Checked on this machine:** `uv`, `bun` and `wasm-pack` are absent, and the base Python 3.13.13 has no numpy.

## 3. Slice graph

The order is `S1 → S2 → S3 → S4 → S5`. Two items, G1 and G2, are parked and described after S5.

### S1 — Ground: data, graph, census

Question: do the players exist under names we can query, and does the graph load?

- **Contract:** one consent, one download, a cached full signed graph, and one census covering every population any later slice might touch. There is never a second census slice.
- **Seam:**
  - `lab/data.py: download()` checks size and md5 from `x-goog-hash` and writes to a `.part` temp file. It is a port of `FE/scripts/connectome/download.py`.
  - `load_graph() -> Graph{body_ids ascending, out_ptr, out_idx, signed_count:int32, type, nt, side}`. It keeps typed bodies only and edges with ≥ 5 synapses.
  - Sign rule: ACh is +, GABA/Glu/histamine are −, and DA/OA/5HT/unknown are 0 (`FB/fly/red.py`). FE's unknown → +1 rule, which covers 2,360 neurons in its manifest, is the recorded alternative.
  - `lab/census.py: census() -> circuits.json`.
- **See:** `python -m lab.census` writes an HTML report.
  - Taste rows: every gustatory sensory type (`LB*`, tarsal, `BM_Taste`), `MN9`, MN9's top-20 presynaptic types, and the top second-order targets per GRN type.
  - Informational rows: grooming (`DNg11`, `DNg12_*`, `IN13A*`, `IN13B*`, T1 leg MNs) and mushroom body.
  - Each row shows count, side, NT, which annotation column matched, and an explorer link.
  - Hubs are found by connectivity, never by literature nickname.
- **Verify** (written first, in the `FB/fly/paso0.py` spirit of "questions that can kill the plan"):
  - md5s match.
  - At least 160k typed neurons.
  - Sign coverage ≥ 95% (FB measured 98.1%).
  - `MN9` is 1 L + 1 R, ACh.
  - `GNG015` and `GNG095` are among MN9's top inputs.
  - Every census GRN has at least one outgoing edge with ≥ 5 synapses. FB found 1,989 of 3,377 photoreceptors were outputless fragments.
  - The edge count is printed.
- **Delegated:** CLI flags, cache format, HTML look.
- **Green:** this is the first slice, so it only requires `git init` with `data/` ignored.
- **Feedback:**
  - The A11 consent ask is stated exactly: annotations 14.5 MB, neurotransmitters 43 MB, and the traced-only weights at about 500 MB. That is FB's choice, 540 MB total.
  - The same ask covers PyPI wheels now and Playwright's Chromium at S4.
  - No local copy exists (`FB/data` is absent and `FE/data/raw` holds only `.gitkeep`), so a refusal stops the project.
  - If the user can supply the gustatory paper's modality table, it becomes S2's answer key.

### S2 — Science: does taste → proboscis reproduce on MaleCNS?

- **Contract:** the model definition, plus a verdict with controls that licenses or forbids the mechanic.
- **Seam:** `lab/model.json` + `lab/lif.py: Brain(graph, model, seed, silenced=())`, `.set_rates({bodyId: hz})`, `.run(ms) -> Spikes`. It uses Shiu parameters, dt 0.1 ms, and zero noise. The slice fixes these decisions:
  - Forward Euler in f64 using only + − × ÷ and no `exp`. Python and JS then agree bit for bit, which is the libm lesson in `FB/CLAUDE.md`.
  - Event-driven delivery in ascending source order (`FE/crates/sim/src/lif.rs`).
  - An 18-step delay ring.
  - A driven neuron spikes on each Poisson event unless it is refractory.
  - Poisson streams come from a 32-bit-ops PRNG keyed by (seed, bodyId). Full, subgraph and lesioned runs therefore see identical input.
- **See:** `python -m lab.experiments.taste` writes an HTML report with five parts:
  - (a) A functional sweep: each GRN type alone → MN9 Hz, and each with sugar → suppression. This discovers the sweet, bitter and water populations.
  - (b) A sweet × bitter dose surface.
  - (c) The controls.
  - (d) A single-type lesion table.
  - (e) A two-number rule, `sweet − k·bitter > θ`, fitted to (b). The report states plainly that (d) is what the rule cannot express. This runs the `if` comparison that `FB/fly/README.md` admits it never ran.
- **Verify:** a criteria block modelled on `FB/fly/sobresalto.py`. The values are my proposals, and the slice file freezes them.
  - Sugar at 100 Hz → MN9 ≥ 20 Hz in every seed.
  - Adding bitter at 100 Hz → ≥ 80% drop (flyverse-core saw 139.9 → 0.8 Hz).
  - 100 weight shuffles: at most 5 reach half the real rate.
  - 5 size-matched random sensory populations: ≤ 10% of the real rate.
  - Network mean ≤ 10 Hz and peak synchrony < 5%.
  - All of the above hold at two or more adjacent `w` values in {0.2, 0.275, 0.35} mV.
  - Pilot seeds are 0–2. Confirmation seeds 100–104 are run once.
  - Oracle unit cases run on 4-neuron graphs: strict `>`, refractory, delay, signed asymmetric edges, silencing.
- **Delegated:** vectorisation, run cache, plots, parallelism.
- **Green:** S1 checks.
- **Feedback:** a failed verdict goes to the user as a result. The options are to ship the honest failure as the story, or to move to FlyWire where Shiu validated. Tuning until green is never an option.

### S3 — Port: browser brain = lab brain

There is no human checkpoint. The verdict is a command.

- **Contract:** the exported subgraph and the TS engine reproduce the oracle inside a declared envelope.
- **Seam:**
  - `lab/artifact.py` writes `"FLYSIMK1" | u32 n | u32 e | u32 outPtr[n+1] | u32 outIdx[e] | i32 signedCount[e]`. Rows are outgoing directly; FE stores postsynaptic rows and re-orients at load.
  - The manifest holds bodyIds as strings, types, NT, groups, `model.json` verbatim, envelope runs, source hashes, exporter revision, attribution, and `synthetic:false`.
  - `web/src/engine/lif.ts: class Brain { constructor(artifact, seed); setRates(idx, hz); setSilenced(idx); step(n); drainSpikes() }`.
  - `lab/fixtures.py` emits S2's unit cases as JSON from the running oracle, following the `FE/scripts/reference/generate_lif.py` pattern.
- **Envelope:** S is every neuron that spikes in any run of {sweet, bitter, water on a grid ≤ 200 Hz} × {no lesion, each single listed-type lesion} × seeds. The margin is every neuron whose peak voltage passed halfway to threshold. The subgraph is induced on S ∪ margin and preserves order.
- **See:** `python -m lab.export --verify` and `npm test` print a parity table.
- **Verify:**
  1. oracle(full) ≡ oracle(sub), spike for spike, on every envelope run. This is true by construction, so it acts as a bug detector.
  2. 20 held-out conditions (new seeds, random rates, random lesion pairs) must give an exact MN9 spike count in ≥ 90% of cases. A miss adds that run's spikers and re-exports. The miss rate is shown in `/about`.
  3. TS ≡ oracle: exact spikes on fixtures, including a threshold-equality case, and on one golden real run.
  4. S2 criteria re-pass on the subgraph.
  5. The artifact is ≤ 5 MB and TS runs at ≥ 0.2× real time. Otherwise see R3.
- **Delegated:** TS internals, PRNG choice (32-bit ops, id stored in `model.json` like FE's `PRNG_ID`), build scripts.
- **Green:** S1, S2.
- **Feedback:** none expected.

### S4 — Play: the taste bench (first playable)

- **Contract:** a newcomer sees cause → cascade → action, and can break it.
- **Seam:**
  - Worker protocol in: `load | setRates | setSilenced | setSpeed | reset`. Out: `summary{brainMs, groupHz[], mn9Spikes, envelope:'inside'|'outside'}` at about 30 Hz.
  - Stepping is live, with no record-then-play, credits or archives. FE needed those for 16 × 70k neurons; we run one small subgraph.
  - `coupling.ts` provides `doseToHz` and `decodeProboscis`. Decoding uses hysteresis on spikes and never voltage, because FE's CONTRACTS.md found voltage "tonically above the provisional gate even without taste".
  - `honesty.ts` defines `Provenance = 'connectome' | 'model' | 'scripted'`, and the only `Readout` primitive requires it.
- **See:** the `/bench` route shows:
  - Sweet, bitter and water dials.
  - Brain-time slow motion, default 0.2× and labelled.
  - An MN9 meter and a placeholder proboscis.
  - A cascade of at most 12 cell types chosen by rule: highest mean rate in envelope runs, plus any type whose lesion moves MN9 by ≥ 25%.
  - Click to silence.
  - A hand-written one-line blurb and explorer link per type.
  - An "outside verified envelope" badge.
- **Verify:**
  - Playwright checks that raising sweet extends the proboscis and that adding bitter retracts it.
  - Silencing the strongest bitter-recruited inhibitory type restores extension. The expected outcome is taken from S2's table.
  - Every `[data-readout]` has `data-provenance`.
  - The same seed and actions give the same spike hash.
  - screenshot-critique is the last step. The visual variable is cause→effect legibility, and art is out of scope.
- **Delegated:** layout, colour, SVG vs canvas, copy tone.
- **Green:** S3 parity; S2 on the subgraph.
- **Feedback:**
  - The human question is "fun for five minutes?" If the answer is no, do G1 before S5.
  - A live glutamate-sign flip ships only if it fits the envelope. Otherwise it appears as a lab recording.

### S5 — Ship: the tea room

- **Contract:** a roughly 10-minute ceremony whose outcomes come only from the engine, deployable as static files.
- **Seam:**
  - `tearoom.ts` is a state machine, `prepare → present → taste → verdict → reflect`, consuming only `coupling.ts` outputs. A bowl recipe maps to doses.
  - Koans are generated from S2's tables: the most bitter bowl still drunk, the one silence that makes it drink straight matcha, and the one silence that makes it refuse sugar.
  - Whisking (front-leg rub), walking and sipping are scripted and tagged as scripted.
  - `/about` shows the manifest, CC-BY attribution, holdout miss rate, model limits and the rule-baseline chart.
- **See:** the `/` route.
- **Verify:**
  - Playwright plays one ceremony.
  - Koan answers equal the oracle's table, and tags are present.
  - `vite build` output runs from a plain static server.
  - screenshot-critique runs last. The visual variable is ceremony readability.
- **Delegated:** art (placeholders are acceptable), pacing, copy.
- **Green:** everything above.
- **Feedback:** theme, pacing, and which parked item comes next.

### Parked, by name

- **G1, dust → grooming decision:** one S2-style experiment on the path from the mechanosensory types found in the census to `DNg11`/`DNg12_*`. On a pass the fly decides when to whisk, and the animation stays scripted.
- **G2, knit "brain swatch":** a rendering of a session's spike raster as a knit chart, about a day of work after S3.
- **Cut from month one:** whisk/knit rhythm, learning, tarsal stop, soma cloud, Rust/WASM, and the pheromone stretch.

## 4. Risks and fog

- **R1. GRN modality mapping is unknown (S2a).** It is resolved by functional discovery with pilot and confirmation seeds, with the paper's table as answer key if supplied. Kill criterion: if no GRN type drives MN9, stop and show the user. The fallback is FlyWire.
- **R2. Regime (S2c).** If sugar pushes the network above 10 Hz mean, or S exceeds about 50k neurons, the Shiu regime does not hold here. The fallback is that the bench becomes a gallery of lab recordings, which is FB's replay model. The toy still ships as a viewer.
- **R3. Parity and speed (S3).** If bit equality is fragile, fall back to FE's regime of exact spikes and floats within 1e-12. If it is slow, lower the slow-motion factor. Raise dt to 0.5 ms only if S2 re-passes there; FB runs at 0.5.
- **R4. Thin fun (S4).** The human decides. G1 is the pre-planned thickener, and its failure costs nothing because whisking is already scripted.
- **R5. "A rule does the same."** This is answered in S2(e) and displayed in `/about`.
- **R6. Multi-lesion play leaves the envelope.** The mitigation is the badge plus monotone envelope growth.
- **R7. Ladder creep.** FE's evidence folder holds 43 numbered passes (`FE/specs/done/help-the-fly-escape/assets/evidence`). The rule is that a new slice must displace a parked item in the README and never be appended silently.

## Where I disagree with the brief

1. **A8, "exactly equivalent subgraph".** It is exact only for enumerated runs. New seeds or lesion pairs can recruit outside neurons. I replace "exact" with a verified envelope (by-construction check, held-out miss rate, UI badge). It only works if Poisson streams are keyed by bodyId.
2. **A8, "narrow interface so a Rust→WASM swap stays possible".** I cut it. A small subgraph in typed arrays with slow motion is nowhere near a performance wall, and `wasm-pack` is not installed. FE chose Rust for 16 × 70k neurons. Do not design for a swap.
3. **A2, whisk-rhythm "time-boxed spike".** I cut it from month one rather than time-boxing it.
   - FB's VNC LIF self-ignites at ×3.
   - FB's rate model needs the 4.6 GB `Neuprint_Neurons.feather` for volumes (`FB/fly/cordon.py`), and it still oscillates for 21% of DNs against 3.4% published.
   - The eLife model needs proprioceptive feedback, and we have no body.
4. **A3, learning and tarsal stop.** Both are cut.
   - FB's KCs sat at 49% active until a hand-set −3.0 bias, and "el control lo mata" ("the control kills it").
   - That bias would also break the one-free-parameter purity of the Shiu model.
   - Tarsal stop needs a locomotion readout, which FB shows is noise.
5. **Knit swatch, grooming decision, Three.js cloud, per-circuit bench routes, `apps/` + `packages/`.** All of these come after v1 or never. v1 has one `lab/`, one `web/` and one bench.
6. **A5 is missing a contract: the simple-rule baseline.** FB names it as its uncomfortable gap. Here it is a required table in S2 and a chart in `/about`.
7. **A5(iii).** Tighten it to arithmetic-only Euler and integer synapse counts, so parity means equality rather than tolerance. Deviating from Brian2's integrator is a recorded choice. Validation is reproducing the MN9 results, not Brian2 traces.
8. **A11.** Choose the traced-only file (0.56 GB total). Let the single consent ask also cover PyPI wheels and Playwright's Chromium, which are downloads too.
9. **A8, real time.** Prefer labelled slow motion, default 0.2×. At 100 Hz, real-time spikes are invisible anyway. Slow motion removes the speed risk and improves understanding.

### Critical Files for Implementation

The target directory is empty, so these are the reference files the first slices port from. They seed `K/lab/data.py`, `K/lab/lif.py`, `K/lab/experiments/taste.py`, `K/lab/artifact.py` and `K/lab/fixtures.py`.

- `/Users/linhkid/Documents/Fun/FlyBrain/fly/red.py`
- `/Users/linhkid/Documents/Fun/FlyBrain/fly/sobresalto.py`
- `/Users/linhkid/Documents/Fun/fly-escape/scripts/connectome/download.py`
- `/Users/linhkid/Documents/Fun/fly-escape/scripts/connectome/artifact.py`
- `/Users/linhkid/Documents/Fun/fly-escape/scripts/reference/generate_lif.py`
