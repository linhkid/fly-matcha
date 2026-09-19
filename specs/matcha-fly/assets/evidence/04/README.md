# Evidence for slice 04, the experiment harness

Accepted 2026-09-19.

| Check of the slice | Result |
|---|---|
| E00 gives one pass, one fail, one "no plateau" | `python -m flylab exp run E00-synthetic`: T1 pass, T2 fail, T3 no plateau. `verdict.json` and `report.html` are copied here |
| Editing the prereg after a confirmation run makes the runner refuse, and says why | `test_changing_the_criteria_after_the_seeds_were_consumed_is_refused`: "A changed experiment is a new experiment" |
| An uncommitted prereg is refused | `test_an_uncommitted_prereg_is_refused_and_consumes_nothing`, against real git; and the first real run of E00 was refused until its prereg was committed (30c6da6) |
| A mechanic switched on without a passed experiment fails `make check` | `test_a_mechanic_cannot_be_switched_on_...`, four ways: no verdict, a failed verdict, a verdict that does not gate it, and the good case. `make check` runs `python -m flylab exp gate` |
| Running E00 twice gives identical `verdict.json` bytes, with no timestamps | checked by hand with `cmp`, and by test with the trial cache deleted in between |
| Deleting `consumed.json` and rerunning is caught | `test_deleting_the_ledger_does_not_reset_an_experiment` |
| The ledger is written before the first confirmation seed | `test_the_ledger_is_written_before_any_confirmation_seed_runs`: the first trial is made to crash, and the ledger is already there |
| Every criterion kind has a test | seven kinds, seven tests, with hand-checkable numbers |
| Controls are pure functions | a shuffle keeps every row's length and its synapse counts, never repeats a target, never points a neuron at itself, and repeats for the same seed; a random population is size-matched, excludes the real one, and repeats |
