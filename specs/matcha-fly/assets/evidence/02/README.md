# Evidence: slice 02, model and oracle

**Accepted 2026-09-19.** Committed by the user as `3b7d9d0`.

- `model-check.html` is the report for a person. The oracle's potential follows the analytic curve of the published model to about 1e-15 mV. The rate plot is a landmark, not a test: this model has no constant input, so no exact curve exists to compare with. The third plot shows the 22-step freeze with an arrival kept.
- `probe.txt` is one simulated second of a random graph with 160,000 neurons and 4 million edges, in three regimes.
- 58 fixtures under `contracts/fixtures/`. Each lif fixture was written only after the dense update and the active-set update agreed at every step, and after its own assertions about what it claims to show. They regenerate byte for byte.
- `make check`: 88 tests passing, data guard passing.

How it was checked beyond its own tests:

- The generator reproduces the three vectors in Random123's own `tests/kat_vectors`, read on 2026-09-19.
- An independent reviewer wrote a second, scalar engine from `contracts/MODEL.md` and `contracts/TRIAL.md` alone. It reproduced every traced bit, hash and generator sample of the first fixture set, and agreed with the oracle on 60 random trials. That is the strongest evidence that the two documents are enough for the browser engine.
- The same reviewer found behaviours that nothing pinned: an input neuron that also receives synapses, the strict comparison that forces a spike, half of the snap rule, most of the refusal table, and a threshold fixture whose "peak" was not the peak. All were fixed with fixtures and tests.
- A mutation run breaks the model in 31 ways in a scratch copy. 30 are caught. The survivor removes an optimisation and changes no result.

Not done: the advisory cross-check against Brian2, because installing it is a download nobody approved. `contracts/MODEL.md` says what that leaves unchecked.
