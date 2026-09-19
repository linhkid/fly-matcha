> Independent planning draft, bias B: risk-first. Written 2026-09-18 by a subagent that saw only `brief.md`. Historical input to `synthesis.md`; not implementation instructions. Start at `../../README.md`.

# Matcha Fly: Draft B (risk-first)

Path aliases (absolute roots): **FB** = `/Users/linhkid/Documents/Fun/FlyBrain`, **FE** = `/Users/linhkid/Documents/Fun/fly-escape`. A1–A11 remain planner assumptions awaiting the user; nothing below is a user quote.

## 0. New recon facts that reorder the plan

- **F1. The Shiu model has quirks the brief omits** (from its `model.py`):
  - `(unless refractory)` governs both v and g, so g is frozen for 2.2 ms rather than decayed.
  - Reset is `v = v_rst; g = 0`.
  - Poisson input lands on `v` with weight `w_syn × f_poi` (250 → 68.75 mV), so every event forces a spike.
  - Integration is `method='linear'` (exact), not Euler.
- **F2. Independent taste-neuron (GRN) identity exists.**
  - The gustatory paper maps Gr33a/bitter → LB1a–d (LB1e clusters with them), ppk28/water → LB3a, Ir56b/low-salt → LB3b, Gr64f/sugar → LB3b–c, Ir47a → LB3d.
  - Explorer counts are LB3c 23 (11R/12L), LB3b 11, LB1a 11. This does not match flyverse-core's "165 sugar GRNs"; the census must explain the gap.
  - LB3c's two strongest targets are GABAergic (GNG038, GNG042).
- **F3. `DNg11` is a name collision, and the grooming names need rebinding.**
  - MaleCNS DNg11 is GABA (80.6%), with input in SPS/IPS from visual types (MeVPMe5) and output to IntTct/IPS/GNG. It has no LegNp(T1) output, so it is not a plausible foreleg-rub command.
  - "DNg12" is eight subtypes. `DNg12_a` goes to neck motor neurons (CvN4–7) with 1% in LegNp(T1); `DNg12_b` has 27.9% of its output in LegNp(T1).
  - `JO-C` returns 404.
  - `BM_InOm` exists with 745 neurons. These are eye-bristle mechanosensors, and eyes come first in the grooming hierarchy.
- **F4. fly-escape's "taste" group is not sweet taste.**
  - `BM_Taste` is the top input (688 synapses) to `GNG015`, which is MN9's strongest inhibitory input.
  - `claw_tpGRN` arborises only in GNG/PRW.
  - Only 3 of 32 `TARSAL_GRN_IDS` survived its motor-seeded extraction (`FE/scripts/connectome/pathways.json` vs `FE/data/processed/brain/manifest.json`; grouped at `FE/scripts/connectome/artifact.py:86`).
  - Its own probe found every taste gain equal to the zero-current baseline, with proboscis voltage slightly negative (`FE/specs/done/help-the-fly-escape/assets/evidence/04/feeding-feasibility.md`).
- **F5. The two reference repos disagree on unknown-transmitter sign.** It is 0 in `FB/fly/red.py:62` and +1 in `FE/scripts/connectome/extract.py:39`. "unc" types sit beside the GRNs (GNG016 is 17.6% of LB1a's input).

Sources:
- [bioRxiv taste-feeding connectome](https://www.biorxiv.org/content/10.1101/2025.08.25.671814v2.full)
- [Cell gustatory connectome](https://www.cell.com/cell/fulltext/S0092-8674(26)00943-8?rss=yes)
- [Shiu model.py](https://raw.githubusercontent.com/philshiu/Drosophila_brain_model/main/model.py)
- [cell-type explorer](https://reiserlab.github.io/celltype-explorer-drosophila-male-cns/) pages for MN9, GNG015, BM_Taste, BM_InOm, claw_tpGRN, LB1a, LB3b, LB3c, DNg11, DNg12_a/b, IN13A001.

## 1. Concept

Matcha Fly is an experimenter's tea table on a real wiring diagram. You serve one simulated male fly sweet (wagashi) and bitter (matcha = caffeine). In slow motion you watch the MaleCNS cascade from labellar taste neurons, through GNG interneurons, to the two MN9 motor neurons decide "drink" or "refuse". Then you silence one cell type at a time and predict what breaks.

The Python lab runs the published Shiu LIF on all ~164k neurons. The browser runs a verified sub-network of the same model.

The human learns four things:
- how antagonistic inputs are integrated through convergence, feed-forward inhibition and disinhibition;
- what a connectome does not supply: sign, gain, time constants and memory;
- why controls matter;
- which on-screen behaviour is neurons and which is puppetry.

## 2. Repo layout and single owners

```
specs/matcha-fly/  README (Next Agent Prompt) · slices/ · choices.md · prereg/ · assets/evidence/NN/
data/raw/          gitignored; sources.json
artifacts/         committed, small: circuits.json · model.json · codec.json · brain.flyk+manifest.json · fixtures/
lab/flylab/        data/fetch.py · census/ · graph/{build,artifact}.py · model/{spec,oracle,fixtures}.py · codec/ · experiments/<name>/{prereg,run,report}.py
packages/engine/   TS LIF, typed arrays, no DOM     packages/honesty/  Provenance type, <Tagged>, lint
apps/bench/        Vite routes: /atlas /bench/taste /bench/<circuit> /tearoom /about
```

The repo uses npm workspaces and Node's test runner, because FE's bun and wasm-pack harness is not installed here.

| Concept | Owner |
|---|---|
| Raw data + provenance | `flylab/data/fetch.py` → `sources.json` (pattern: `FE/scripts/connectome/download.py`) |
| Graph artifact format | `flylab/graph/artifact.py`; TS only reads, hash-checked |
| Circuit/group definitions | `flylab/census/` → `circuits.json`. Each role maps to bodyIds, an evidence kind (annotation, paper, crosswalk or functional) and a status (bound, unbound or collision) |
| Neuron-model definition | `flylab/model/spec.py` → `model.json` (exact float64 constants, integer step counts) |
| Python oracle | `flylab/model/oracle.py`; every experiment imports it |
| Browser engine | `packages/engine` |
| Stimulus encoding + motor decoding | `flylab/codec/` → `codec.json` (dose → rate → uint32 threshold; rate → behaviour); TS does look-ups only |
| Experiment reports | `flylab/experiments/*/report.py` |
| UI honesty tags | `packages/honesty` |

Three design choices are made for risk reasons:

1. **Integer synapse counts.** The artifact stores signed integer synapse counts, and `w_syn` is one scalar. Accumulation is then integer-exact and order-independent, so parity and sub/full equivalence cannot break on summation order. FE needed carefully ordered f64 sums (`FE/crates/sim/src/lif.rs`, `advance`).
2. **Counter-based Poisson.** A spike occurs when the 32-bit hash(seed, bodyId, step) is below the threshold. No floats are involved, and the stream is independent of graph size and lesions. FE had to keep consuming RNG samples for silenced neurons.
3. **Snap-to-rest.** `model.json` defines a snap-to-rest epsilon, which gives an exact rest state, active-set updates and no denormals.

## 3. Slice graph

Roots: **00** (consent-gated) and **01** (data-free). 00+01 → **02** → {**03** ∥ **04**} → **05** → **06** → **08** → **09**. Slices 07a–d branch off 02 and never block. Kill points follow 02 (concept), 03 (architecture) and 04 (product).

**00 consent-fetch-census** (0.5 d)
- Contract: every circuit role is bound by independent evidence, or marked unbound/collision.
- Seam: `fetch.plan()`, `fetch.run(consent=True)`, `census.bind(roles) → circuits.json`.
- What the human sees:
  - `python -m flylab.data.fetch --plan` prints the three files (14.5 MB, 43 MB, ~500 MB traced-only), states the source, and asks for consent.
  - `reports/census/index.html` shows counts per side, neurotransmitter, `class`, `entryNerve`, neuropils and collision flags.
- Verification:
  - Size and md5 match.
  - MN9 = 2.
  - F2 bindings hold: sweet-primary LB3c, sweet-secondary LB3b∪c, bitter LB1a–e.
  - Tarsal GRNs are selected by `vnc_sensory` ∧ gustatory class ∧ `entryNerve` ProLN (selector pattern from `FB/fly/patas.py:99-107`).
  - DNg11 is flagged as a collision.
  - The "165 vs 23" gap is explained.
- Delegated: regexes and styling.
- Must stay green: no raw data committed.
- Feedback that changes it: if the user declines the download, only 01 and synthetic 05 proceed.

**01 model-oracle** (1.5 d, no data)
- Contract: our LIF is the published one (F1), defined once.
- Seam:
  - `model.json {dtMs:0.1, a,b,c, vRest,vTh,vReset, wSynMv, refracSteps:22, delaySteps:18, poissonForce, snapEps, unknownNtSign}`
  - `Oracle(graph,model,seed).drive(group,thrU32).silence(ids).step(n) → {groupSpikes,stateHash}`
- What the human sees: `reports/model-check` with the PSP, the f–I curve against the analytic one, and the refractory-freeze trace.
- Verification:
  - Analytic unit tests.
  - Spike-time identity with Brian2 on 3 synthetic graphs using deterministic inputs. Brian2 gets its own env, as FB did for flyvis.
  - Fixtures captured from oracle intermediates (`FE/scripts/reference/generate_lif.py`).
- Delegated: numpy vs numba. If Brian2 will not install, record a Gap.
- Must stay green: fixtures pinned to the oracle source hash.
- Feedback that changes it: changing the formulation voids all downstream verdicts.

**02 taste-law** (3 d, FATAL gate; criteria in R1)
- Contract: sweet drives MN9 and bitter suppresses it, specifically and on a plateau.
- Seam: `experiments/taste_law/prereg.py`, with criteria as code, hash-locked before the run (pattern: `FE/specs/done/neural-vision/assets/neural-confirmation/freeze.json`).
- What the human sees: a report with
  - the dose–response heatmap;
  - the shuffle histogram;
  - the controls;
  - the `if`-baseline fit;
  - the network-active fraction;
  - free pre-checks: PAM/PPL1 recruitment, halt candidates, and ever-spiking counts per condition.
- Must stay green: 01 fixtures and prereg immutability.
- Feedback that changes it: on failure, follow the R1 fallback ladder. Failures stay recorded.

**03 envelope** (2 d, architecture gate; criteria in R7)
- Contract: a browser-sized artifact equals the full brain on an enumerated envelope and knows when it has left it.
- Seam:
  - `FLYK | version | nA | nSentinel | edges | u32 offsets | u32 targets | i16 counts`.
  - The manifest carries the envelope (levels × single lesions × seed set), hashes and `synthetic:false`.
- What the human sees: the union growth curve, sizes, off-grid divergence and sentinel recall.
- Delegated: sentinel pruning.
- Feedback that changes it: on FAIL, 05 and 06 become a replay player.

**04 lesion-atlas quiz** (1.5 d, product gate; criteria in R10). This is the first playable and needs no engine.
- Seam: `atlas.json` (condition × lesion → MN9, recorded on the full brain) consumed by static `/atlas`.
- What the human sees: a predict-then-reveal quiz, tagged *recorded from the full 164k-neuron run*.
- Verification: the depth metric, screenshot-critique, and a non-blocking human play-check.
- Feedback that changes it: if the play is thin, widen the modalities (water, salt, touch via BM_Taste ⊣ MN9) or re-scope to a guided explainer before any engine work.

**05 ts-engine** (2 d; criteria in R8 and R9)
- Seam:
  - `loadGraph`, `createBrain`, `setDrive`, `setSilenced`, `step(n) → {groupSpikes, sentinelFired, stateHash}`.
  - A Worker with transferred buffers and credit back-pressure (`FE/packages/sim-client/src/worker.ts`).
- What the human sees: `/bench/parity`.
- Must stay green: a grep gate forbids `Math.random` and `Math.exp` in the engine. `FB/web/src/cerebro.ts` shows how invented activity creeps in.

**06 taste-bench live** (3 d; this is A7)
- What the human sees:
  - dials snapped to the envelope levels;
  - a slow-motion layered schematic, because sensory neurons have no soma (`FB/fly/red.py:177`);
  - the MN9 meter and the proboscis;
  - click-to-silence;
  - a badge that reads "identical to full-brain run" or "exploratory (off-grid / sentinel fired)".
- Seam: `codec.json`; `Provenance = connectome|model|scripted|recorded`; lint requires `<Tagged>` on every displayed quantity.
- Verification:
  - The on-grid live hash equals the recorded one.
  - A Playwright shot goes through screenshot-critique.
  - compare-screenshots is run against the `/atlas` panels.
- Delegated: placeholder art.

**07a–d circuit spikes**: groom-command (R4), tarsal-stop (R3), learn-to-like (R6), whisk-rhythm (R5).
- Template: prereg → run → verdict in `choices.md`.
- On PASS: add the group, re-run 03, and add `/bench/<circuit>`.
- On FAIL: the mechanic ships scripted and tagged.

**08 tea room** (4 d)
- Seam: a `ceremony.ts` state machine over `StepSummary` and the codec decoders.
- Verification: a provenance-ledger test. It enumerates steps × tags, and the result must equal the verdicts.
- Scope: composes only passed circuits.

**09 garnish**: knit swatch, `/about` (CC-BY + manifest), optional soma cloud.

## 4. Risks and fog

| Risk (class) | Experiment + control | Pre-written pass | Box | Fallback |
|---|---|---|---|---|
| **R1** taste → MN9 with bitter suppression (FATAL) | Full graph. Sweet {25…200} Hz, then sweet 100 + bitter {0…200}; 1 s, 10 seeds. Controls: 100 weight shuffles; 10 size-matched random head-sensory sets; `σ(a·s−b·b)` baseline. Arms: unknown-NT 0 vs +1; afferents input-only vs not. | MN9 ≥20 Hz and ≥10× control in ≥9/10 seeds. Bitter 100 Hz cuts ≥70%, monotone. ≤5/100 shuffles reach half. Holds at ≥2 of 3 `w_syn` values (recalibrated ×0.7/1/1.4) and under both NT policies. Peak synchrony <5% (guard from `FB/fly/sobresalto.py`). | 3 d | (i) Rebind the GRNs. (ii) Sweet only: the antagonist becomes BM_Taste ⊣ MN9 and bitter is tagged scripted. (iii) MN9 silent: pivot the anchor to LC4/LPLC2 → DNp01 (14–70× in FB), or stop. |
| **R2** GRN identity (near-fatal) | Bind from the paper and annotations only, then stimulate each LB subtype alone with the sign predicted beforehand. | ≥80% of signs as predicted; identity is never derived from MN9's response. | 1 d | Label the populations "appetitive-like / aversive-like (defined by effect)"; the headline shrinks to the shuffle control. |
| **R3** tarsal → stop (cosmetic) | Foreleg GRNs at 100 Hz plus walking drive on DNg100, because inhibition is invisible at zero basal rate. Readouts: MN9 and census halt candidates. Control: size-matched foreleg tactile neurons, L/R crossed. | Candidate ≥10× control and driven premotor activity −30%; 8/10 seeds; 2 `w_syn` values. | 1.5 d | Stop is scripted on contact. |
| **R4** dust → groom (moderate) | BM_InOm (745) and other BM_*/JO* at 50–150 Hz. Rank all DNs unbiasedly and require T1-leg or neck output. Controls: random head mechanosensors; shuffles; eye-vs-antenna somatotopy. | ≥1 DN type at ≥10× control; 9/10 seeds; 2 `w_syn` values. DNg11 excluded (F3). | 2 d | Dust timer scripted; neurons decide nothing, and the UI says so. |
| **R5** 13A/13B rhythm (cosmetic, expected to FAIL) | LIF first: drive T1-projecting DNg12 subtypes, read flexor vs extensor MNs, and score with `ritmo()` from `FB/fly/cordon.py`. Rate model second; it needs the 4.6 GB neuron-size table, so a second consent. No body means no proprioceptive feedback. | Score ≥0.5 at 5–12 Hz, antiphase, 5/6 seeds, AND ≤10% of control drives pass (FB failed this: 21%). | 2+2 d | Scripted 7–8 Hz whisk, gated by the neural decision. |
| **R6** KC → MBON (cosmetic) | Odour A + reward vs unpaired B vs no-plasticity control. Pre-check KC sparseness (FB: 49% until a −3.0 bias, `FB/fly/dopamina.py`) and whether sugar recruits PAM. | Choice flips for A but not B in ≥80% of seeds, and the control does not flip ("el control lo mata"). | 3 d | Cut the feature; never fake learning. "Learn to like" uses the only lever FB found (reward-side depression). |
| **R7** sub ≡ full (architecture) | A = union of ever-spiking neurons over levels² × single lesions × seed set. Sentinels = excitatory one-hop targets of A. This is sound: the first escape must hit a sentinel. | Exact spikes on 100% of enumerated tuples. Union saturates (last quartile adds <2%). \|A\| ≤8k, sentinels ≤25k, artifact ≤12 MB. 200 off-grid tuples: divergence ≤1%, sentinel recall ≥95%. | 2 d | Replay recorded full-brain runs, as both reference repos ship. |
| **R8** TS performance (cosmetic) | Real artifact, Chrome Worker, M5. | ≥1× real time; else ≥0.05×. Slow motion is needed anyway, since the cascade lasts tens of ms. | 0.5 d | Active-set updates; Rust → WASM behind the same seam. |
| **R9** parity (moderate) | Integer accumulation, shipped constants, hash RNG. | State hash identical at 10 checkpoints × 3 graphs × 10k steps; spikes exact on 5 real tuples. | 1 d | FE's bar: spikes exact, floats within 1e-12. |
| **R10** play depth (PRODUCT-FATAL, missed by the brief) | Atlas: 6 conditions × ≤40 most active types × 3 seeds. | ≥8 types shift MN9 ≥30% somewhere, and ≥3 of them increase it. | 1.5 d | See slice 04. |

Whisk rhythm, learning and stop are deliberately not front-loaded. They probably fail, but failure is cheap. Only their census (slice 00) and the free pre-checks (slice 02) run early.

Risks the brief missed:

- **No memory.** The model remembers nothing beyond ~50 ms, so wagashi-before-tea order, satiety and habituation cannot emerge. All sequence is scripted.
- **Dataset-specific gain.** `w_syn` = 0.275 mV was calibrated on FlyWire synapse counts. Recalibrate by Shiu's own rule and demand a plateau (the FB cliff lesson).
- **Seeds are part of the envelope.** The browser draws only verified seeds.
- **Circular identification.** Defining GRN populations by their effect on MN9 makes the headline true by construction (R2).
- **Afferent recurrence.** LB1a → LB1a is 34% of its input.
- **Consent serialises everything.** Two roots (00 and 01) keep work moving while the user is away.
- **Jittery meter.** MN9 is two neurons, so decode over ≥100 ms windows.
- **Honesty drift.** FB's root README says "Validated" where `FB/fly/README.md` says "los giros son ruido". Tags must be enforced by lint.

## 5. Where I disagree with the brief

1. **A7.** The first playable should be the recorded lesion-atlas quiz (04), not a live bench. It tests fun a week earlier and cannot misrepresent the brain.
2. **A8 "exactly equivalent".** Equivalence holds only on enumerated (level, lesion, seed) tuples. It needs snapped dials, verified seeds, sentinels and a truthful badge; otherwise it is a hope.
3. **A8 "avoids the silence/seizure band".** This is not established on MaleCNS, because the gain is dataset-specific. Plateau criteria are needed, plus the F1 quirks the brief's model summary omits.
4. **A3 grooming.** "DNg11 verified" is a string match, and its anatomy contradicts the role (F3). Start from BM_InOm convergence and an unbiased DN ranking, not JO → aBN → aDN names.
5. **§5 fly-escape taste.** The brief inherits mislabels (F4). The taste group is touch bristles and GNG-only GRNs, 3 of the 32 IDs shipped, and it measurably inhibits the proboscis. Treat it as a cautionary tale, not a precedent.
6. **A2 ceremony framing.** A memoryless model cannot compute a sequence, so pitch it as a bench of instantaneous choices.
7. **One graph format like FE's f64 CSR.** Keep one format, but make it integer counts plus a scalar gain.
8. **A11.** Consent must gate only slice 00, not the project.
9. **Unknown-NT policy.** The brief lists both conventions without noticing they conflict beside the GRNs (F5). Make it a pre-declared sensitivity arm.

### Critical Files for Implementation
- /Users/linhkid/Documents/Fun/fly-escape/scripts/connectome/download.py
- /Users/linhkid/Documents/Fun/fly-escape/scripts/reference/generate_lif.py
- /Users/linhkid/Documents/Fun/fly-escape/crates/sim/src/lif.rs
- /Users/linhkid/Documents/Fun/FlyBrain/fly/sobresalto.py
- /Users/linhkid/Documents/Fun/FlyBrain/fly/cordon.py
