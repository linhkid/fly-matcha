# Matcha Fly

Host a tea ceremony for one simulated male fruit fly. You compose each sip from pieces of sweet and scoops of matcha. A spiking model running on the fly's real MaleCNS taste wiring decides whether the proboscis comes out. Then you open the brain, bet on what a cell type does, silence it, rerun the same second, and find out. A Python lab runs the same model on the whole connectome, with controls, and it is the only place where a mechanic can earn the right to ship.

A fly cannot brew tea or knit. It can taste, refuse bitterness, and clean dust off itself with a whisking motion of its front legs. The project is built from what it can do. The knitting survives as a swatch: any recorded second of brain activity, rendered as a knit chart.

## Next Agent Prompt

**Status, 2026-09-19:** slice 01 is done and its census gate passed. The user chose the theme, matcha (choices N1), and approved two downloads: the Python packages and the 58 MB stage A files. Nothing else is approved. The repository is initialised and **nothing is committed**, because the user was not asked about commits; ask before the first one, then record its hash in `assets/evidence/01/README.md`.

**You are picking up at slice 02**, which needs no data: read [CONTRACTS.md](CONTRACTS.md), then [slices/02-model-oracle.md](slices/02-model-oracle.md). Slice 03 is also unblocked by slice 01 but downloads 508 MB and needs the user's yes first. Read [choices.md](choices.md) before you make any decision the slices leave open, and append to it when you do.

What slice 01 established is in [RESEARCH.md](RESEARCH.md) under "Name census" and in `circuits/taste.census.html`. The short version: bitter is `LB1a–d` (38 neurons, six of them mute in the base model), sweet is `LB3b` and `LB3c` (34), `MN9` is one per side, and the published relay nicknames resolve through the annotation file's `synonyms` column.

**Warnings.**
1. The plan was written while the user was away. The user has since decided N1: the theme is matcha. Entries N2–N5 in `choices.md` are still planner decisions standing in for the user's answers. If the user is present, confirm N4 (how play feels) before slice 06 and N3 (engine language) before slice 08. Slices 01–05 depend on neither. The user's choice of theme was not an instruction to start building or to download anything.
2. Slice 03 downloads 508 MB of connection weights. Any new Python package, npm packages, and Playwright's browser in the first web slice are downloads too. Show names, source and sizes and get the user's yes in your session before each. The Python packages in `lab/requirements.txt` are installed and approved, so slices 02 and 04 can run now; the fixture half of 08 needs npm packages and therefore a yes.
3. The gates named in the slices (`screenshot-critique`, `compare-screenshots`, `preview-shots`) are skills that live in `../fly-escape/.agents/skills`. They load only when that directory is attached to your session. Without them, do the gate by hand with a fresh subagent that has not seen your work.
4. Do not tune anything until an experiment passes. A failed experiment is a result. Write it down, follow the slice's fallback, move on.

**Trunk checklist**
- [x] 01 ground and census → [slices/01](slices/01-ground-and-census.md). Gate passed 2026-09-19; evidence in `assets/evidence/01/`
- [ ] 02 model and oracle → [slices/02](slices/02-model-oracle.md)
- [ ] 03 full graph → [slices/03](slices/03-full-graph.md)
- [ ] 04 experiment harness → [slices/04](slices/04-experiment-harness.md)
- [ ] 05 taste law, the concept gate → [slices/05](slices/05-taste-law.md)
- [ ] 06 lesion atlas, the product gate and first playable → [slices/06](slices/06-lesion-atlas.md)
- [ ] 07 envelope and browser artifact, the architecture gate → [slices/07](slices/07-envelope-artifact.md)
- [ ] 08 TypeScript engine → [slices/08](slices/08-ts-engine.md)
- [ ] 09 taste bench, first live playable → [slices/09](slices/09-taste-bench.md)
- [ ] 10 circuit scope → [slices/10](slices/10-circuit-scope.md)
- [ ] 11 puzzles and journal → [slices/11](slices/11-puzzles-and-journal.md)
- [ ] 12 tea room → [slices/12](slices/12-tea-room.md)

**Branches.** None blocks the trunk. Pick one only when the user asks or the trunk is waiting on them.
- [ ] B1 brain swatch, after 06 → [slices/b1](slices/b1-brain-swatch.md)
- [ ] B2 matcha dust and grooming, after 05 → [slices/b2](slices/b2-dust-grooming.md)
- [ ] B3 whisk rhythm, after B2, expected to fail → [slices/b3](slices/b3-whisk-rhythm.md)
- [ ] B4 stop at the bowl, after 05 → [slices/b4](slices/b4-tarsal-stop.md)
- [ ] B5 learn the aroma, after 05, expected to be weak → [slices/b5](slices/b5-aroma-learning.md)
- [ ] B6 how male is this circuit, after 05 → [slices/b6](slices/b6-male-circuits.md)

**Before you end your pass,** update this section: status and date, the exact next pickup point, anything blocking, and the checkboxes. If the work taught you that a slice is wrong, fix the slice file first and then continue. A new slice must displace a parked item below. Never append one silently.

## The rules

These hold across every slice. They are why the project is worth doing.

1. **Biology → simulation → observed behaviour → game design.** A mechanic ships only on an experiment that was written down first, had a control, and passed. We design around what the circuit does. We do not force it to do what we designed.
2. **Nothing looks like neural activity unless it is.** Every spike on screen comes from a live engine run or a recording, with its seed. Zero spikes means zero glow. FlyBrain's Neuro-Lab lights random points and calls it optogenetics. That is the failure this rule exists to prevent.
3. **The artifact holds facts. Everything else is ours, and says so.** Synapse counts, transmitter labels and body IDs come from the connectome. Signs, weights, time constants, doses and decoders are the model. Sequence and puppetry are staged. The tags are data, and a test fails when a number reaches the screen without one.
4. **One owner per concept.** See the table in CONTRACTS.md. Two implementations of the neuron model, the Python oracle and the browser engine, and they agree bit for bit. A mismatch is a bug to find, never a tolerance to loosen.
5. **Versions, not tweaks.** Changing `dt`, the synapse threshold, a sign or the weight makes a new model or artifact version and re-runs the experiments that depend on it.
6. **Every shipped circuit meets its one-line rival.** FlyBrain admits its connectome "does more or less what `if looming > threshold: dodge()` would do" and that it never ran the comparison. Here the comparison is a table in the experiment and a chart in the app.
7. **The model has no memory, hunger or learning.** It forgets within about 50 ms. The order of a ceremony is staged. Each sip is an instantaneous decision, and the interface says so.
8. **Raw data is never committed.** Downloads need the user's yes in that session. The provenance manifest and the CC-BY attribution ship inside the app.
9. **No backward compatibility and no migrations.** Hard cutovers only. The end state should read as designed today, not as a toy with a game bolted on.

## The ladder

```
01 census ──┬─► 03 full graph ─┐
            │                  ├─► 05 TASTE LAW ─► 06 LESION ATLAS ─► 07 ENVELOPE ─┐
02 oracle ──┼─► 04 harness ────┘        │                │                         ├─► 09 bench ─► 10 scope ─► 11 journal ─► 12 tea room
            └─► 08 engine (fixtures) ───┼────────────────┼─────────────────────────┘
                                        │                └─► B1 swatch
                                        └─► B2 dust ─► B3 whisk · B4 stop · B5 aroma · B6 male
```

| # | Question | What you can run or see | Size |
|---|---|---|---|
| 01 | Do the cast members exist under names we can bind with evidence? | `circuits/taste.census.html`: every role found, missing or colliding | S |
| 02 | Is our neuron the published one, defined once, reproducible bit for bit? | Model check report: PSP, rate curve, refractory freeze | M |
| 03 | Does the whole graph load into a facts-only format with the expected anchors? | `flylab graph info`: counts, sign coverage, top inputs to MN9 | S |
| 04 | Can an experiment fail honestly? | A synthetic experiment that passes one claim and fails another | S |
| 05 | Does sweet drive MN9 and bitter suppress it, specifically, on a plateau? | The taste law report, with shuffles, random controls and the rival rule | L |
| 06 | Is predict-then-lesion deep enough to be a game? | `/atlas`: a quiz over recorded whole-brain runs | M |
| 07 | How small a graph equals the whole brain over what the toy offers? | Extraction report: sizes, saturation, breach rate | M |
| 08 | Is the browser engine the same model? | `/lab/engine`: fixture table, hashes, speed | M |
| 09 | Does a real wiring diagram refusing your tea feel like something? | `/bench/taste`: compose, bet, run, replay | L |
| 10 | Can a cold reader see who excites whom and what fired? | The circuit scope, one visual variable per sub-slice | L |
| 11 | Do the experiments add up to understanding? | Puzzles, earned names, the "Didn't work" chapter | M |
| 12 | Can the ceremony be built without adding a simulation concept? | `/tearoom` | L |

**Kill points.** After 01, names. After 05, the concept. After 06, the product. After 07, the architecture. Each slice file states its fallback. Nothing after a kill point starts until its verdict is written.

**Work that needs no connectome data**, for when consent is pending: 02, then 04, then the fixture half of 08.

## Standing gates

- `make check` is green at the end of every slice: Python tests, TypeScript tests once `web/` exists, schema validation, fixtures regenerate byte-identically, the mechanics gate, the import-boundary test, the banned-call grep.
- Every slice that produces a visual shot ends by running `screenshot-critique` on it, as the last check before the slice is accepted. Where the slice changes an earlier look or has a reference image, it also runs `compare-screenshots` to judge candidate against target.
- Human checkpoints never block. Open the shots with `preview-shots`, wait about five minutes, and if the user is silent decide on the evidence, record the decision and its reason in `choices.md`, close the shots and continue.
- Evidence for each accepted slice is copied into `assets/evidence/NN/`, as [assets/evidence/README.md](assets/evidence/README.md) describes: the report or shot, the verdict, and the commit it was made at.

## Out of scope

A validated digital fly. The whole brain live in a browser (measured elsewhere at 0.25× real time). Body physics. Vision, steering and walking driven by the brain, all of which failed in every spiking model surveyed. Training of any kind to make the fly succeed. Accounts, servers, multiplayer. Hunger or thirst derived from the wiring, because modulatory transmitters carry no sign here. Any claim about matcha beyond "caffeine excites bitter taste neurons, sugar excites sweet ones".

## Known unknowns

| Unknown | Resolved by | If it goes badly |
|---|---|---|
| Which taste neuron types are sweet, bitter, water | 01 binds from the paper and annotations; 05 tests the predicted signs | Populations are labelled by effect, and the headline shrinks to the shuffle control |
| Whether the taste law holds in our discretisation on MaleCNS | 05 | Fallback ladder in the slice; stop and tell the user before anything else is built |
| Whether lesions give distinguishable outcomes | 06 | Widen to water, salt and touch, or re-scope to a guided explainer before building an engine |
| Whether a small subgraph stays equal to the whole brain under lesions | 07 | The browser replays recordings instead of computing |
| Whether TypeScript is fast enough | 08 | Active-set work, then a hard cutover to Rust compiled to WebAssembly |
| Whether matcha dust recruits a grooming command neuron | B2 | Dust triggers a staged groom, tagged staged |
| Whether any model of the 13A/13B wiring whisks at 7–8 Hz | B3 | Staged animation and a "Didn't work" page |

## Parked

Things that were considered and are deliberately not slices. Promote one only by displacing another.

- Continuous pouring with live dials and a real-time pacer. Trials with slow replay teach more and cost less.
- A 3D room, a rigged fly, a soma point cloud of all 166,000 neurons replaying a lab run.
- A hunger or thirst knob. Omitted rather than labelled.
- Sound. If it ever arrives, it is sonified spikes and nothing else.
- Water, low-salt and heavy-metal taste as extra ingredients. Cheap once 05 has passed; held back to keep the first game small.
- The glutamate sign flip as a live switch. It ships as a recorded comparison first.

## Where things are

- [CONTRACTS.md](CONTRACTS.md): owners, formats, the normative model step.
- [RESEARCH.md](RESEARCH.md): sources, findings and what each one forces.
- [choices.md](choices.md): every decision made on the user's behalf, least confident first.
- [visualizations/roadmap.html](visualizations/roadmap.html): the concept and the ladder as pictures.
- [assets/planning/](assets/planning/): the brief, four independent drafts and the synthesis that produced this plan.
