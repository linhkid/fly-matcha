# B4 · Stop at the bowl

**Question:** does sweet taste on the front feet reach anything that would stop a walking fly?

Needs slice 05. Time box: a day and a half. Blocks nothing.

Leg taste neurons live in the nerve cord. Only a connectome that joins cord and brain can ask this at all, which makes it a good showcase for the dataset. The gustatory paper reports taste pathways reaching "locomotor-stop circuits".

## The difficulty

In this model, inhibition onto a silent neuron does nothing. Walking circuits are silent unless driven. So stopping is invisible unless walking is switched on first.

## Contract

Experiment `E06-tarsal-stop`. Bind front-leg taste neurons by `entryNerve` and class (slice 01's census). Switch walking on the way FlyBrain's `patas.py` did, with drive on `DNg100`. Then add front-leg sweet at 100 Hz. Readouts: MN9, the candidate halt types slice 05's pre-check listed, and the summed rate of leg premotor neurons.

**Pre-written pass:** a candidate type fires at 10× its rate under size-matched front-leg touch sensors, and driven premotor activity falls by 30% or more, in 8 of 10 seeds, at two adjacent weights. Left and right are crossed as a second control.

## Either way

On a pass, the walk to the bowl in the tea room ends when the circuit says stop, and the mechanic `tarsal.stop` is enabled. On a fail, he stops on contact, tagged `staged`, and the report joins "Didn't work". A seated ceremony shows little walking anyway, so the cost of failure is small.

## Delegated

Which premotor populations to sum. Plots.
