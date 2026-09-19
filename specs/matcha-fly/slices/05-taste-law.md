# 05 · Taste law

**Question:** on the MaleCNS wiring, under the published model, does sweet taste drive the proboscis motor neuron MN9, and does bitter taste suppress it, specifically and on a plateau?

Needs slices 01, 03 and 04. **Kill point: the concept.** Nothing downstream starts until this verdict is written.

## Contract

Delivers experiment `E01-taste-law` with its verdict, the codec's channels and decoder with evidence attached, and the tables later slices read: which neurons ever spike, where the simple rule and the wiring disagree.

Does not deliver lesions (06) or anything in the browser.

## Conditions

The whole five-by-five grid of the codec's levels: sweet at level 0 to 4 against bitter at level 0 to 4, that is 0, 25, 50, 100 and 200 Hz each. Both sides stimulated. One-second trials of 10000 steps. Ten confirmation seeds, 100–109. Ten held-out seeds, 110–119, which only the decoder check and the rival rule may touch.

Sweeps: `wSynMv` at 0.19, 0.275 and 0.36, the ±30% range the original paper reports as robust; and the sign of neurons with no transmitter label, 0 and +1, because the two reference projects silently disagree on it.

**A third, narrower arm, from the look at the six on 2026-09-19** (choices K13): *taste neurons the dataset calls unclear take sign +1*, and every other unknown stays at 0. All six `LB1b` bitter neurons are "unclear", and not for lack of data: each has 306 to 417 predictions, split between acetylcholine and serotonin, and the type-level call falls just under the 0.5 cut. The classifier is documented to mistake sensory neurons for serotonin ones, taste neurons are cholinergic wherever it has been measured, and the published model this one follows would have made them excitatory. The arm flips 259 gustatory neurons: `LB1b` 6, `LB2b` 3, `LB2d` 5, `LB3` 1, `LgLG1b` 134, `LgLG8` 14, `WG3` 96. Report the leg and wing types apart from the labellar ones, because they carry many glutamate calls and the arm is weakest there. It is a new entry in `contracts/model/variants.json`, which needs the sign policy to be able to name a class of neurons; that is a change to `contracts/MODEL.md` and its fixtures, made here, not before.

"MN9 count" below is the codec's measure: summed spikes of both MN9 neurons in steps 2000 to 9999. Thirty-two spikes is 20 Hz per neuron.

## Pre-written criteria

Freeze these in `prereg.json` before any confirmation seed runs.

| Id | Kind | Criterion |
|---|---|---|
| P1 drive | `threshold` | MN9 count is 32 or more at sweet 3, bitter 0, in at least 9 of 10 seeds |
| P2 specificity | `ratio_vs_control` | That count is at least 10× the count under each of 10 size-matched random sensory populations driven at level 3. A control count of zero passes |
| P3 brake | `paired_drop`, `monotone` | At sweet 3, adding bitter 3 cuts the count by 70% or more on the same seed, in at least 9 of 10 seeds. Along bitter 0 to 4 the mean count never rises by more than 10% of the bitter-0 value |
| P4 wiring | `control_fraction` | At most 5 of 100 shuffled graphs reach half the real count at sweet 3, bitter 0 |
| P5 regime | `fraction_active` | Fewer than 20% of all neurons spike at all, in any condition |
| P6 plateau | the plateau rule | P1–P4 hold at two or more adjacent `wSynMv` values, and at both values of the unknown-transmitter sign |
| P7 decoder | `decoder_accuracy` | With thresholds set by the rule below, on the held-out seeds at least 9 of 10 trials at sweet 3, bitter 0 decode `extend`, and at least 9 of 10 at sweet 3, bitter 3 decode `refuse` |

Verdict `pass` needs all seven.

**The decoder rule,** written now so it cannot be fitted later: from the confirmation seeds at the shipped model, `extendAtLeast` is the second-lowest MN9 count at sweet 3, bitter 0, and `refuseAtMost` is the second-highest count at sweet 3, bitter 3. If `refuseAtMost` is not below `extendAtLeast`, the two conditions do not separate and P7 fails.

## Also measured, not gating

- **Predicted signs.** Before running, write down for every bound taste population whether it should raise or lower the MN9 count. Then drive each alone and with sweet 3. At least 80% should match. This tests the census; it does not define it.
- **The rival rule.** Fit `extend if a*sweet - b*bitter > c` to the confirmation-seed outcomes. Report its accuracy **on the held-out seeds only**, and list the grid cells where the wiring and the rule disagree. Those cells are puzzle material.
- **Glutamate excites.** Rerun the bitter column with the `gluExcitatory` variant. The original paper reports the brake disappears. Keep the recordings; the app shows them.
- One side only, at every level: do both MN9 neurons fire? Slice 07 needs these runs anyway.
- The set of neurons that ever spike, per condition. Slice 07 starts from it.
- Free pre-checks for the branches: whether sugar recruits PAM dopamine neurons (B5); which descending types change with tarsal sweet (B4).

## Seam

`lab/experiments/E01-taste-law/`. On a pass, `lab/flylab/codec/build.py` writes `contracts/codec/taste.codec.json` with the two channels, their five levels, and the decoder thresholds with an `evidence` pointer into the verdict. The slice creates the Python codec interpreter and its fixtures under `contracts/fixtures/codec/`. It enables `taste.drink`, `taste.brake`, `taste.shuffle`, `taste.gluflip` and `taste.rival` in `contracts/mechanics.json`.

Slice V1 already created the codec's writer and file, with the levels and the tea menu; this slice adds the decoder thresholds through the same writer. The `menu` block holds the teas and tiers of [assets/content/tea-menu.md](../assets/content/tea-menu.md), and the table that turns a tier and a number of scoops into one of the five bitter levels. A test checks that every cell of that table is an existing level, so the menu can never ask for a trial outside the grid this slice measured. Tier assignments carry the tag `staged`; levels carry `model`.

On a pass the living view gains its verdicts (V1 and V2 held them back): the proboscis comes out and the cup drains only while MN9 fires in the replayed recording, and his words about the tea follow the decoder's outcome and nothing else. How long he stays with the cup is already the recording's from V2. On a fail the view stays as V2 left it, with the failure explained beside it.

**Timing, from V2's pilot (2026-09-19):** 300 ms of his time takes about 3 s on one core of this machine, so a one-second trial is about 10 s. A thousand one-second trials are under three hours on one core and well under half an hour on ten. V2's pilot grid (`assets/evidence/v2/README.md`) already shows the shape this slice is about, from one seed and with no control. Write the pre-registration before looking at it again, and do not tune anything because of it. Two things in it to test and not to explain away: a weaker sweet sip recruited more neurons than a stronger one, and some sips recruit thousands of neurons where their neighbours recruit hundreds.

## What the human sees

`report.html`: the sweet-by-bitter grid as a heatmap, the shuffle histogram with the real brain marked, the random-population controls, the predicted-sign table, the rival rule's held-out accuracy and its disagreements, and a line stating how many neurons took part out of how many the graph holds, both read from the run.

## Fallbacks

Each rerun is a new experiment, `E01b` then `E01c`, with a new prereg and fresh seeds, as the harness requires. Two reruns at most. The final report lists every attempt.

1. **The predicted-sign table fails.** Go back to the paper, not to the results. If the paper shows the census bound a population wrongly, fix the binding on that evidence and rerun. If the paper supports the binding, the binding stands, the failure is recorded, and the taste populations are described in the app as "appetitive-like" and "aversive-like, defined by effect". The headline then rests on the shuffle control alone.
2. **Counts saturate or vanish at all three weights.** Recalibrate `wSynMv` on pilot seeds by the original paper's own rule, sweet at 100 Hz giving about 80% of the maximum MN9 rate, and rerun around the new value. This path is declared here, before any result exists, and it costs one of the two reruns.
3. **Sweet drives MN9 but bitter does not brake it.** Tell the user. The options are a game on sweet plus the touch brake (`BM_Taste` excites `GNG015`, MN9's strongest inhibitory input), or stopping.
4. **MN9 stays silent.** Tell the user. The anchor has failed on this dataset. The known-good alternative is the looming escape reflex, which would be a different game.

Tuning until green is not on the list. A failed report stays in the repository.

## Verification

The runner's rules from slice 04. Identical `verdict.json` on a rerun of the finished experiment. The codec fixture covers every level of both channels and every possible window count around both thresholds.

## Delegated

Parallelism, caching of Poisson trains (they depend only on seed, body ID and step, so they are shared across lesions and shuffles), plots.

## Must stay green

`make check`. Slices 02–04 unchanged.

## Feedback that would change this slice

Criteria, but only before confirmation seeds are consumed. A user who wants water or salt as ingredients from the start adds channels here, through the codec's one writer, and nowhere else.
