# 04 · Experiment harness

**Question:** can an experiment fail honestly?

Needs slice 02. Needs no data.

## Contract

Delivers the machinery every circuit claim goes through: a pre-registration file, a runner that refuses to be gamed, controls as pure functions, a machine-readable verdict, a rendered report, and the gate that stops an unlicensed mechanic from shipping.

Does not deliver any real experiment.

## Seam

```
flylab.experiments.run(prereg_path) -> Verdict           writes verdict.json and report.html beside the prereg
flylab.experiments.controls:  shuffle(graph, seed) -> Graph           random_population(graph, like, seed) -> indices
flylab.report.render(verdict, tables, figures) -> html
contracts/mechanics.json      [{id, requires: experimentId, enabled}]
```

The `prereg.json` and `verdict.json` formats, the fixed list of criterion kinds and the runner's rules are in the experiments section of CONTRACTS.md. This slice turns them into JSON schemas under `contracts/schemas/` and implements every criterion kind with a test. Layout: `lab/experiments/<id>/{prereg.json, run.py, consumed.json, verdict.json, report.html}`, with bulky run output under an ignored `runs/`.

Rules the runner enforces:

They are listed in CONTRACTS.md. In short: a committed prereg, a `consumed.json` ledger written before the first confirmation seed, pilot seeds that never count, held-out seeds that only decoder and rival checks may touch, a plateau along one swept parameter, reruns as new experiments with fresh seeds, and control seeds that come from the prereg and never from a clock.

## What the human sees

`python -m flylab exp run E00-synthetic` on a built-in eight-neuron graph where group X drives a readout and group Y inhibits it. The report shows one true claim passing, one false claim failing, and one claim that passes at a single weight being rejected as "no plateau".

## Verification

- E00 gives exactly those three outcomes.
- Editing the prereg after a confirmation run makes the runner refuse, with a message that says why.
- Enabling a mechanic in `contracts/mechanics.json` whose experiment has no `pass` verdict makes `make check` fail.
- Running E00 twice gives identical `verdict.json` bytes. There are no timestamps in it.
- Deleting `consumed.json` and rerunning is caught: the runner refuses when a `verdict.json` exists for a prereg hash with no ledger.

## Delegated

Report styling, plotting library, how run output is cached.

## Must stay green

`make check`, which now includes the mechanics gate.

## Feedback that would change this slice

The user finds the pre-registration ceremony too heavy for a hobby project. The cheap form is already the one specified: criteria are a JSON block committed before the confirmation seeds run. Do not make it cheaper than that; FlyBrain's README records two separate occasions where a loose criterion passed a wrong result.
