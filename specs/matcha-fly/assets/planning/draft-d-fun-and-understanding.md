> Independent planning draft, bias D: fun and understanding. Written 2026-09-18 by a subagent that saw only `brief.md`. Historical input to `synthesis.md`; not implementation instructions. Start at `../../README.md`.

# Draft D — Matcha Fly: fun and understanding

Every interview answer (A1–A11) is a planner assumption awaiting user confirmation, never a user quote. Repo-relative citations resolve under `/Users/linhkid/Documents/Fun/FlyBrain` and `/Users/linhkid/Documents/Fun/fly-escape`. Cell-type facts marked "recon" come from the public per-type pages (reiserlab cell-type explorer) fetched today. I downloaded and wrote nothing.

## 1. Concept and what the human learns

You host a tea ceremony for one paper-puppet male fly. You offer a sweet, then matcha, on his left or right mouthparts. A spiking model running in your browser on his real MaleCNS taste wiring decides whether the proboscis comes out.

Then you open the brain drawer and become the optogeneticist:
- bet on the outcome
- run a one-second trial
- replay the cascade in slow motion
- silence or light up a cell type
- rerun on the same seed
- keep the result in a tea journal whose pages double as knit swatches

What the human learns by hand:
- Taste is a labelled line at the sensor.
- Sweet reaches a motor neuron in a few hops.
- Bitter is an active brake, not an absence.
- Necessity differs from sufficiency.
- Behaviour lives in wiring: shuffle it and he never drinks.
- One modelling assumption (glutamate's sign) flips behaviour.
- The taste periphery is not where maleness lives.

The journal ends with an exit quiz assembled from the player's own experiments.

## 2. Experience rules (what this bias adds)

- **Loop:** offer → predict → run trial → slow-motion replay → cut/light → paired rerun → journal stamp.
  - Hands: drag a sweet or a matcha-dipped brush onto the left or right labellum. Holding longer gives a higher dose, with the Hz shown. Click nodes with green (silence) or red (activate) light. Drag the scrubber.
  - Betting first makes the surprise land.
  - Trials are record-then-play because the cascade lasts tens of milliseconds. Scrubbing at 1/50x is where understanding happens.
- **Names are earned.** A type starts as "relay #3 (GNG015)". Only the player's own passing experiment unlocks a nickname ("the bitter brake"). Cards answer fly-escape's four tooltip questions (`specs/done/help-the-fly-escape/GAMEPLAY.md`): plain meaning, what is measured, which data, what is approximated.
- **Three seals as charm.** Every on-screen quantity carries a hanko (stamp seal): WIRED (connectome), MODELLED (our equations and dials), STAGED (puppetry). A "What's staged here?" button lights every staged element. "The legs are puppetry. The decision to move them was not."
- **Spikes have two legal sources:** LIVE (browser engine) or RECORDED (a lab run, seed shown). Never a third.
- **Failures are content:** a "Didn't work" chapter shows dead circuits with their plots.
- **Knitting, cheap:** a swatch is a pure function of a recording. Its selvedge encodes seed and hashes, so each scarf is a reproducible experiment record.

## 3. Layout and single owners

| Concept | Owner |
|---|---|
| Raw data + provenance | `lab/data/` (`download.py`, `sources.json`, gitignored `raw/`) |
| Graph artifact format | `lab/graph/export.py` + `FORMAT.md`; sole reader `packages/engine/src/graph.ts` |
| Circuit/group definitions | `lab/census/circuits.toml` → `manifest.json.groups`, `cards.json` |
| Neuron model | `model/model.json` (language-neutral) |
| Python oracle | `lab/model/oracle.py`, `make_fixtures.py` |
| Browser engine | `packages/engine` (TS typed arrays, Worker) |
| Stimulus encoding / motor decoding | `codec/stimulus.json` / `codec/motor.json` (+ fixture vectors, thin readers) |
| Experiment reports | `lab/experiments/NN_name.py` → `lab/reports/NN/{prereg.md,report.html,table.csv,verdict.json}` |
| Honesty tags | `packages/honesty` |

Other directories:
- `packages/circuit-view` and `packages/swatch`.
- `apps/tearoom`, with routes `/bench/*`, `/swatch`, `/journal`, `/tearoom`, and `/about` (CC-BY attribution and manifest link).
- `lab/spikes/` for throwaway research; it is never an owner.
- `specs/matcha-fly/`: README with Next Agent Prompt, `choices.md`, slices, evidence.

## 4. Slice ladder

Standing gates:
- **G-fix:** browser spikes equal oracle fixtures exactly.
- **G-det:** seed ⇒ identical recording hash.
- **G-glow:** glow is a pure function of spike counts (zero spikes ⇒ zero glow), and `Math.random` is lint-banned repo-wide.
- **G-seal:** DOM audit; every `[data-quantity]` carries a provenance.
- **G-prov:** artifact hash matches manifest; `synthetic` forces a banner.

Visual slices end with screenshot-critique, plus compare-screenshots when a prior look changes. Human checkpoints are non-blocking. Defaults unless stated: *delegated* = internal structure, naming, placeholder styling; *green* = all gates plus earlier slices.

Order: S0→S1→S2 need no data, so something playable and screenshot-worthy exists before any download (write-spec: do not block on missing inputs). Then S3→S4→S5→S6→S7→S8→S9a-d→S10→S11→S12…→S14. S13 and S15 hang off S5, S16 off S3 and S5, and none of them block anything.

**S0 Model, oracle, engine (toy graph).**
- Question: does the browser reproduce Python bit-for-bit?
- Seam:
  - `model.json`: Shiu constants; delay and refractory in steps; xoshiro128** with uint32-compare Poisson; streams keyed by bodyId, so paired A/B is exact by construction. fly-escape instead makes silenced neurons keep consuming samples (`crates/sim/src/lif.rs`).
  - `oracle.run(graph, model, trial)`.
  - `Engine.load(graph, manifest, model)` and `Engine.run(TrialSpec) → TrialRecording`.
  - `TrialSpec {seed, durationMs, stimuli[{group, rateHz, onMs, offMs}], silenced[], activated[]}`.
  - `TrialRecording {spec, graphHash, modelHash, spikeStep: Uint32Array, spikeNeuron: Uint32Array, frontierSpiked}`.
- See: `/bench/fixture`, a green/red row per fixture with hashes.
- Verify: G-fix, G-det. Fixtures capture the oracle's own intermediates (`scripts/reference/generate_lif.py` in fly-escape).
- Flip: user wants Rust now → swap behind `Engine`, fixtures unchanged.

**S1 Toy bench.**
- Question: is the loop fun on 12 invented neurons?
- Seam: `packages/honesty` (`Provenance = wired|modelled|staged|toy`, `<Seal>`, DOM audit).
- See: `/bench/toy` with two sliders, a bet, Run, rate meter, 12 dots, TOY banner.
- Aha: leak + threshold + veto is already a decision.
- Verify: G-glow, G-seal; one screenshot.
- Flip: human prefers live dials → promote continuous mode.

**S2 Swatch.**
- Seam: `recordingToSwatch(rec, rows, palette) → StitchGrid` → SVG/PNG and knit chart with pattern-ID selvedge.
- Variable: stitch colour = spikes per bin.
- See: `/swatch` (drop a recording).
- Aha: a second of brain is a fabric.
- Verify: golden grid; zero spikes ⇒ plain fabric.
- Delegated: palette, glyphs.
- Flip: rows as neurons instead of types.

**S3 Census "cast list".**
- Asks go-ahead for annotations (14.5 MB) and neurotransmitters (43 MB) only, naming source and sizes.
- Seam: `circuits.toml` (role → type strings; side from `rootSide`/`entryNerve`, since sensory somata lie outside the volume; evidence level). `census.py` → HTML.
- See: found/missing roles, L/R counts, transmitter with confidence, dimorphism flag. The column needs confirming; otherwise use the `m` suffix seen in `ICL008m`, `SIP104m`.
- Verify: a zero-match role fails. Anchors asserted from recon: MN9 1+1 ACh; LB1a 5R/6L; BM_InOm 405R/340L; DNg11 3+3.
- Flip: a missing role cuts its rung before design.

**S4 Blind tasting screen (lab, exploratory).**
- Asks go-ahead for traced-only weights (~500 MB).
- Seam: `lab/graph/build.py` (typed bodies, ≥5 synapses, sign table, event-driven columns, as `fly/red.py` in FlyBrain). Experiment 04: each gustatory receptor neuron (GRN) type alone at 100 Hz → MN9, 5 seeds.
- See: ranked bars and the first real swatch.
- Aha: most jars do nothing; a few decide.
- Verify: against the gustatory paper's table where obtainable; no pass/fail.
- Flip: nothing drives MN9 → audit signs and threshold first.

**S5 Sweet versus bitter, preregistered.**
- `prereg.md` and PASS constants are committed before held-out seeds are consumed:
  - sweet→MN9 beats size-matched random sensory populations;
  - bitter cuts it ≥80%;
  - it holds at two weight scales and two dt (plateau rule, `fly/README.md` in FlyBrain);
  - ≥10 seeds;
  - ≤5/100 shuffles drive MN9.
- See: report; emits `verdict.json`.
- Aha: shuffled wiring never drinks.
- Delegated: plotting.
- Flip: thresholds may change only before seeds are consumed. A fail stays failed and the game pauses at a "why" page.

**S6 Envelope → artifact.**
- Question: is the subgraph exactly the full brain inside the offered stimulus × lesion envelope?
- Seam: `tea.graph.bin` = `"TEAGRAPH" | u32 version | u32 n | u32 e | u32 rowOffsets[n+1] | u32 post[e] | i32 signedSynapses[e]`, presynaptic rows. Integer sums times one weight make arithmetic order-independent.
- Manifest: sources, hashes, bodyIds, groups, core/margin/frontier masks, envelope, `synthetic:false` (after `scripts/connectome/artifact.py` in fly-escape).
- See: size/frontier report.
- Verify: identical group spike trains, full versus subgraph, over envelope corners × seeds; ≤25 MB.
- Delegated: margin threshold within a stated range.
- Flip: too big → fewer live lesions, rest RECORDED.

**S7 Real taste bench.**
- Hard cutover. The toy survives only as fixture and as a "what is a LIF neuron" explainer.
- Seam: `stimulus.json` (saturating dose→Hz); `motor.json` (MN9 spikes in window ≥k ⇒ extend; spikes, not voltage, per fly-escape `CONTRACTS.md`).
- Variable: proboscis pose.
- See: `/bench/taste`. A frontier spike shows "here be dragons — check in the lab".
- Aha: a real wiring diagram just refused my tea.
- Verify: three real fixture trials. 1 s simulated must take ≤1 s wall; else dt 0.5 ms if S5's plateau allows; else WASM behind `Engine`.
- Flip: pose unreadable.

**S8 Taste map.**
- Each trial drops a dot on the sweet × bitter plane, coloured drank/refused. The boundary emerges from the player's hands.
- Variable: dot colour.
- Aha: I can feel where sweet stops cancelling bitter.
- Verify: dots equal recordings.
- Flip: dull boundary → change dose ranges, never the circuit.

**S9a–d Circuit view** (`renderCircuit(manifest, recording, t)`, pure).
- (a) layout by hop depth; (b) glow = windowed spike count with scrubber; (c) edge sign colour; (d) cards.
- One crop and verdict each.
- Aha: three hops from tongue to muscle.
- Flip: too many nodes → collapse by type.

**S10 Light wand and puzzles.**
- Seam: `pairedRun(specA, specB)`; `Puzzle {id, brief, tools, budget, goal, teaches, evidence}`. The build fails unless `evidence` names a PASS `verdict.json`, which makes sacred contract (ii) a build error.
- A lab lesion screen decides which puzzles exist.
- Variable: lesion/activation markers.
- See: side-by-side A/B.
- Aha: cut the brake and he drinks matcha.
- Flip: budgets too easy or hard.

**S11 Journal.**
- Seam: `JournalEntry {puzzleId, recordingHashes, unlockedNames}` in localStorage (as `apps/web/src/progress.ts` in fly-escape).
- See: `/journal` with earned names, "Didn't work", maleness strip, exit quiz.
- Variable: page layout.
- Verify: a name unlocks only if the stored recording satisfies the goal on replay.
- Flip: quiz feels like school → optional.

**S12… Content rungs.**
- One experiment each: prereg → lab → verdict → puzzle JSON → journal page.
- See: a new puzzle card. Verify: the evidence gate.
- Flip: user picks which matter.

**S13 Dust spike (2 days).**
- Prereg: BM_InOm versus size-matched random sensory control, two weight scales, ≥10 seeds. Which descending types answer selectively?
- See: report.
- Kill: none selective → dust is STAGED or cut.

**S14 Tea room.**
- Seam: `Ceremony` state machine consuming only decoded motor events.
- (a) staging with placeholders; (b) puppet poses; (c) seal overlay.
- Verify: G-seal on the route; no clip plays on an empty recording; a refusal ending is reachable.
- Flip: art direction.

**S15 Whisk-rhythm spike (3 days, `lab/spikes/`, rate model after `fly/cordon.py` in FlyBrain).**
- The prereg must demand specificity against ≥20 random descending types, because FlyBrain's copy oscillated for 21% of them.
- See: report.
- Expected to fail; the output is a plot and a "Didn't work" page.

**S16 Male stretch.**
- Census roles (`pIP10`, wing motor neurons, `mAL_m*`, `AN09B017*`) plus one preregistered experiment. See experiment 10.

## 5. Experiments and puzzles

1. **Wagashi first.** Trace the sweet/bitter boundary. Bitter suppresses sugar-driven MN9 (139.9→0.8 Hz reproduced on MaleCNS).
2. **Blind tasting.** One mystery jar per GRN type; sort by behaviour. Sensor identity, not pattern, sets valence.
3. **Cut the brake.** Make him drink straight matcha with ≤2 silenced types. MN9's strongest inputs include GABAergic GNG015, GNG095, GNG130 (recon). If the screen finds no solution, the puzzle becomes "why can't you?"
4. **The missing relay.** Abolish sweet drinking with the fewest cuts, then activate one relay alone. Necessity is not sufficiency; relays are redundant.
5. **Scramble the wiring.** Same neurons and synapse counts, random partners (RECORDED). The program is the wiring.
6. **One-sided sip.** Left labellum only: do both MN9s fire? The game reports the measured convergence.
7. **Water or sugar?** Overlap is highlighted and counted. Different sensors, shared machinery (~67% in Shiu).
8. **The assumption switch.** Glutamate excites (RECORDED): does the brake vanish? Wiring gives no sign.
9. **Matcha dust.** 745 eye-bristle neurons versus a random control. Convergence reaches specific descending neurons, or does not, and the page says why.
10. **How male is this circuit?** A WIRED-only strip shows the fraction of responsive types flagged dimorphic. Taste→MN9 should be near zero, which is the paper's headline verified by hand. Stretch "Serenade": activate `pIP10` (recon: exists, 1L+1R, ACh → `dPR1`, `TN1a_g`, `vPR9_a`) and ask whether wing motor neurons follow. The song is sonified real spikes.

## 6. Fakery traps and risks

Traps:
1. **Idle sparkle.** A zero-basal brain is dark; say so. FlyBrain fakes this in `web/src/cerebro.ts`:
   - `estimularEnVivo` adds roughly 15–30 random flashes per tick.
   - `estimularBaile` and `estimularCanales` light thousands of random somata in coordinate zones with travelling waves.
   - A drum sequencer (`neuroestimulador.ts`) drives them, and the README calls it optogenetics.
2. **Whisk glow.** Legs may be STAGED. T1 (front-leg) nodes show real spikes or a "not simulated" hatch.
3. **Forced happy ending.** The ceremony may end in refusal.
4. **Eased meters.** Only the puppet eases; the meter is a stated-window spike count.
5. **Hunger or learning curves** without a passing control.
6. **Sound** from anything but spikes.

| Fog | Resolved by | Kill / fallback |
|---|---|---|
| GRN modality | S3, S4 | jars stay mystery types |
| Taste on MaleCNS | S5 | failure recorded; game pauses |
| Envelope, speed | S6, S7 | fewer live lesions; dt; WASM |
| Lesion solvability | screen inside S10 | "why can't you?" |
| Grooming command | S13. Recon: `DNg11` predicted GABA (80.6%) with visual/posterior-slope partners; `DNg12_a` outputs to neck motor (`CvN*`, `MNnm08`); `JO-C`, `BM_Ant` 404 | dust STAGED or cut |
| Rhythm | S15 | STAGED animation + failure page |
| Pheromone path | S16. Recon: `mAL_m1` exists, but its top inputs `AN09B017a/b/g` are listed glutamatergic, so "Glu inhibits" likely kills it | maleness strip only |

## Where I disagree with the brief

1. **A7** is too big and blocked on the download. Do the toy bench first. The real bench ships meter and proboscis only. Cascade and lesion are separate one-variable rungs.
2. **A8 live dials:** trials plus slow motion should be primary; continuous pouring is garnish.
3. **A8 equivalence** holds only with bodyId-keyed Poisson streams and inside the envelope. Add the frontier guard. Shuffles and sign flips ship RECORDED.
4. **A2:** the swatch is the cheapest screenshot-worthy artefact. Build it at S2, not last.
5. **A3:** demote dust→grooming to a spike (see recon). Cut "stop at the bowl" because a seated ceremony shows no visible behaviour. Promote the maleness strip and `pIP10`.
6. **A4:** omit the hunger knob rather than label it. Assumption switches teach more.
7. **A1:** measure understanding (three earned names, one swatch, exit quiz), not minutes.
8. **Mushroom-body learning:** lab-only future; FlyBrain's control killed it.

### Critical Files for Implementation
- /Users/linhkid/Documents/Fun/fly-escape/scripts/reference/lif_sim.py
- /Users/linhkid/Documents/Fun/fly-escape/scripts/connectome/artifact.py
- /Users/linhkid/Documents/Fun/fly-escape/crates/sim/src/lif.rs
- /Users/linhkid/Documents/Fun/FlyBrain/fly/red.py
- /Users/linhkid/Documents/Fun/FlyBrain/web/src/cerebro.ts
