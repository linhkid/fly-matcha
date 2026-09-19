# Choices ledger

The plan was written on 2026-09-18 while the user was away, so the usual interview did not happen. Every answer the interview would have produced is recorded here as a **planner decision standing in for a user answer**. None of those is a user quote. Decisions the user has since made are moved to the first section, with the date and their words. Entries are ordered least confident first: the top of the list is where the user is most likely to decide differently.

Each entry gives the **gap** the decision fills, its **reach** into later work, what is **provisionally in effect**, how to **reverse** it, and **confidence**, meaning confidence that the user would have made the same call.

The implementing agent appends its own entries below the line at the bottom as it fills gaps the slices leave open.

## Decided by the user

### N1. The theme is matcha, and knitting becomes a garnish
**User decision, 2026-09-19.** Shown the plan and the open decisions, the user answered: "go with matcha".

The user had offered two whims, a fly brewing matcha or a fly knitting, and said "I dont know". The plan recommended matcha, and the user took it.

Matcha has one step, tasting, that rests on the best-validated computation in fly connectome modelling: sugar drives the proboscis motor neuron MN9 and bitter suppresses it. Caffeine really is a bitter stimulus for flies, so the theme is true rather than painted on. Knitting has no such anchor. Its only biological handle is rhythmic alternating front-leg movement, which is the same circuit as whisking and the least likely to work. Knitting survives as the brain swatch (branch B1): a recorded second of spikes rendered as a knit chart.

- **Reach:** the name, the art, the copy, and the whole of slice 12.
- **Reversal, should the user ever change their mind:** slices 01–08 carry no theme at all; their names are `flylab` and `FSKGRAPH` on purpose. Theme enters as copy in 06, 09 and 11 and as the whole of 12. A knitting game would make the whisk-rhythm branch a blocking dependency.
- **Still open under this decision:** the answer settled the theme only. It was not an answer to N2–N5, and it was not an instruction to start building or to download anything.

## Needs the user

### N2. It is a browser toy plus a Python lab, one fly, flat art
Both reference projects are 3D browser games. This plan starts flatter: a lab where experiments run on the whole connectome and write reports, and a small web app with 2D placeholder art where one fly tastes what you serve.

- **Gap:** "something fun to play around and to understand this fruit fly brain" names no form.
- **Reach:** the stack and the art budget.
- **Provisional:** as above. **Reversal:** the engine and the artifact do not care what draws them. A 3D room can replace slice 12 later.
- **Confidence:** medium.

### N3. The browser engine is TypeScript, not Rust compiled to WebAssembly
Both references use Rust. Here the live circuit is a few thousand neurons with no per-neuron noise, which typed arrays in a Web Worker should handle. `wasm-pack` and `bun` are not installed on this machine; Node 26 and npm are. Two implementations of the neuron model exist either way, the Python oracle and a browser engine, so Rust would not remove the parity work.

- **Gap:** no stack was requested.
- **Reach:** slice 08 and everything that loads it.
- **Provisional:** TypeScript. No abstraction is built for a future swap. **Reversal:** one module, rewritten against the same fixtures and Worker messages, replacing the TypeScript engine outright. Trigger: slice 08 misses its speed floor after active-set work.
- **Confidence:** medium.

### N4. Play is a series of one-second trials with discrete doses, and the first playable is a quiz over recordings
The brief imagined live dials. The plan instead has the player compose a sip from whole pieces of sweet and whole scoops of matcha, bet, run one simulated second, and watch it back at a fiftieth of real speed. And before any of that exists, slice 06 ships a predict-then-reveal quiz over whole-brain recordings.

- **Gap:** nothing was said about how play should feel.
- **Reach:** the engine has no real-time pacer. The envelope in slice 07 is enumerable because doses are discrete. The first thing the user can play is recorded, not live.
- **Provisional:** as above. **Reversal:** continuous pouring is listed under Parked in the README. Promoting it adds a pacer to slice 08 and makes the envelope a sampled guarantee instead of an enumerated one.
- **Confidence:** medium. A taste decision is over in tens of milliseconds, so slow replay is where it can be seen; but the user may simply enjoy dials more.

### N5. Downloads wait for a yes, in two stages
58 MB in slice 01 (annotations and transmitter labels), about 500 MB in slice 03 (traced-only connection weights), and Playwright's browser in slice 06. Each is announced with names, source and sizes, in the session that runs it.

- **Confidence:** high that asking is right.

## Provisional, least certain first

### P1. The browser runs a verified slice of the brain, not the brain
With no background activity, a neuron that never spikes influences nothing. So the neurons that spike anywhere in the enumerated envelope, run as a subgraph, reproduce the whole brain exactly on those trials. Sentinel neurons on the boundary raise a flag if a trial escapes. The equivalence is a test (slice 07), not a hope.

- **Gap:** "understand this fruit fly brain" could be read as wanting all 166,000 neurons live.
- **Reach:** the player can silence or drive only the cell types inside the envelope, one at a time. Anything else is answered from recordings and tagged so.
- **Provisional:** live subgraph for play; whole-brain runs stay in the lab. **Reversal:** none needed. A whole-brain live engine would be a different project; it has been measured at 0.25× real time in a browser.
- **Confidence:** medium-high.

### P2. The published formulation, not FlyBrain's
Poisson spikes on sensory neurons, zero background noise, published constants, one free weight. FlyBrain instead injects current and adds Gaussian noise to all 164,506 neurons, which creates its narrow band between silence and seizure and costs a random draw per neuron per step.

- **Reach:** absolute firing rates are not meaningful, only comparisons. Circuits that rely on tonic activity will look dead. Hunger cannot come from the wiring.
- **Reversal:** noise would be a new model version, run through the same experiments.
- **Confidence:** high for taste and grooming commands, which is what the formulation was validated on.

### P3. Whisking is allowed to be staged
If branch B3 finds no model of the front-leg wiring that alternates at 7–8 Hz, the fly's neurons decide at most whether and when he whisks, and the motion is an animation tagged `staged`.

- **Reach:** the most charming step of the ceremony may not be neural. The experiment's report ships either way.
- **Confidence:** medium. The user may want to push harder on the rhythm. That is a research project of its own.

### P4. One `web/` package, not a workspace
Seams inside it are enforced by an import-boundary test. One draft wanted six packages.

- **Reversal:** extract packages when a second app appears.
- **Confidence:** medium-high.

### P5. The fly does not see, steer or walk by its own brain in v1
The optic lobe and brain-driven steering failed in every spiking model surveyed. Getting to the bowl is staged and tagged so.

- **Confidence:** high.

### P6. Signs, thresholds and files follow the reference projects, with one arm added
Glutamate inhibits. Dopamine, octopamine and serotonin outputs are zeroed. Edges under 5 synapses are dropped. Self-edges are dropped as likely segmentation artefacts. The traced-only weights file is used. A neuron with no transmitter label gets sign 0, as in FlyBrain; fly-escape gives it +1, and neither project notes the disagreement, so slice 05 requires the taste law to hold under both.

- **Reach:** the first matters most. The original paper reports that bitter suppression disappears if glutamate excites.
- **Reversal:** sign policy is a model parameter; threshold and file are recorded in the graph manifest. Each is a version, and re-runs what depends on it.
- **Confidence:** high.

### P7. Python via `venv` and pinned `pip`
`uv` is not installed; Python 3.13 from miniconda is.

- **Confidence:** high, and trivial to change.

### P8. The male-only circuits are a branch, not the trunk
What only this dataset can show is sex. Branch B6 has a no-risk part (how few dimorphic types sit on the taste path) and an uncertain part (does activating the song neuron `pIP10` drive wing motor neurons). It is off the trunk because nothing else depends on it.

- **Confidence:** medium. A user who cares most about what is new in this connectome might want it before the tea room.

### P9. The spec workflow skills are borrowed, not installed
`write-spec`, `implement-spec`, `close-spec`, `screenshot-critique`, `compare-screenshots` and `preview-shots` were available while planning only because `../fly-escape` was attached as an extra working directory; they live in that repo's `.agents/skills`. Slices name them as gates. A session without that directory attached will not have them and must do the gate by hand, with a fresh subagent that has not seen the work, or attach the directory.

- **Confidence:** high that this is worth writing down.

### P10. All four planning drafts came from one model family
The planning workflow asks for a second family. It was skipped, because that would have sent the user's project to another vendor's service without asking.

- **Reversal:** the user can ask for a review of this spec by another agent at any time.
- **Confidence:** high.

---

## Implementation choices (append below)

### Slice 01, 2026-09-19. Least confident first.

#### I1. Sweet is `LB3b` and `LB3c` together, 34 neurons
**Implementation decision.** The taste-feeding preprint matches the sugar receptor line to both types, and the low-salt line to `LB3b` as well, in cells known to carry sugar receptors too. One planning draft had suggested `LB3c` as the primary sweet group with `LB3b` held back.

- **Gap:** the slice listed `LB3b` as "possibly" sweet and asked for the paper to settle it.
- **Reach:** the sweet dial in slice 05 drives 34 neurons, not 23. Low salt cannot become a separate ingredient later without splitting this group.
- **Provisional:** both types. **Reversal:** one line in `circuits/taste.circuit.json`, then rerun anything that used the lock.
- **Confidence:** medium. The paper says "likely", and its evidence is shape matching, not recording.

#### I2. The gating evidence is a preprint, read through an open copy
**Implementation decision.** The Cell paper and bioRxiv refused automated reads. The roles cite the bioRxiv preprint, read in full through Europe PMC (PPR1072256). Claims in the circuit file are paraphrased, with section and figure pointers, not quoted.

- **Reach:** if the published version changed an assignment, the census does not know.
- **Reversal:** the user, who can open the Cell paper, checks Figure 2 against the three required roles.
- **Confidence:** medium-high.

#### I3. Bitter is `LB1a` to `LB1d`; `LB1e` and `LB3d` are separate aversive groups
**Implementation decision.** The paper calls LB1 "a broad aversive type" with `LB1e` (Ir94e) as its fifth subtype. The published brain model treated bitter and Ir94e as two populations, so the census does too. `LB3d` is high salt and heavy metals, aversive despite its name, and its transmitter is disputed between the paper (glutamate) and the dataset's consensus (acetylcholine), so it is flagged and kept out of every ingredient.

- **Reach:** the matcha dial drives 38 neurons, of which the six `LB1b` cells are mute in the base model because their transmitter is `unclear`.
- **Confidence:** medium-high.

#### I4. Two informational counts were set from the data
**Implementation decision.** I guessed 32 unassigned labellar neurons and 600 to 800 pheromone-tasting leg neurons. The census found 31 and 463 and refused both. The expectations now hold the observed values. They exist to catch drift if the dataset changes; they are not claims, and neither role gates anything.

- **Confidence:** high.

#### I5. One report and one lock per circuit
**Implementation decision.** The slice named `circuits/census.html`. Branch B2 will add a second circuit, so the files are `circuits/taste.census.html` and `circuits/taste.lock.json`. The slice and CONTRACTS.md were updated.

- **Confidence:** high.

#### I6. A neuron's side comes from `somaSide`, then `rootSide`, and nothing else
**Implementation decision.** CONTRACTS.md said the entry nerve's suffix. In the data `entryNerve` has no side, all 165 labellar taste neurons lack `somaSide`, and `rootSide` has it. A first version also read the `_L`/`_R` suffix of `instance`; review showed that tier changed nothing in this circuit and only re-sided 18 neurons whose soma is annotated as midline, so it was removed. CONTRACTS.md was corrected.

- **Confidence:** high.

#### I7. No schema library and no editable install
**Implementation decision.** The user approved six named packages. A JSON Schema validator and the build tooling an editable install would fetch were not among them. The circuit file is checked by a short hand-written validator, and `flylab` reaches the path through a `.pth` file that `make venv` writes.

- **Reversal:** slice 04 needs real schemas. Ask for `jsonschema` then.
- **Confidence:** high.

#### I8. A failing census deletes the old lock
**Implementation decision.** The slice said a required failure "writes no lock". A lock left over from an earlier good run would sit beside a failing report and be used by mistake, so it is removed.

- **Confidence:** high.

#### I9. Wing taste neurons and the unassigned leg types are not roles
**Implementation decision.** Nothing in the plan uses them. They appear in the report's inventory table and nowhere else.

- **Confidence:** high.

#### I10. Nothing is committed
**Process decision.** The repository was initialised as the slice says. No commit was made, because the user asked for slice 01 and was not asked about commits. The evidence folder records "uncommitted" where a commit hash would go.

- **Reversal:** one command, given in the hand-back.
- **Confidence:** high that asking first is right.

#### I11. The census binds typed bodies only, and knows eight transmitter labels
**Implementation decision, from review.** The graph of slice 03 drops untyped bodies, so a lock that named one would point at nothing; two untyped front-leg motor bodies were being bound. The source's `unclear` label and a missing prediction both become `unknown`, the only word the model's sign policy has for them. Both rules are now in CONTRACTS.md.

- **Confidence:** high.

#### I12. The command exits non-zero whenever the census gate fails
**Implementation decision, from review.** The slice asked for a non-zero exit when a required role fails. The command now also exits non-zero when every role binds but the gate fails, for example a required role resting on a cross-match alone, so that `make` and later slices cannot build on it by accident. The lock is still written in that case, because the bindings themselves are sound.

- **Confidence:** medium-high.

#### I13. `DNg12` is filed as a name match, and courtship neurons are selected by `mAL_m`
**Implementation decision, from review.** The link between the MaleCNS `DNg12_*` types and the grooming neuron of the papers rests on the shared name, so its evidence kind is `crosswalk` with a flag. `^mAL` swept in 61 neurons with no fruitless mark; `^mAL_m` selects the 98 the annotations call `fru_high` and male-specific. Neither role gates anything.

- **Confidence:** high.
