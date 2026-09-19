# B2 · Matcha dust and grooming

**Question:** when touch sensors on the head are driven, as matcha dust would drive them, does any descending neuron answer selectively?

Needs slices 03 and 04, and should wait for slice 05: no speculative branch runs before the concept gate has passed. Time box: two days. Blocks nothing.

## Why it is uncertain

Dusting a fly makes it groom, eyes first (Seeds et al. 2014). The eye bristle sensors, `BM_InOm`, exist in MaleCNS: 745 neurons. Its strongest descending partners on the explorer include `DNg35`, `DNg84`, `DNg85`, `DNg87` and `DNg15`, and `DNg35` is an input to `DNg12_a`, so a path exists on paper. But the textbook command neurons are not where their names say. `DNg11` in MaleCNS is predicted GABAergic, takes visual input and has no output in the front-leg neuropil. `DNg12` is eight subtypes; `DNg12_a` mostly drives neck motor neurons, and another draft found `DNg12_b` with about 28% of its output in the front-leg neuropil. `aBN1`, `aDN1` and `JO-C` are not type names at all. Nobody in the surveyed projects has tested grooming in a spiking model of this dataset.

So do not start from names. Start from the sensors and let the wiring say who answers.

## Contract

Experiment `E04-dust`. First a census for `groom.circuit.json`: `BM_InOm` and the other `BM_*` populations, Johnston's-organ types under whatever name they carry, every descending neuron type, the T1 leg and neck motor neurons.

Drive `BM_InOm` at 50, 100 and 150 Hz. Rank every descending type by its response. No type is favoured in advance.

**Pre-written pass:** at least one descending type fires at 10× or more its rate under size-matched random head mechanosensors, in 9 of 10 seeds, at two adjacent weights, and that type has output in the front-leg or neck neuropil. `DNg11` is excluded from satisfying the criterion. A second, descriptive question: do eye bristles and antennal bristles recruit different descending types, as the grooming hierarchy would need?

## On a pass

Add the winning types to a `groom` group, which makes the census recompute `hopDepth`. Add a `dust` channel through the codec's one writer. Rerun slice 07 to extend the envelope. Add `/bench/groom`. Enable `dust.groom` in `contracts/mechanics.json`. The neurons decide whether and when he grooms. The grooming motion stays staged and tagged; DesktopFly made the same split and said so.

## On a fail

Dust still falls and he still grooms, on a timer, tagged `staged`. The report becomes a page in the journal's "Didn't work" chapter. The interface must not imply the brain chose.

## What the human sees

The experiment report. On a pass, the bench.

## Delegated

Which mechanosensor populations to add beyond `BM_InOm`. Plots.

## Feedback that would change this slice

The user can name the grooming command neurons in MaleCNS from a paper: bind them by that evidence and test them as a second, named hypothesis beside the unbiased ranking.
