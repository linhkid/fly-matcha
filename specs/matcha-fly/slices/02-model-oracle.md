# 02 · Model and oracle

**Question:** is our neuron the published one, defined once, and reproducible bit for bit?

Needs no data. Can run while consent for slice 01 is pending.

## Contract

Delivers the language-neutral model definition, the random-input generator, the trial format, a Python oracle that runs it on any graph, and fixtures that bind every later engine.

Does not deliver the real graph (03), experiments (04, 05) or the browser engine (08).

## Seam

- `contracts/MODEL.md` and `contracts/model/lif-shiu-v1.json`, from the model section of the spec's CONTRACTS.md. The constants `A`, `B`, `C` are computed once here and frozen as 17-digit decimal strings. When this slice is accepted, replace the model, trials and fixtures sections of the spec's CONTRACTS.md with pointers to `contracts/MODEL.md` and `contracts/TRIAL.md`, so only one copy exists.
- `contracts/TRIAL.md` with JSON schemas for `TrialSpec` and `TrialRecording`.
- `flylab.model.prng`: `threefry2x32(key, counter)` and `lane16(seed, bodyId, step)`.
- `flylab.model.oracle`:

```
Sim(graph, model, seed, variant="base")
  .drive(indices, thr16, on_step, off_step)   .silence(indices)   .step(n) -> spikes   .state_hash() -> hex
validate(spec) -> None | error code          the same codes the engine will use
run_trial(graph, model, spec: TrialSpec) -> TrialRecording
```

- `flylab.model.fixtures`: runs the oracle on tiny graphs and writes `contracts/fixtures/{prng,lif,trial}/*.json` in the fixture format from CONTRACTS.md, capturing the oracle's real state after every step. Pattern: `../fly-escape/scripts/reference/generate_lif.py`.
- `contracts/model/variants.json` with `base` and `gluExcitatory`.
- An in-memory `Graph` type with exactly the `.fskg` fields. This is not scaffolding: fixture graphs are built with it for good. Slice 03 adds a file-backed loader that returns the same type.

**Replicate before translating.** Read `model.py` in `github.com/philshiu/Drosophila_brain_model` first. The quirks that matter are listed in CONTRACTS.md. List every deviation from the Brian2 code in `MODEL.md`; two are already known (a silenced neuron is clamped instead of having its output weights zeroed; a forced spike happens in the step of the Poisson event instead of one step later).

## What the human sees

`python -m flylab model check` writes a report with three plots: the postsynaptic potential from one spike against the analytic curve, the firing rate of one neuron against constant input against the analytic rate, and a refractory trace showing `v` and `g` frozen for 22 steps while arrivals accumulate.

## Verification

Exact equality everywhere. No tolerances.

- Threefry matches the Random123 known answers in CONTRACTS.md. Confirm them against Random123's own `kat_vectors` file first.
- Fixture cases on 2–6 neuron graphs: strict `>` at threshold, including an input that lands exactly on threshold; refractory freeze with arrivals kept; 18-step delay, including nothing delivered before step 18; reset clears `g`; forced spikes on an input neuron, inside and outside its drive window, with no refractory period; `thr16 = 0` never firing; silencing; activation; inhibitory and zero-sign sources; a 64-bit body ID above 2^32; the `gluExcitatory` variant; snap-to-rest; and zero-preservation, meaning an active-set update equals the dense update step for step.
- Invalid specs are rejected with a stable error code: a neuron in two drives, a neuron both silenced and driven.
- Lesion pairing: silencing neuron X leaves every other driven neuron's input train unchanged, spike for spike.
- Regenerating fixtures twice gives identical bytes.
- Advisory, not gating: the same small graphs in Brian2 with deterministic input give the same spike counts and spike times within one step. Brian2 goes in its own environment. If it does not install cleanly in ten minutes, record a gap in `choices.md` and move on.
- A probe prints wall time for one simulated second on a random graph of 160,000 neurons at 1% activity, so slice 05 can budget its runs.

## Delegated

Vectorisation, the active-set data structure, plot styling. Not delegated: the step order, float width, constants, generator, or anything else in CONTRACTS.md.

## Must stay green

`make check`, which now includes fixture regeneration.

## Feedback that would change this slice

The user wants the noisy FlyBrain formulation instead: noise is a parameter defaulting to zero, so that is a later model version and not a rewrite. The oracle is too slow for slice 05's budget: optimise the active set, never the arithmetic.
