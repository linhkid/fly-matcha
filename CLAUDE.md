# fly-sim-k: what to know before touching it

The plan is the source of truth: `specs/matcha-fly/README.md` has a "Next Agent Prompt" with the current pickup point. `specs/matcha-fly/CONTRACTS.md` says who owns each concept and fixes the formats. `specs/matcha-fly/choices.md` records every decision made where the spec was silent; append to it when you make one.

## The rules

1. **Biology → simulation → observed behaviour → game design.** A mechanic ships only on an experiment that was written down first, had a control, and passed. Design around what the circuit does.
2. **Nothing looks like neural activity unless it is.** Every spike on screen comes from a live engine run or a recording, with its seed. Zero spikes means zero glow.
3. **The artifact holds facts. Everything else is ours, and says so.** Counts, transmitter labels and body IDs come from the connectome. Signs, weights, doses and decoders are the model. Sequence and puppetry are staged. The tags are data.
4. **One owner per concept.** Two implementations of the neuron model, the Python oracle and the browser engine, agreeing bit for bit. A mismatch is a bug to find, never a tolerance to loosen.
5. **Versions, not tweaks.** Changing `dt`, the synapse threshold, a sign or the weight makes a new model or artifact version and re-runs what depends on it.
6. **Every shipped circuit meets its one-line rival,** and the comparison is shown.
7. **The model has no memory, hunger or learning.** Sequence in the ceremony is staged and says so.
8. **Raw data is never committed. Downloads need the user's yes in that session,** including package installs.
9. **No backward compatibility and no migrations.** Hard cutovers.

## Working here

- `make check` is green at the end of every slice.
- Never bind a population by what it does in a simulation. Identity comes from annotations and papers; the census (`lab/flylab/census/`) records the evidence for every group.
- Names mislead. `BM_Taste` is touch, `DNg11` is not the grooming neuron of the papers, and FlyWire nicknames live only in the `synonyms` column. Check `circuits/taste.census.html` before designing around a name.
- A failed experiment is a result. Record it, follow the slice's fallback, move on. Do not tune until green.
