# B6 · How male is this circuit?

**Question:** what can this project show that only a male connectome can?

Needs slice 05 for the strip and slices 03 and 04 for the experiment. Blocks nothing.

The dataset's headline is sex: 262 male-specific and 114 dimorphic cell types, concentrated in higher brain centres, with the sensory and motor periphery nearly the same in both sexes.

## Part 1: the maleness strip. No risk.

From annotations alone, compute the fraction of cell types on the taste-to-MN9 path that carry a dimorphism flag. Slice 01's census confirms which column holds the flag; a planning draft noticed an `m` suffix on some type names as a fallback signal. The number should be near zero. That is the paper's headline, checked by hand on the circuit the player has just spent an hour with. It is tagged `connectome`, involves no simulation, and goes in the journal (slice 11).

## Part 2: the serenade. Uncertain.

Male flies sing by vibrating one wing. The descending neuron `pIP10` is part of the song pathway and exists in MaleCNS, one per side, cholinergic, with outputs to nerve-cord song types. Experiment `E08-serenade`: activate `pIP10` and ask whether wing motor neurons follow, against size-matched random descending neurons, on a plateau, as in every other experiment.

On a pass, enable `song.serenade` in `contracts/mechanics.json`. The player can then light `pIP10` in the scope, and the sound is the recorded spikes of the wing motor neurons made audible. Activation forces `pIP10` to fire by definition, so the test is only ever about what the wing motor neurons downstream do. Nothing else may make sound. On a fail, it is a "Didn't work" page.

## Probably dead: pheromone taste to courtship

A male taps a female with his foreleg and tastes her. The `mAL` neurons on that path exist in MaleCNS, but a planning draft found their main inputs are listed as glutamatergic, and in this model glutamate inhibits. The path is likely silent. Test it only if the user asks, and expect to write it up as a limit of the sign policy.

## Delegated

How the strip is drawn. Which wing motor neuron types to read.

## Feedback that would change this slice

A user who cares most about what is new in this connectome may want this branch before the tea room. Part 1 can move into slice 06's cards at no cost.
