# Synthesis of the four drafts

Four subagents each drafted the whole plan from `brief.md`, blind to one another, each with a different bias: A fewest slices, B risk first, C seam quality, D fun and understanding. All four used the same model family. The workflow asks for a second family as well; that was skipped, because sending the user's project to another vendor's service was not something to do without asking. The drafts are kept beside this file. This note records what the plan took from each, where they split, and which way it went.

## Where all four agreed, unprompted

These are treated as settled.

1. **Integer synapse counts in the graph file; sign and weight in the model.** Accumulate in integers and the order of addition stops mattering, so bit-for-bit parity and subgraph equivalence cannot break on summation order. fly-escape needed a careful ordering contract for its signed f64 weights. The brief had proposed inheriting that format; all four rejected it.
2. **Random input keyed by body ID**, not by position in a stream. Only then do the whole brain, a subgraph and a lesioned run see the same Poisson trains.
3. **"Exactly equivalent subgraph" was overstated in the brief.** It is exact only for enumerated trials. Lesions of inhibitory cells can wake neurons that never fired before. The plan needs an enumerated envelope, a guard, a held-out error rate, and a truthful badge.
4. **The one-line rival rule** must be a table in the taste experiment and a chart in the app.
5. **Criteria are committed before confirmation seeds run. Failures stay.**
6. **Behaviour is decoded from spikes over a window, never from voltage.**
7. **Slow motion.** A taste decision takes tens of milliseconds. Real-time dials would show nothing.
8. **Whisk rhythm will probably fail** and must never block. Learning likewise.
9. **Honesty tags are data with a test behind them**, not prose.

## What each draft contributed alone

**A, fewest slices.** A five-slice v1 and the discipline behind it: a new slice must displace a parked item. Labelled slow motion as a feature. The observation that PyPI wheels and Playwright's browser are downloads too. Arithmetic-only integration as a parity trick (not adopted, see below). The warning that fly-escape's evidence folder grew to 43 numbered passes.

**B, risk first.** The most consequential draft.
- It read the published `model.py` and found four quirks the brief had missed: `v` and `g` both freeze while refractory, reset clears `g`, driven neurons have no refractory period, and integration is exact.
- It checked the grooming names against anatomy and found `DNg11` is a name collision: GABAergic, visual inputs, no front-leg output.
- It found fly-escape's "taste" group is mostly touch sensors that *inhibit* the proboscis through `GNG015`, and that only 3 of its 32 tarsal IDs survived that project's extraction.
- It named the risk the brief missed entirely: **play depth.** If silencing cell types gives indistinguishable outcomes, the game is two dials and a reflex. It proposed testing that with a recorded quiz before building any engine. This reordered the trunk.
- It warned against circular identification: binding taste populations by their effect on MN9 makes the headline true by construction.
- It pointed out the model has no memory, so "sweet before bitter" cannot be computed as a sequence.
- Sentinels, with the argument that makes them sound: the first neuron to escape the subgraph must be one.
- Discrete dose levels and verified seeds as part of the envelope. A sensitivity arm for the unknown-transmitter sign, where the two reference repos silently disagree (0 in FlyBrain, +1 in fly-escape).

**C, seam quality.** The contracts.
- The `.fskg` layout, facts only, with no groups in the manifest.
- The normative model step, with constants frozen as decimal strings so that no engine ever calls `exp`.
- The census as data, with typed failure codes and a `nearest` field.
- The codec as data with two small interpreters.
- `verdict.json` as the artifact and HTML as a rendering, so that a mechanics gate can read verdicts and fail the build.
- The provenance join rule: a derived number cannot claim better than its worst input.
- "The tea room adds zero simulation concepts", with the delete-the-folder test.
- The objection that the brief's "one neuron model" contradicts its own expected rate model for whisking; resolved by keeping any rate model in the lab.

**D, fun and understanding.** The experience.
- The loop: offer, bet, run, slow replay, cut or light, paired rerun, journal stamp. Betting first is what makes the surprise land.
- Trials as the unit of play, with a scrubber, instead of continuous dials.
- Names are earned: a cell type is "relay 3 (GNG015)" until the player's own experiment shows what it does.
- The "Didn't work" chapter, which turns failed branches into content.
- The swatch's selvedge encoding the seed and hashes, so that every piece of knitting is a reproducible record.
- The maleness strip: the dataset's headline finding, checked by hand on the circuit the player knows.
- A list of fakery traps taken from FlyBrain's source: idle sparkle, glow on unsimulated legs, a forced happy ending, eased meters, invented learning curves, sound from anything but spikes.
- Eight puzzles, most of which are in slice 11.

## Where they split, and which way the plan went

| Question | Positions | Decision | Why |
|---|---|---|---|
| First playable | A, C, brief: a live bench. B: a recorded lesion quiz. D: a toy bench on 12 invented neurons before any download | **B's recorded quiz**, slice 06 | It tests the biggest product risk a week earlier, needs no engine, and cannot misrepresent the brain. D's toy is scaffolding that D itself deletes later; the engine's fixture page covers the same need |
| Integration | A: forward Euler with arithmetic only. B, C: exact integration with shipped constants | **Exact** | It is what the published code does, and shipping the constants gives the same parity guarantee |
| Interaction | A, C: live stepping with a pacer. D: trials. B: dials snapped to levels | **Trials with discrete levels** | Simplest engine protocol, best for understanding, makes the envelope enumerable. Continuous pouring is parked |
| Repo shape | A: `lab/` and `web/`. C: six packages. B, D: a few packages | **One `web/` package with an import-boundary test**, plus `contracts/` and `circuits/` at the root | C's seams without a workspace's overhead. Recorded as reversible |
| Codec | A: in the web app only. B, C, D: data shared by both languages | **Shared data** | Lab verdicts are about this exact mapping, and the envelope is derived from it |
| Rust door | Brief: keep a narrow interface for a swap. A, C: build nothing for it | **Build nothing.** The seam is the fixtures and the Worker messages | No abstraction for a hypothetical |
| Download consent | A: once, for everything. C, D: split, small files first. B: gate only the first slice and keep a data-free root | **Split, with data-free work named** in the README | The 58 MB census is the step most likely to reshape the plan |
| Whisk rhythm | A: cut from the first month. B, C, D: a time-boxed spike | **A branch, after B2, expected to fail** | It is the question under both of the user's themes, so it stays visible; it blocks nothing |
| Learning, tarsal stop | A, D: cut. B: cheap spikes with pre-checks. C: unsliced | **Branches B4 and B5**, lab first | Cheap to write down, and B's free pre-checks in slice 05 decide whether they are worth starting |
| Swatch timing | D: second slice. A, B, C: late garnish | **Branch B1, available right after slice 06** | It needs a real recording to mean anything, and then it is the cheapest thing worth showing |
| Sentinel rule | B: every excitatory one-hop target (sound, large). C: only those that came a quarter of the way to threshold (small, unsound) | **B's as the rule, C's as the named fallback**, recorded in the manifest | Soundness first; the badge wording follows the rule used |
| Random generator | A: any 32-bit generator. B: a hash. C: threefry. D: xoshiro per neuron | **threefry2x32, 20 rounds, four 16-bit lanes per call** | Counter-based, published, has known-answer vectors that are independent of our own oracle, handles 64-bit body IDs, and the lanes cut the cost by four |

## Alternatives the user may genuinely prefer

1. **A's five-slice v1.** Same trunk, merged: ground, science, port, play, ship. Fewer files to read, bigger steps to review. The twelve-slice trunk can be collapsed to it by merging 01+03, 02+04+05+06, 07+08, 09+10, 11+12.
2. **D's toy-first order.** If the user wants something on screen on day one, slices 02 and the fixture half of 08 can be followed by a small toy bench on invented neurons, clearly tagged as a toy. The plan leaves it out because it teaches nothing about this brain.
3. **Rust compiled to WebAssembly from the start**, as both reference projects do. One module, same fixtures.

## Leads from the drafts that nobody has verified

- B read the taste-feeding preprint as mapping bitter (Gr33a) to `LB1a–e`, water (ppk28) to `LB3a`, low salt (Ir56b) to `LB3b`, sugar (Gr64f) to `LB3b–c` and Ir47a to `LB3d`. The preprint returned 403 to the planner's own fetches. Slice 01 must confirm it from the paper.
- B and D report from the cell type explorer: `BM_InOm` 745 neurons, `LB3c` 23, `LB3b` 11, `DNg12_b` with about 28% of its output in the front-leg neuropil, `pIP10` one per side and cholinergic, `mAL_m1` present with glutamatergic main inputs. The planner checked `MN9`, `DNg11`, `DNg12_a`, `IN13A001`, `LB1a`, `LB3a`, `LB3d`, `BM_Taste`, `GNG015`, `GNG095` and `DNge062` directly; the rest are second-hand.

## Cold-read audit

After the plan was written, a fresh agent with no context read every spec file and was asked to find contradictions, decisions an implementer would have to invent, ambiguities in the model step, double ownership, broken references, and places where the plan could let someone tune until green. What it found, and what changed:

- **Dose levels disagreed** between the taste law, the envelope and the bench. Now one set of five levels, defined in the codec, used by all three.
- **One-sided sips and double lesions were offered in play but absent from the envelope.** The envelope now enumerates sides. One operation at a time is the rule; a second runs as exploratory with the badge showing. Two puzzles were rewritten to fit.
- **"Driven" was undefined in the model step**, and a forced spike could be swallowed by the refractory check. Input neurons are now defined per trial, the order is fixed, the first 18 steps and the step origin are stated, invalid specs are rejected identically in both languages, and the generator's word order is spelled out.
- **Activation removes refractoriness**, so a sufficiency test partly measures the drive. Now acknowledged: such a test only ever reads the circuit downstream.
- **Hashes and fixtures had no byte-level definition.** `spikeHash`, `stateHash`, `specSha256` and the fixture format are now specified. Floats in fixtures are hex bit patterns.
- **The prereg had no schema and seed consumption had no ledger.** Both added, with a fixed list of criterion kinds instead of a free expression language.
- **The lesion atlas chose its cell types by their activity and then tested them for an effect.** Selection is now by wiring alone, and the slice says it is a product gate, not a claim about which types matter.
- **Fallback reruns reused confirmation seeds.** A rerun is now a new experiment with fresh seeds, two at most, and the last report lists every attempt.
- **Decoder thresholds and the rival rule were fitted and judged on the same runs.** Both are now set by rules written in advance and scored on held-out seeds.
- **Re-binding taste populations because the model's sign table failed** would have been binding by effect through the back door. Re-binding now needs evidence from the paper.
- **Ownership:** the codec file has one writer; the web scaffold is specified in one place; `hopDepth` belongs to the lock and is recomputed when it changes; the song branch has a mechanic id.
- Smaller things: an empty step in slice 01, which also lacked a pass criterion; `LB3b` claimed by two groups; a neuron count typed into copy instead of read from the manifest; a timestamp that would have broken byte-identical verdicts; a wrong path and a wrong neuron count in RESEARCH.md. The count was re-checked first-hand: `BM_InOm` has 745 neurons in MaleCNS, 405 on the right.
