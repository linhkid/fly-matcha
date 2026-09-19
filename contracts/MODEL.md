# The neuron model: `lif-shiu-v1`

The leaky integrate-and-fire model of Shiu et al. (Nature 2024), discretised so that two languages cannot disagree. This file is normative. `lab/flylab/model/oracle.py` implements it, the browser engine must reproduce it, and the fixtures under `contracts/fixtures/` decide any dispute, by exact equality.

The numbers live in `contracts/model/lif-shiu-v1.json`. Named sets of overrides live in `contracts/model/variants.json`.

## What comes from where

The graph supplies facts: who connects to whom, with how many synapses, and each neuron's predicted transmitter. Everything in this file is the model: the equation, the sign given to each transmitter, the size of one synapse, the delays. None of it was measured in this fly.

## State

Per neuron: `v` and `g` as float64, in millivolts above rest; `refr` as a 32-bit count of steps; `acc` as a 32-bit integer. At step 0 everything is zero and no spike is in flight. Steps are counted from 0 and one step is 0.1 ms.

## Constants

| Name | Value | Meaning |
|---|---|---|
| `delaySteps` | 18 | 1.8 ms between a spike and its arrival |
| `refracSteps` | 22 | 2.2 ms during which a neuron is frozen |
| `vThMv` | 7.0 | threshold above rest: −45 mV against a rest of −52 mV. Never negative, or a neuron at rest would fire |
| `wSynMv` | 0.275 | what one synapse adds to `g`. The published model's only free parameter |
| `A`, `B`, `C` | frozen strings | `A = exp(−dt/τm)`, `B = exp(−dt/τs)`, `C = (A − B)·τs/(τm − τs)`, with τm = 20 ms and τs = 5 ms |
| `snapEpsMv` | 1e-9 | below this, in both `v` and `g`, a neuron is set to exact rest |
| `signPolicy` | per transmitter | +1 acetylcholine; −1 GABA, glutamate, histamine; 0 dopamine, octopamine, serotonin, unknown |

`A`, `B` and `C` were computed once and are stored as decimal strings of 17 significant digits, which round-trip a float64 exactly. **Only the strings are normative. An engine parses them and never calls `exp`**, because transcendental functions differ between platforms and the two implementations would drift apart in the last bit.

## Input neurons

A neuron named by any drive or activation of a trial is an input neuron for the whole trial. Input neurons have no refractory period, as in the published code. Inside its window `onStep <= t < offStep` an input neuron is forced to spike at step `t` iff `lane16(seed, bodyId, t) < thr16`. The comparison is strict, so a threshold of 0 never fires. A neuron may appear in at most one drive or activation, and may not be both silenced and an input.

## One step

For `t = 0, 1, 2, …`:

1. **Deliver.** For every neuron `j` that spiked at step `t − 18`, and every edge `j → i` with `count` synapses: `acc[i] += sign(j) · count`. These are integer sums, so their order cannot matter. Nothing is delivered while `t < 18`.
2. **Update** each neuron `i`. Neurons are independent within a step.
   1. Silenced: `v = g = 0`, `acc = 0`, `refr = 0`, and the neuron is done. It never spikes.
   2. `g += wSyn · acc`, then `acc = 0`. This happens even while refractory: arrivals are kept.
   3. If `refr > 0`: `refr −= 1` and the neuron is done for this step. `v` and `g` are untouched. A neuron that spiked at step `s` is therefore frozen for steps `s+1 … s+22` and integrates again at `s+23`.
   4. `v = v·A + g·C`, using `g` as it stands after 2.2, and then `g = g·B`. Two multiplications and one addition, in that order, never fused.
   5. Spike iff the neuron is forced at `t`, or `v > vTh`. Strict.
   6. On a spike: record `(t, i)`; `v = g = 0`; `refr = 22`, or 0 for an input neuron.
   7. Otherwise, if `|v| < snapEps` and `|g| < snapEps`: `v = g = 0`.
3. Spikes recorded at step `t` are delivered at step `t + 18`. Within a step they are listed by ascending neuron index.

A neuron at exact rest that receives nothing and is not forced is a fixed point of step 2. An implementation may skip such neurons. It must then agree with one that visits every neuron, at every step; the oracle checks this whenever it writes a fixture.

## Random input

Counter-based, so a neuron's train depends only on `(seed, bodyId, t)`. It is the same in the whole brain, in any subgraph and under any lesion, which is what makes paired comparisons and the subgraph test exact.

The generator is `threefry2x32` with 20 rounds, as `threefry2x32_20(counter, key)` in Random123. In full, on unsigned 32-bit words with wrapping addition: let `ks = (key0, key1, key0 ^ key1 ^ 0x1BD11BDA)`, and start from `x0 = counter0 + ks[0]`, `x1 = counter1 + ks[1]`. One round with rotation `r` is `x0 = x0 + x1`, then `x1 = rotl32(x1, r) ^ x0`. Do five groups of four rounds, with rotations `13, 15, 26, 6` for groups 1, 3 and 5 and `17, 29, 16, 24` for groups 2 and 4. After group `s = 1 … 5`, inject the key: `x0 = x0 + ks[s mod 3]` and `x1 = x1 + ks[(s + 1) mod 3] + s`. The outputs are `w0 = x0` and `w1 = x1`. `seed` is an unsigned 32-bit integer. The key is `(seed, floor(t / 4))`. The counter is `(bodyId mod 2^32, floor(bodyId / 2^32))`. Call the two output words `w0` and `w1`. Step `t` uses lane `t mod 4`, in this order: `w0 & 0xFFFF`, `w0 >>> 16`, `w1 & 0xFFFF`, `w1 >>> 16`, with a logical shift. A rate becomes a threshold once, in the codec: `thr16 = floor(rateHz · dtMs · 65.536)`. No float takes part in deciding a spike.

The three published vectors, confirmed against Random123's `tests/kat_vectors` on 2026-09-19, whose columns are counter, then key, then output:

```
counter 00000000 00000000   key 00000000 00000000   →  6b200159 99ba4efe
counter ffffffff ffffffff   key ffffffff ffffffff   →  1cb996fc bb002be7
counter 243f6a88 85a308d3   key 13198a2e 03707344   →  c4923a9c 483df7a0
```

## Activation and silencing

Activating a cell type is the same mechanism as sensory drive: its neurons become input neurons. An activated neuron therefore fires at the drive rate whatever its own inputs say. A test that activates a type can only ever ask what the circuit downstream of it does.

Silencing a neuron clamps it to rest for the whole trial. It emits nothing.

## State hash

`stateHash` after step `t` is SHA-256 over `t + 1` as an unsigned 32-bit integer, then, for each neuron in ascending order, `v` as float64, `g` as float64 and `refr` as a signed 32-bit integer. All little-endian. `t + 1` is the number of steps completed.

## Variants and versions

A variant is a named set of overrides to the JSON, for example `gluExcitatory: {"signPolicy.glutamate": 1}`. An override of a parameter that does not exist is an error. A trial names the model and one variant. The browser computes only `base`; other variants reach it as recordings.

What ships is one point: the JSON as it stands. An experiment may sweep overrides, declared in its pre-registration, and those exist only inside that experiment. Changing what ships, whether `dt`, a sign, `wSyn` or `snapEps`, makes a new model id and re-runs every experiment that depends on it. It is never a tweak in one implementation.

## Where this departs from the published code

Read from `model.py` in `github.com/philshiu/Drosophila_brain_model`.

| Published | Here | Effect |
|---|---|---|
| A Poisson event adds 250 · w to `v`; the spike is detected one step later | The spike happens in the step of the event | Input spikes are one step earlier. No effect on rates |
| Poisson input drawn by Brian2 with a float probability | One Bernoulli draw per step from a 16-bit lane | Rates are quantised to about 0.15 Hz |
| A silenced neuron has its outgoing weights zeroed | It is clamped to rest | Identical downstream. Here the neuron also shows no spikes of its own |
| Float weights summed | Integer synapse counts summed, multiplied by `w` once | Differs by rounding only, and removes any dependence on order |
| No lower bound on state | State under 1e-9 mV in both variables becomes exact zero | Below anything a synapse can do; makes skipping resting neurons legal |
| Every transmitter that is not GABA or glutamate excites | Dopamine, octopamine, serotonin and unlabelled neurons have sign 0 | Follows the two reference projects. Slice 05 tests the taste law under unknown = +1 as well |
| Potentials in absolute millivolts | Potentials relative to rest | Algebraically identical |

Copied on purpose, although they are quirks: both `v` and `g` are frozen while a neuron is refractory, arrivals during that time are still added to `g`, a spike empties `g` as well as `v`, and input neurons have no refractory period.

Not checked: whether Brian2 releases a neuron on the 22nd or the 23rd step after a spike. The cross-check against Brian2 was not run, because installing it is a download nobody had approved.
