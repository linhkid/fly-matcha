# B3 · Whisk rhythm

**Question:** can any model built from the MaleCNS front-leg wiring turn steady descending drive into a 7–8 Hz alternation of the front legs?

Needs B2. Time box: three days, in `lab/spikes/`, Python only. **Expected to fail.** Blocks nothing. Whisking and knitting are the same motion, so this is the question under both of the user's themes.

## Why it is expected to fail

- FlyBrain's spiking model of the nerve cord ignites by itself at 3× gain and convulses at 10×, because many premotor neurons there are graded and do not spike.
- FlyBrain's rate model of the cord oscillates too easily: 21% of descending types passed its rhythm score against 3.4% in the paper it followed. It also needed a 4.6 GB neuron-size table, which would be a further download needing consent.
- The published model that does oscillate (eLife 2025, 13A and 13B inhibitory neurons) is rate-based, groups neurons, and relies on feedback from leg position sensors. We have no leg. Its authors write that how steady drive becomes rhythm "remains unclear".

## Contract

Experiment `E05-whisk`. Drive the descending types that B2 found, or failing that the `DNg12` subtypes with front-leg output. Read tibia flexor against extensor motor neurons in the T1 neuropil, left and right. Try the spiking model first. A rate model second, and only in the lab: there is one neuron model in the product (rule 4), and this branch does not get to add another to the browser.

**Pre-written pass:** a rhythm score of 0.5 or more between 5 and 12 Hz, flexors and extensors in antiphase, in 5 of 6 seeds, at two adjacent parameter values, **and** at most 10% of 20 randomly chosen descending types pass the same test. The last clause is the one FlyBrain failed.

**Kill:** two sessions without a plateau.

## Either way

The output is a report with a plot. On a fail it is a "Didn't work" page, and whisking stays a staged 7–8 Hz animation gated by B2's decision, or by a timer. On a pass, tell the user before doing anything else: it would be a finding, and bringing it to the browser is a new plan.

## Delegated

How the rhythm score is computed; start from `ritmo()` in `../FlyBrain/fly/cordon.py`.
