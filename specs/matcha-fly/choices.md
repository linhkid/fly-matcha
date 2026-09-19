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

### N6. The project folder is called `fly-matcha`
**User decision, 2026-09-19.** The user renamed the folder from `fly-sim-k`. Planning documents under `assets/planning/` keep the old name because they are history. The spec folder stays `specs/matcha-fly/`, and the internal names `flylab` and `FSKGRAPH` stay, because they name no theme and no folder.

- **Reach:** the lab package is now put on the path by a relative entry, so a further rename or move cannot break the import.
- The README's title, "Fly brews Matcha?", is the user's own, written on GitHub the same day. It stands as written.

### N7. A tea menu
**User decision, 2026-09-19.** The user asked for a menu of real matcha blends and supplied the list and tasting notes, kept in `assets/content/tea-menu.md`.

What the plan added around it is a planner decision: each tea is filed under one of three tiers, smooth, balanced or robust, guessed from the user's notes, and a tier with a number of scoops resolves to one of the five bitter levels the codec already has. The menu therefore adds content and no new trial, circuit or slice. Tier assignments are tagged `staged`, and the interface says plainly that a fly tastes only the bitterness: aroma, umami and nuttiness are not in the circuit.

- **Reach:** the codec gains a `menu` block in slice 05; the bench, a puzzle and the tea room use it.
- **Reversal:** move a tea to another tier, or change the table, in one file. No experiment depends on it.
- **Confidence:** high in the mechanism; low in any individual tier, which the user is better placed to judge.

### N8. A living view, with the neurons, from early on
**User decision, 2026-09-19.** "I want to visualize the fly brews matcha and also the neurons like in the Fly Brain or fly escape... not just taking a look at static html or terminal." The plan had parked a 3D scene and a brain cloud and put the first page at slice 06. Two slices were added instead of appended silently: V1, the scene with the whole brain drawn and dark, and V2, the same scene lit by pilot recordings once slice 03 has built the graph. They displace the parked "3D room and soma cloud", which is now the plan.

This overrides the "flat art" part of N2. The rest of N2 stands: a browser toy plus a Python lab, one fly.

- **Reach:** the `web/` package arrives before the taste law is tested, so V2 shows recordings and draws no conclusions. Slices 06, 09 and 12 become layers on one page instead of separate pages.
- **Cost:** npm packages, about 200 MB on disk, which need the user's yes; and, for light, the 508 MB of slice 03.
- **Confidence:** the decision is the user's. Medium that V1 and V2 are the right cut of it.

### N9. By default he brews and tastes forever, and there is a pause
**User decision, 2026-09-19.** "make a pause brewing, by default it will brew and taste infinitely." The default state of the app is an endless loop over the sips of the grid. Pausing opens the player's tools.

This changes N4's emphasis, not its substance: play is still made of one-second trials replayed slowly, and doses are still whole pieces and scoops. What changes is who chooses the next sip when nobody is touching anything.

- **Reach:** the loop is a fixed rotation, not random, so a build always shows the same sequence; while only recordings exist, it replays them. Bets, silencing and composing a sip happen while paused.
- **Confidence:** the decision is the user's.

### N10. A pause is a break with a book, not a freeze
**User decision, 2026-09-19.** "When hit pause, it should not stop but the fly can take a break and read a Dostoevsky book." Pausing holds the ceremony's clock and nothing else. He puts down what he holds, goes to his cushion and reads, and the cloud keeps turning. Six titles, one per sip in turn, printed on the cover; the card says what he reads and his words are about the book.

- **Reach:** `onBreak()` in `web/src/view/puppet.ts` may only put things down, and a test holds it to that: no tea appears, is drunk or is spilled by a break. Only titles are used. No line of any book, or of any translation, is quoted. The break is puppetry and is tagged `staged` like the rest of his words.
- **Confidence:** the decision is the user's. Which titles, and what he says about them, are mine and easy to change.

### N11. Tasting is deliberate, and how long he stays varies
**User decision, 2026-09-19.** "make it quite deliberately when at the stage of sipping/drinking. I want him to fully enjoy, so the time he spends on tasting/drinking can vary." Tasting became the long phase: he looks, lowers his head slowly, stays with his lips on the tea, comes up slowly. The stay is 8 to 14 seconds and never the same twice running.

How I read it, and where I stopped: a fly that visibly enjoys one tea more than another is a verdict, and rules 1 and 2 give verdicts to the model. So the variation is built now and its cause is handed over in two steps. In V1 the time comes from a fixed list that ignores the tea on purpose (seven times against a cycle of twenty-five sips, so every sip meets every time), the card says so, and he touches the tea without drinking it. From V2 the time is set by the recording: he stays while his brain keeps MN9 firing. From slice 05, if the taste law passes, the proboscis comes out and the cup drains while it does. Then "he enjoys it" means something that was computed.

- **Reach:** `Loop` takes how long each phase of each sip lasts; `pose()` stretches the stay and never the coming and going. V2 and 05 carry the hand-over.
- **Reversal:** if the user wants him to drink and savour right now, before any recording exists, that is staged drinking. It can be done and tagged `staged`, but it would be the first thing on screen that looks like a decision and is not one. I would rather get slice 03's 508 MB approved and make it real.
- **Confidence:** high that this is the honest version; medium that it is what the user pictured. Ask.

### N12. Fold the text away, stage as little as possible, and make the fly lifelike
**User decision, 2026-09-19.** "Make the HUD/text screen collapsible: it's obscuring the scene. Try your best to not STAGED things, make it as real as possible for the fly. I want to see real interactions. Make the fly more beautiful and detailed, more real with movements."

What was done at once: every panel folds, and `H` hides all text; the fly was rebuilt with joints, a gait and idle movements; and the one layer of his nervous system that needs no wiring went live, the spikes a sip forces in his taste neurons (choices K9).

What "real" still needs, said plainly to the user: everything behind his lips needs the 508 MB of connection weights (slice 03). With them, V2 replays what his whole brain does with each sip, his stay at the cup follows MN9, and slice 05 decides whether the proboscis may come out. Brewing tea can never be his: no fly brain does that, and the ceremony stays staged and says so, more quietly than before.

- **Reach:** the STAGED pill left the control bar; the card leads with what his brain did. The tags themselves stay, because rule 3 is the project's spine.
- **Confidence:** the decision is the user's. That a live input layer is the right first "real interaction" is mine.

### N13. No label on his lips, the magnified lips open, and crockery that looks like crockery
**User decision, 2026-09-19.** "Remove the dot dot dot taste neurons, on his lips. Make the his lips, magnified HUD to be displayed by default. Make the matcha cup and matcha bowl more real."

The pinned name under his mouth and the dotted leader from the panel to his mouth are gone. They had been added the same day on a reviewer's advice that the taste neurons could not be found (K10); the user prefers the scene clean, and the panel, now open by default, does that job. The thread from his head to the cloud stays until the user says otherwise. The bowl is a chawan thrown on a lathe: a cut foot ring of bare clay, a dark iron glaze that runs thin and rusty from the lip, a little out of round, with whisked matcha and its foam inside, a small serving as thin tea is. The cup stays glass on purpose, because his lips at the tea and the level of the tea must stay visible, but it is now a real glass: a thick base, a polished lip, a room mirrored in it. The camera stands higher, because a tea bowl is looked into.

- **Reach:** `web/src/view/crockery.ts`. The storage key for folded panels moved to `fly-matcha.folds.2` so the new default reaches a browser that remembered the old one.
- **Confidence:** the decision is the user's. Glass over ceramic for the cup is mine; say the word and it becomes a yunomi, at the price of hiding his lips.

### N15. "If he brews and goes on continuously, does he feel tired? I need to know that."
**User question, 2026-09-19, answered on the page.** No, and that is a limit of the model, not a trait of his. The model has no fatigue, no hunger, no memory and no learning (rule 7). It has no state that outlasts a trial: every bowl starts with every neuron at rest, and the same seed gives the same spikes, on the first bowl and on the thousandth. It lacks even the fast kinds of tiring that real neurons have: no spike-frequency adaptation, no synaptic depression, and nothing that stands in for energy or for neuromodulators. A real fly would tire in at least four ways: his taste neurons adapt within seconds, he habituates to a repeated stimulus, he fills up (stretch receptors and satiety signals turn sweet taste down), and sleep pressure builds. The connectome holds the wiring of the systems that do this. A wiring diagram holds no state, so none of it happens here. The title panel says so in plain words.

- **What it would take:** state variables that are ours, not the fly's: an adaptation current in the neuron model (a new model version, with its own fixtures), depression at synapses, a sleep or satiety variable. Each is a modelling decision that needs an experiment before it may change what he does. "A hunger or thirst knob" stays parked for the same reason: omitted rather than invented.
- **Confidence:** high.

### N14. Move him through his own neurons, and let his brain react to it
**User decision, 2026-09-19.** "We know fly cannot brew matcha, but can we force it to use his legs to lift and motions? so that it can show at the 'on the cloud' and in the brain image as well", and "if he moves, the neuron in his brain has to react to that too. clean, sift etc too."

Yes, in two honest ways, written up as slice V3. His 373 leg motor neurons sit in the cloud and are named for their muscles, so the puppet can be moved *through* them, labelled as driven by us, which shows at once in the nerve cord. And his own movement is a real stimulus to the 392 movement sensors of his legs, exactly as the tea is to his taste neurons; what his cord and brain make of that is the model's to compute, and it needs the wiring. The census of the leg pools was run the same day (`circuits/legs.circuit.json`), and the muscle-to-movement table was checked against papers before anything was built on a name.

- **What it cannot be:** his brain deciding to brew. A forced motor neuron is the experimenter's hand. The page will say "driven by us".
- **Blocked on:** the user's yes for 508 MB, for everything except the strings.
- **Confidence:** the decision is the user's; the two-route design is mine.

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

#### I10. Commits are the user's call
**Process decision.** The repository was initialised as the slice says, and no commit was made, because the user had asked for slice 01 and had not been asked about commits. The user then made the first commit themselves, `fcb42f6`. The same holds for later slices: finish the pass, report, offer the command.

- **Reach:** the experiment harness of slice 04 refuses an uncommitted prereg, so from slice 05 on a run needs a commit before its confirmation seeds. Ask at that point rather than committing silently.
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

### Slice 02, 2026-09-19. Least confident first.

#### J1. No JSON Schema files; fixtures of invalid trials are the contract instead
**Implementation decision.** The slice asked for JSON schemas of `TrialSpec` and `TrialRecording`. Nothing installed can validate against a schema, and a schema that nothing checks would be a second owner of what a valid trial is. `contracts/TRIAL.md` defines the format and an ordered table of refusal codes. `contracts/fixtures/trial/` holds one invalid spec for every way of being refused and one with two defects for every neighbouring pair of checks, which pins their order. Both validators, Python now and TypeScript later, are held to those. One rule came out of review: a number whose value is integral is an integer however it was written, because `JSON.parse` cannot tell `1.0` from `1`.

- **Reach:** the browser engine gets a hand-written validator, not a schema library.
- **Reversal:** slice 04 needs schemas for pre-registrations anyway. If the user approves a validator package then, trial schemas can be added and the fixtures kept.
- **Confidence:** medium-high.

#### J2. The cross-check against Brian2 was not run
**Process decision.** It is advisory in the slice, and installing Brian2 is a download nobody approved. One question stays open because of it: whether the published code frees a neuron on the 22nd or the 23rd step after a spike. Here a neuron that spikes at step s integrates again at s + 23. `contracts/MODEL.md` says so under "Not checked".

- **Reversal:** the user approves `brian2` in a separate environment; the check is a few small graphs with fixed input.
- **Confidence:** high that asking first is right; medium that the step count matches.

#### J3. The lock must learn each neuron's side
**Implementation decision, with a consequence for slice 03.** A drive can target the left or right members of a group, so an engine needs a side letter per neuron. The lock from slice 01 stores only counts per side. Trials and fixtures already use `{indices, sides}`; slice 03, which resolves the lock against the graph, must add per-body sides to the lock. The slice 03 file says so.

- **Confidence:** high.

#### J4. Sentinel spikes appear only as breach steps
**Implementation decision.** CONTRACTS.md said the spike hash covers non-sentinel neurons and was silent on the spike lists. A recording now leaves sentinel spikes out of the lists too and reports the steps at which any sentinel fired. A sentinel is a guard, not part of the brain being shown, and nothing on screen should glow for one.

- **Confidence:** medium-high.

#### J5. Fixtures carry their whole model, and three of them bend a constant
**Implementation decision.** A fixture embeds the model JSON it ran under, so an engine needs nothing else to check itself. To pin the strict comparison `v > vTh`, one fixture sets the threshold to the exact crest of a potential, which then never spikes, and its twin sets it one bit lower, which spikes at the crest and nowhere else. A third raises `snapEps` to show that snapping needs both variables small. These overrides exist only inside those fixtures.

- **Confidence:** high.

#### J6. Small things the contract now pins
**Implementation decisions.** The state hash covers the number of steps completed, not the index of the last step. Drives and silencing are refused once a simulation has taken a step, because an input neuron is one for the whole trial. A strong synapse in the fixtures is 6,000 contacts, the smallest round number that crosses threshold in the very step it arrives, so that a hop in a chain is exactly 18 steps.

- **Confidence:** high.

#### J7. Speed, and what is still unknown about it
**Implementation decision, delegated by the slice.** Which neurons a step must visit is collected in a boolean mask, which also yields them in ascending order; this replaced a per-step sort and made the oracle four times faster with identical results. One simulated second of a random graph with 160,000 neurons and 4 million edges takes 1.3 s when 1% of neurons carry state, 4.5 s at 13%, and about 75 s in a runaway regime where nine in ten neurons are active and thousands spike per step. The published model under taste input has a few hundred active neurons, which is the middle figure, but how many neurons carry subthreshold state in the real graph is not known until slice 03 builds it.

- **Reach:** slice 05 runs a few thousand whole-brain trials. At the middle figure that is about three hours on one core, and trials are independent, so they spread across ten. Slice 05 must time a pilot trial before it fixes its plan.
- **Levers if it is too slow, in order:** run trials in parallel; vectorise spike delivery, which only matters when hundreds of neurons spike per step; and only then a larger `snapEps`, which shortens how long a touched neuron stays restless but is a new model version.
- **Confidence:** high in the measurements; low in any budget until the real graph exists.

#### J8. Another tool's draft of this slice was set aside
**User decision, 2026-09-19.** When slice 02 began, the folder held a partial draft written minutes earlier by something other than this session. The user chose to set it aside. It is in `git stash` and was not used, apart from the observation that its three frozen constants were identical to the ones computed here. It had at least one contract bug, a refractory period of 21 steps.

- **Reversal:** `git stash show -p` to read it, `git stash drop` to discard it. The user's call.

### Slice V1, 2026-09-19. Least confident first.

#### K1. The brain stands upright, seen from below or above, and the axes were found by looking at the data
**Implementation decision, delegated by the slice.** The annotation table's positions have the long axis of the whole nervous system on `z`: the brain occupies the low third and the nerve cord the rest. Within the brain, low `y` is dorsal (the Kenyon cells sit at `y = -0.21`, the proboscis motor neurons near 0). I found this from the group positions, not from documentation. The cloud is drawn with `-z` up, so the brain is on top and the cord hangs below, the way whole-CNS figures are usually shown. Nothing but centring and one uniform scale is applied to the numbers in the file; the turn happens in the scene.

- **Reversal:** one line in `scene.ts`. If a published figure of MaleCNS shows another convention, follow it.
- **Confidence:** high in the axes, medium in the convention.

#### K2. The audit now refuses any bare number in the page's words
**Implementation decision.** The slice asked that the DOM audit find every quantity tagged. Checking that tagged spans carry the right tag does not find an untagged one. `audit()` now also fails on any number in the text outside a `data-q` span, with two ways out: `ref()` for a pointer that is not a claim about the fly (a year in a citation, a version, a slice number), and a digit inside a name such as `MN9`. It runs over every piece of HUD markup in the tests, for every phase of every sip and on a break, and over the live page in development, where a failure puts a red box on screen.

- **Reach:** every later slice that prints a number meets this test.
- **Confidence:** high. Known hole: it reads text, so a number inside a canvas or a tooltip attribute is not seen. The book cover is the only canvas and holds no number.

#### K3. Stills from the page's address, shot by the Chrome already installed
**Implementation decision.** The browser pane throttles a hidden tab, so an endless animation cannot be inspected through it reliably, and Playwright is a download nobody approved. `?sip=3&phase=taste&at=0.5` opens the page as a still of that moment (`&break=1`, `&staged=1`), everyone already in place. The evidence shots were taken by `/Applications/Google Chrome.app` run headless with a throwaway profile in the session's scratch folder. Nothing was downloaded or installed, and the user's own Chrome profile was not touched.

- **Reach:** the first slice that needs a browser *test*, not a shot, still needs Playwright and a yes.
- **Confidence:** high.

#### K4. Poses are data, in one pure file
**Implementation decision.** Everything a prop does is a number returned by `pose()`; `scene.ts` only places what it is told. The reason is honesty, not tidiness: the first draft drained the cup and removed the sweets while he tasted, which is a verdict nobody computed. Now the proboscis field has the type `0`, and tests hold the cup full and the sweets in place for every moment of tasting, check that no level jumps, and check that a break only puts things down.

- **Confidence:** high.

#### K5. Taste neurons sit on two lobes under his head, and once more, magnified, in a panel
**Implementation decision, delegated by the slice.** None of the 72 has a position, so they are drawn on the fly, left and right from the dataset, sweet above bitter, the six with no transmitter label as rings. Where a dot sits inside its lobe is ours and the panel says so. On the fly the dots are a few pixels, so the panel repeats them large. V2 must light both from `light()`.

#### K6. No UI framework; `@types/three` and `@types/node` came with the approved packages
**Implementation decision.** The page is one canvas and six small panels of markup built by pure functions, which is what lets the audit read them. The user approved vite, typescript, three and vitest; the two type packages were installed with them and are named here because they were not in the list I read out.

#### K7. The codec's writer was created here, without a decoder
**Implementation decision, from the slice.** `lab/flylab/codec/build.py` writes `contracts/codec/taste.codec.json` with the two channels, their five levels and the tea menu. Decoder thresholds are `null` until slice 05 has evidence for them. A fixture of all 140 sips binds the Python and the TypeScript reading of the menu.

#### K8. Group colours are flat and matte
**Implementation decision, delegated.** Brightness and bloom are kept for spikes. The named groups are drawn in mid-tone colours with plain blending, and the legend says that colour is membership, not activity.

#### K9. The browser engine began here, with the input layer
**Implementation decision.** `web/src/engine/prng.ts` and `input.ts` were written in V1, not slice 08, so that something real could happen on screen before slice 03's download. Rule 4 is kept: they are the browser engine's files, there is no second owner, and they are bound to the oracle by the published test vectors, every lane of the fixture, and all 21 driven fixtures. They matched on the first run. The seed of a bowl's trial is the bowl's number.

- **Reach:** slice 08 inherits two tested files. V2 must make sure a recording's taste-neuron spikes and this layer's agree for the same seed, or say why not (a taste neuron that receives synapses may fire more than it is forced to).
- **Confidence:** high.

#### K10. A fresh pair of eyes changed the page
**Implementation decision.** A reviewer who had not seen the work judged the accepted shots against the slice's one visual variable and found it half failed: the taste neurons could not be found, the cloud was never called a brain, group colours read as sparks, the card spoke of rates in the present tense while nothing touched his lips, "sip" implied he sips, a cup that emptied by itself implied he drank, and "the decision is not [puppetry]" implied a decision existed. All of it was fixed: pinned names on his brain, his nerve cord and his lips, a thread from his head to the cloud, a leader from the magnified lips to his mouth, round matte points, a glass cup, tenses, "bowl" for "sip", a cup visibly tipped out and sweets visibly carried off, and a footnote that says no decision has been computed. The second reviewer, for the code, could not run: the account's spending limit was reached. That review is still owed.

#### K11. The fly is a male, and he does not groom
**Implementation decision, delegated by the slice.** Tan thorax with its long bristles, red faceted eyes, three ocelli, antennae with aristae, a folded proboscis ending in the labellum where his lips are drawn, veined wings folded flat, halteres, six three-part legs, and the banded abdomen with the dark round tip of a male, because this connectome is a male's. He walks on an alternating tripod, turns before he walks, and idles the way flies do: head saccades, antennal twitches, wing flicks, breathing. Grooming was left out on purpose. It has a circuit of its own, and branch B2 wants that movement to be his brain's, not the puppeteer's.

#### K12. The code review that was owed, done by a workflow, and what it changed
**Implementation decision, 2026-09-19.** Three reviewers (honesty, correctness, engine and tests) and one adversarial verifier per finding. Twenty-two findings, fifteen verified, fourteen confirmed, one refuted. The important ones:

- **"Lips on the tea" had two owners.** The live layer went by the ceremony's clock, the puppet by its break blend, and for about 1.5 s after every break his taste neurons fired while he was still walking back. Now a break is the viewer's wish, the clock stays held until the stage reports him back at his work, and he shuts his book, walks, and only then picks things up. The live layer moved out of `main.ts` into `web/src/view/live.ts`, pure and tested; five one-token mutants of it had survived the old tests.
- **Staged time leaked into a number tagged `model`.** How long a trial runs is set by his staged stay, so `model.time` is now `staged`, derived from the stay and the slowdown, and the card says so. The list of stays grew from seven to eleven so that every *named serving*, not only every cell of the grid, meets every time.
- A line's tags are now read off its content instead of typed beside it. The legend printed points drawn under the name of a census count. The lips panel said "fires" where it meant "is forced to fire".
- A negative time step on the first frame turned him by a random angle. A missing cloud file was answered with the page itself. Space could not activate a focused button. A throwing frame died silently. `&open=` overwrote the viewer's saved panels.
- Tests that restated the code under test were pinned to literals; the engine refuses malformed and repeated body IDs; the browser's cloud reader is held to a five-point fixture written by the lab; the purity guard became an allow-list.

#### K13. The six "unlabelled" neurons are labelled: "unclear", and probably acetylcholine
**Implementation decision, from the user's question.** See RESEARCH.md. The page now says "the type LB1b, whose transmitter the dataset calls unclear". The base model is unchanged, because a sign is a version (rule 5): slice 05 gains a narrow arm, taste neurons called unclear take +1.

#### K14. He comes to the cup at an angle, and the tea stands a little over half way up the glass
**Implementation decision, on the second critic's advice.** Head-on, his face hid the glass and his lips. At 40 degrees the contact shows in profile. Matcha is a suspension, so the glass holds a solid green body, not a green skin on clear water, and above it the glass is clear so that his lips stay in sight. The whisk gained tines.
