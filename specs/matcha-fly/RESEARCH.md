# Research record

Inspected 2026-09-18. This file holds what was learned before slicing, and what each finding forces the plan to do. Claims about the two reference repos cite their files; both repos are read-only neighbours of this project (`../FlyBrain`, `../fly-escape`).

## The dataset

MaleCNS v1.0 is the first finished connectome of a whole male *Drosophila* central nervous system: central brain, optic lobes and ventral nerve cord (VNC) in one animal, with the neck connective intact. About 166,000 neurons, 11,700 cell types and 125 million synapses. Released 2026-06-08, published in *Cell* 2026-09-03, licensed CC-BY 4.0. Built by Janelia FlyEM, the Cambridge Drosophila Connectomics Group and Google Research (flood-filling networks, PATHFINDER, SegCLR, then years of human proofreading).

The headline science is sex: 262 sex-specific and 114 dimorphic cell types, 4.8% of the central brain, concentrated in higher centres. Sensory and motor periphery is largely the same in both sexes. Three companion papers cover the visual system, social behaviour, and the **complete gustatory connectome**, which reports that appetitive, aversive and pheromonal taste pathways converge on compact second-order hubs that broadcast to proboscis motor neurons, descending premotor neurons, locomotor-stop circuits and neuroendocrine cells.

Flat files, public bucket, no account or token:

`https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/`

| File | Size | Columns this project needs |
|---|---|---|
| `body-annotations-male-cns-v1.0-minconf-0.5.feather` | 14.5 MB | `bodyId, type, superclass, class, subclass, somaSide, rootSide, somaLocation, entryNerve` (+ any synonym, FlyWire-type or dimorphism column; slice 01 lists them) |
| `body-neurotransmitters-male-cns-v1.0.feather` | 43 MB | `body, consensus_nt` |
| `connectome-weights-male-cns-v1.0-minconf-0.5-traced-only.feather` | ~500 MB | `body_pre, body_post, weight` |
| `connectome-weights-male-cns-v1.0-minconf-0.5.feather` (not needed) | 1.05 GB | same, plus untraced fragments |

Per-type pages: `https://reiserlab.github.io/celltype-explorer-drosophila-male-cns/types/<TYPE>.html`.

## Looking at the brain by hand

Before any code, the dataset can be explored in a browser. These are the quickest ways to build intuition for the cell types the plan names.

- Cell Type Explorer, one page per type with partners and regions: https://reiserlab.github.io/celltype-explorer-drosophila-male-cns/ (try `types/MN9.html`)
- Dimorphism Explorer, male-specific and dimorphic types by region and lineage: https://male-cns.janelia.org/build/dimorphism_overview/
- neuPrint, interactive connectivity queries; needs a free account: https://neuprint.janelia.org/?dataset=male-cns%3Av1.0&qt=findneurons
- Neuroglancer, the 3D volume and meshes: linked from https://male-cns.janelia.org/
- In Python: `neuprint-python` (needs a token) and `navis`. This project avoids both and reads the flat files, so nothing needs an account.

## What others have built

The community list `cobanov/awesome-fly` holds about 60 projects, most from the weeks after the MaleCNS release. They fall into three groups.

- **The connectome plays a human game:** Doom, Super Mario 64, Minecraft, Pong, chess, a fighting game, even options trading. FlyBrain's README names the problem with these: "arbitrary, complex discrete controls completely alien to insect physiology". The wiring is a reservoir with an adapter bolted on, and little is learned about the fly.
- **The fly does fly things:** desktop pets, terrariums, fly-escape, FlyBrain, flyverse. These teach more, and the careful ones publish what failed.
- **Research models:** Shiu's brain model, flybody, NeuroMechFly, flyvis, and fast simulators.

Nearest to the user's two whims: Fruit Fly Fashion makes reproducible art from spike vectors, Faiku makes the mushroom body trace haiku, Fly Lab drives Ableton from motor circuits, Infinite Sugar keeps a fly in a terrarium with its sweet neurons permanently on. None builds play out of sweet against bitter, none touches grooming as a tested circuit, and none makes silencing a cell type the player's main verb. That is the open ground this plan takes.

## Sources

| Source | Link |
|---|---|
| Janelia project page | https://www.janelia.org/project-team/flyem/male-cns-connectome |
| MaleCNS site and downloads | https://male-cns.janelia.org/ · https://male-cns.janelia.org/download/ |
| Google Research blog | https://research.google/blog/a-connectomics-milestone-mapping-the-complete-male-fruit-fly-brain/ |
| Google Keyword blog | https://blog.google/innovation-and-ai/technology/research/male-fruit-fly-brain-map/ |
| Berg et al., *Cell* 2026 (main paper) | https://doi.org/10.1016/j.cell.2026.08.015 |
| Gustatory connectome, *Cell* 2026 | https://doi.org/10.1016/j.cell.2026.08.016 |
| Taste-feeding connectome preprint | https://www.biorxiv.org/content/10.1101/2025.08.25.671814v2 |
| Shiu et al., *Nature* 2024 (the LIF model) | https://pmc.ncbi.nlm.nih.gov/articles/PMC11446845/ · code https://github.com/philshiu/Drosophila_brain_model |
| Seeds et al. 2014 (grooming suppression hierarchy) | https://elifesciences.org/articles/02951 |
| Hampel et al. 2015 (antennal grooming command circuit) | https://elifesciences.org/articles/08758 |
| Guo et al. 2022 (DNg11, DNg12, aDN) | https://www.cell.com/current-biology/fulltext/S0960-9822(21)01742-5 |
| Eichler, Hampel et al. 2025 (head bristle mechanosensory connectome) | https://elifesciences.org/articles/108044 |
| 13A/13B inhibitory leg circuits, eLife 2025 | https://elifesciences.org/articles/106446 |
| Lee, Moon, Montell 2009 (caffeine needs Gr33a, Gr66a, Gr93a) | https://www.pnas.org/doi/10.1073/pnas.0811744106 |
| Community list | https://github.com/cobanov/awesome-fly |
| flyverse-core (taste on MaleCNS reproduced) | https://github.com/tel-0s/flyverse-core |
| webgpu-fly (whole brain in a browser, measured) | https://github.com/abgnydn/webgpu-fly |
| DesktopFly (neural decision, scripted animation) | https://github.com/DenisSergeevitch/desktop-fly |

## The model everyone builds on

Shiu et al. 2024: leaky integrate-and-fire with an exponential synapse, identical for every neuron.

```
dv/dt = (g - (v - V_rest)) / tau_m        dg/dt = -g / tau_syn        on presynaptic spike: g += w
V_rest = V_reset = -52 mV   V_th = -45 mV   tau_m = 20 ms   tau_syn = 5 ms
refractory = 2.2 ms   synaptic delay = 1.8 ms   w = sign * 0.275 mV * synapse_count   dt = 0.1 ms
```

`w` is the only free parameter, set so 100 Hz sugar input gives about 80% of the maximum MN9 rate. Acetylcholine excites; GABA and glutamate inhibit. Input is Poisson spike trains on chosen sensory neurons. **There is no background noise and no basal firing.**

It was tested against experiments on exactly two behaviours: feeding initiation (sugar and water taste neurons drive the proboscis motor neuron MN9; bitter and Ir94e taste neurons inhibit it) and antennal grooming (Johnston's-organ mechanosensors → aBN1/aBN2 → aDN1/aDN2). 91% of 164 testable predictions were right. With shuffled weights MN9 activated in 1 of 100 runs; with the real wiring, 100 of 100. The bitter-inhibits result disappears if glutamate is treated as excitatory.

Stated limits: no gap junctions, no graded (non-spiking) neurons, no neuromodulation or internal state, absolute firing rates not trustworthy, inhibition onto a silent neuron does nothing.

Four details of the authors' `model.py`, read directly, that the paper's summary does not mention and that an honest replication must copy: both `v` and `g` are frozen while a neuron is refractory (arriving input still accumulates); a spike resets `g` to zero as well as `v`; a neuron receiving Poisson input has its refractory period set to zero; and each Poisson event adds 250 × `w` to `v`, which forces a spike. Integration is Brian2's exact `linear` method at its default 0.1 ms step. Silencing zeroes a neuron's outgoing weights.

## Findings and what they force

| Evidence owner | Finding | Consequence for this project |
|---|---|---|
| Shiu 2024; flyverse-core README | Sugar → MN9 with bitter suppression is the best-validated computation in fly connectome modelling, and it reproduces on MaleCNS ("MN9 goes 139.9 Hz → 0.8 Hz" when bitter is added). | Taste is the anchor. It is the first circuit tested and the first thing playable. |
| Lee et al. 2009 | Caffeine, and theophylline from tea, are detected by bitter taste neurons (Gr33a, Gr66a, Gr93a) and suppress proboscis extension. | "Matcha is bitter to a fly" is a true statement, not a metaphor. Sweet-before-bitter is the game's core tension. |
| Cell type explorer (checked by hand) | `MN9`, `DNg11`, `DNg12_a`, `IN13A001`, `LB1a`, `LB3a`, `LB3d`, `BM_Taste`, `GNG015`, `GNG095`, `DNge062` exist. `DNg12`, `aDN1`, `aBN1`, `Usnea`, `Fdg` do **not** exist as type names. | Literature names and FlyWire nicknames do not map onto MaleCNS `type` strings. A name census against the annotation file comes before any circuit design. |
| Eichler, Hampel et al. 2025 | `BM-Taste` neurons are **mechanosensory** neurons of the labellar taste bristles. Activating them elicits proboscis grooming. | `../fly-escape/scripts/connectome/artifact.py:86` folds 16 `BM_Taste` bodies into its `taste` group, and its spike notes (`../fly-escape/specs/done/help-the-fly-escape/spikes/SPIKE_LEARNINGS.md:607`) call them "Broad taste". That is touch, not taste. Never infer function from a name; the census records the evidence for every group. |
| Seeds 2014; Eichler 2025 | Dusting a fly elicits grooming in a fixed priority (eyes, antennae, abdomen, wings, thorax). Head bristle mechanosensors feed a somatotopic second-order population. The eye bristle type, written `BM-InOm` in the papers and `BM_InOm` in MaleCNS, has 745 neurons there (405 right, 340 left), checked on the explorer. | Matcha powder is dust. A puff of matcha on the fly is a real experimental paradigm with a known input population. |
| Guo 2022; eLife 106446 | DNg11 → front-leg rubbing; DNg12 → leg rubbing alternating with head sweeps; aDN → antennal sweeps. 13A/13B GABAergic premotor neurons form reciprocal inhibition onto tibia flexor/extensor motor neurons. Rhythm is 7–8 Hz. The published model that oscillates is **rate-based** with proprioceptive feedback, and the authors say how tonic descending drive becomes rhythm "remains unclear". | Whisking and knitting are the same primitive: alternating front-leg rhythm. It is the riskiest circuit. It gets a time-boxed spike and a labelled scripted fallback. It never blocks the game. |
| `../FlyBrain/fly/README.md` | "a narrow strip between switching off and convulsing"; above weight scale 0.1 recurrence drowns the signal; one measured point "would have given 25.6× and looked like a success, when it was actually on the slope of the cliff". | Every pass criterion needs a plateau across parameter values, several seeds, and a size-matched random control, written down before the run. |
| `../FlyBrain/fly/README.md` | Worked: short spiking chains with massive convergence (311 LC4/LPLC2 neurons, >11,000 synapses → giant fibre). Failed: DNa02 steering (two neurons), the optic lobe (graded, disinhibition-based, "0 Hz in every combination"), VNC rhythm in LIF (×3 gain self-ignites), dopamine learning ("the control kills it"; punishment "has no lever"). | Prefer many-to-few convergent reflexes. No vision. No steering from the brain in v1. Learning is a late, explicitly uncertain slice. |
| `../FlyBrain/fly/README.md` | "today the connectome does more or less what `if looming > threshold: dodge()` would do. We did not compare it against that rule." | Every shipped circuit is compared with the one-line rule it might reduce to, and the result is shown to the player. |
| `../FlyBrain/fly/red.py` | Full 164,506-neuron event-driven LIF in NumPy/SciPy: 0.7 ms per 0.5 ms step at ~1% activity. | Whole-brain experiments run on this laptop in seconds to minutes. No GPU, no Rust needed for the lab. |
| webgpu-fly README | 139k-neuron brain in a browser via WebGPU: 0.25× real time on an M2 Pro; hand-written multicore Rust 0.45×. | Whole-brain live in the browser is not a v1 option. Ship a small verified subgraph. |
| `../fly-escape/scripts/reference/`, `crates/sim/tests/reference.rs` | A Python oracle writes fixtures from its real intermediates; the production engine must match them (spikes exactly, floats to 1e-12). | Same pattern here: Python is the oracle, the browser engine is proven against fixtures. |
| `../fly-escape/scripts/connectome/` | Streamed, checksum-verified download; `FLYGRAPH` CSR binary; manifest with hashes, exporter hash, body IDs per group, `synthetic:false` guard. | Reuse the shape of this pipeline and the manifest idea. |
| `../fly-escape/specs/done/help-the-fly-escape/CONTRACTS.md` | "mean voltage tonically above the provisional gate even without taste; use emitted spikes for discrete feeding". | Decode behaviour from spikes, never from membrane voltage. |
| `../fly-escape/README.md` | "Biology → simulation → observed behavior → game design. We build the game around the behavior we discover." | Adopted as this project's first rule. |
| `../FlyBrain/web/src/cerebro.ts`, `neuroestimulador.ts` | The Neuro-Lab sequencer and dance modes light up random points in bounding boxes and show `Math.floor(... * random)` as spike counts. | The temptation is real. Here, nothing on screen may look like neural activity unless it is. Scripted things wear a "scripted" tag. |
| DesktopFly README | Grooming *decision* from DNg11 firing; grooming *animation* scripted; says so. | The honest fallback pattern for whisking. |
| `../fly-escape/specs/done/help-the-fly-escape/assets/evidence/04/feeding-feasibility.md` | "Every taste gain produces the same feeding-start counts, mode occupancy, and final reserve as the matched zero-current baseline." | fly-escape's taste pathway never worked. It is a cautionary tale about binding by name, not a precedent to copy. |
| `../fly-escape/scripts/connectome/extract.py:39` against `../FlyBrain/fly/red.py:62` | A neuron with no transmitter label gets sign +1 in fly-escape and 0 in FlyBrain. Neither project notes the disagreement. | The taste law must hold under both policies (slice 05, criterion P6). |
| The model's own constants (membrane 20 ms, synapse 5 ms); raised by planning draft B | Nothing in the model outlasts a few time constants, about 50 ms. | Order, satiety and habituation cannot emerge. The ceremony's sequence is staged and says so. |

## Name census

Slice 01 replaced the hand-checked starter table that stood here. The generated census is `circuits/taste.census.html` in the repository, rebuilt by `python -m flylab census taste`; a copy of the accepted run is in `assets/evidence/01/`. What it established, all first-hand from the annotation file and from the taste-feeding preprint read through Europe PMC's open copy (https://europepmc.org/article/PPR/PPR1072256):

- **Bitter is `LB1a` to `LB1d`, 38 neurons.** The bitter receptor line Gr33a-GAL4 was matched to them by morphology. `LB1e`, 19 neurons, matches Ir94e and is a separate aversive group.
- **Sweet is `LB3b` and `LB3c`, 34 neurons.** Both matched the sugar line Gr64f-GAL4. `LB3b` also matches the low-salt line Ir56b, in cells known to express sugar receptors too, so the two readings name the same neurons. These are the authors' proposals from shape matching, not recordings.
- **`LB3a` is water (17). `LB3d` is aversive, high salt and heavy metals (26), despite its name.** The paper calls `LB3d` glutamatergic, which would make it inhibitory here; the dataset's per-neuron transmitter predictions for it are split and the consensus is acetylcholine. Its sign is in doubt, so it is not an ingredient.
- **`LB2a–d`, `LB4a–b` and one neuron typed plain `LB3` have no assigned taste** (31 neurons).
- **The 165.** There are exactly 165 labellar bristle taste neurons, across 16 types and every modality. Another project's "165 labellar sugar GRNs" is that whole population.
- **Six bitter neurons are mute in the base model.** All of `LB1b` has transmitter `unclear`, so its outputs carry sign 0. The same is true of `LB2b`, `LB2d` and the lone `LB3`. This is what slice 05's second arm, unknown sign +1, will change.
  - **Looked at again on 2026-09-19, at the user's request.** They are the whole type: three left, three right, labellar bristle, entering by the maxillary-labial nerve. "Unclear" is not "no data": each has 306 to 417 transmitter predictions. Per neuron the top call is acetylcholine for three (0.52, 0.59, 0.68), serotonin for two (0.51, 0.53) and unclear for one; the type-level call is unclear at 0.49, just under the cut of 0.5 that the table appears to use. Those two serotonin calls are the only ones among all 1,416 typed gustatory neurons. The classifier's own paper (Eckstein et al. 2024) reports that first-order sensory neurons were often mispredicted as serotonin where acetylcholine was right, and serotonin is its least reliable class; no gustatory neuron has ground truth in this release. Unclear runs at 18% among gustatory neurons against 1.4% among non-sensory ones. Taste neurons are cholinergic wherever it was measured: ChAT labels gustatory afferents, and Jaeger et al. 2018 show a ChAT-positive bitter neuron in the S-a bristles and no VGlut in bitter, sweet or water neurons. So the likeliest truth is acetylcholine, and the label is a known weak spot of the classifier. Which bitter bristle class `LB1b` is has not been stated anywhere we could read; it is bitter by the group's match to Gr33a, not by recording. The published model (Shiu et al. 2024) has no unknown class and would have made these six excitatory. Slice 05 gains a narrow arm for it. Full report: `assets/evidence/v1/research-2026-09-19.md`.
- **Feet.** `LgLG4`, 43 neurons on all six legs, matched Gr64f and Ir56b: the sweet taste of the feet, for branch B4. 463 leg neurons carry a pheromone receptor type (`putative_ppk23`, `putative_ppk25`, `putative_IR52b`), for branch B6.
- **MN9 is rostrum protraction,** one per side, acetylcholine. The paper names the rest of the drinking sequence: `MN4a` haustellum extension, `MN6` labellar extension, `MN8` labellar spreading, `MN11` pharyngeal pumping, `CEM` crop entry.
- **The `synonyms` column resolves the published nicknames,** with citations: Usnea is `GNG175`, Phantom `GNG229`, Rattle `GNG132`, G2N-1 `GNG232`, Clavicle `ANXXX462a`, Fudog `DNg67`, Roundtree `GNG120`, and the antennal grooming neurons aDN1 and aDN2 are `DNg62` and `DNge078`. `aBN1` and `aBN2` appear nowhere. Plain `aDN` resolves to a male-specific courtship neuron from another literature, a second name collision.
- **`DNg11` is all GABA,** six of six, which supports treating it as a name collision. `DNg12` is eight subtypes, `_a` to `_h`.
- **Johnston's organ types use hyphens** (`JO-FV`, `JO-CM`, 672 neurons in 34 types), and 65 of them, mostly `JO-FV`, carry the annotation subclass `grooming`: a second input candidate for branch B2 beside the 745 eye bristle sensors `BM_InOm`.
- **No taste neuron and none of the 43 cited relay neurons carries a dimorphism flag.** The dataset's headline, seen on this circuit.
- Mushroom body, for branch B5: 4,064 Kenyon cells, 97 output neurons, 316 PAM and 16 PPL1 dopamine neurons.
- The annotation table has 211,577 bodies, 164,506 of them typed, which is the neuron count FlyBrain built its graph from.

## He moves: what the dataset holds (2026-09-19)

Looked up when the user asked whether his legs could be moved through his own neurons, and his brain made to react.

- **Leg motor neurons: 373 typed, every one with a cell body position, so all of them are in the cloud.** 133 front, 116 middle, 124 hind, in neuromeres T1 to T3. Most are named for their muscle (`Ti flexor MN`, `Tr flexor MN`, `Tergopleural/Pleural promotor MN`, …); 24 middle-leg and 21 hind-leg ones carry serial names only. Bound pool by pool in `circuits/legs.circuit.json` (53 roles, facts only). What each muscle does comes from papers and is in `slices/v3-he-moves.md`: trochanter **flexion lifts** the leg, and the front leg's knee flexes in stance.
- **Leg sensory neurons: 3,565 enter by the leg nerves, none with a position.** 1,690 touch bristles, 758 leg taste bristles, 392 chordotonal, 124 other proprioceptive, 78 hair plate. Claw, hook and club neurons are labelled by synonym only in the hind legs (33 neurons); elsewhere the split is by type and is ours.
- **Bound 2026-09-20 for slice V3:** hook (`SNpp39`, `SNpp41`) and claw (`SNpp50`, `SNpp51`) neurons by type, class, subclass (chordotonal organ) and leg nerve: front 10 and 5, middle 28 and 39, hind 22 and 47. Three more rows of these types are subclassed only "leg" and one is of class unknown_sensory; they are not bound. The dataset's synonyms call only a few of each type hook or claw (SNpp39 2 of 39, SNpp41 3 of 22, SNpp50 12 of 62, SNpp51 1 of 32), all in the hind legs. The front leg nerve holds 36 typed chordotonal neurons against 163 and 193, so the front legs' answer in the model is small for a reason that is the reconstruction's. `SNpp17`, `18` and `22` enter by the prothoracic chordotonal nerve and carry Gorko et al. 2024 synonyms: they are not leg joint sensors and are left alone.
- **Descending neurons: 1,310, of which 1,304 are placed.** `MDN` (4, backward walking) is the best-evidenced command neuron here. `DNg12` is eight subtypes and only `DNg12_e` reaches the front legs. "aDN" collides with a courtship type.
- **He cannot tire** (choices N15): the model's whole state is two numbers and a refractory count per neuron, gone within about a tenth of a second.

## Still unknown

1. Resolved for the labellum and the feet by slice 01, from the paper (see the name census above). Still open: whether those assignments, made from shape, hold up as predicted signs in slice 05; and what the taste pegs and pharyngeal types sense.
2. Whether any grooming command neuron fires in a Shiu-style LIF when head bristle mechanosensors are driven. Nobody in the surveyed projects has tested it. Branch B2.
3. Whether tonic descending drive yields a 7–8 Hz front-leg rhythm in any model built from MaleCNS 13A/13B wiring. Branch B3.
4. Whether tarsal sweet taste reaches a locomotor-stop readout in the model. Branch B4.
5. Whether a subgraph built from ever-spiking neurons stays equivalent to the whole brain once the player starts silencing inhibitory cells. Slice 07.
6. Whether silencing cell types gives outcomes distinct enough to play with. Slice 06.
