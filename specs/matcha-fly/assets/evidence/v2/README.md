# Evidence for slice V2, first light

Accepted 2026-09-19, the day the user approved the 508 MB of wiring. The human checkpoint is open.

## What was checked

| Check of the slice | Result |
|---|---|
| Every recording's `spikeHash` is reproduced by rerunning its spec | `lab/tests/test_recordings.py` reruns two of the 25 on every `make check` (about three seconds each); the index test holds every file to the hash the index names |
| Light equals the spike counts in the stated window; zero spikes, zero light | `web/tests/replay.test.ts`: hand-checked windows on a ten-spike recording, the sip with nothing in it is an empty recording, and a replay long past its last spike is dark |
| Undrawable spikes plus drawn ones equal the recording's length | `replay.test.ts`, "counts what has happened so far" |
| The bundle stays under 30 MB | 5.7 MB for 25 recordings of 300 ms each |
| A pilot trial is timed | about 3 s for 300 ms of his time on one core, so about 10 s per simulated second. Written into slice 05 |
| His stay follows the recording | `replay.test.ts`: shortest where MN9 never fires, longest where it fires to the end, and his lips leave the tea one breath after MN9's last spike. `LINGER_SECONDS` is deleted |
| The cup stays full and the proboscis stays in | unchanged from V1: `web/tests/puppet.test.ts` |
| **One rule, two implementations, on real data** | for two sips, every spike the browser's engine says the tea forces (same seed) is in the lab's whole-brain recording, and the recording never lacks one. This was owed since choices K9 |
| The recordings are of this codec, this model and this lock | `test_recordings.py`, without needing the graph: the index's hashes of the codec and of the lock are compared with the files, every spec is rebuilt from the current codec, and every spike hash is recomputed from the spikes |
| `make check` | 150 Python tests, 62 web tests, the type check, the data guard: green |

## What the recordings show: a pilot, not a verdict

One seed, no control, base model, 300 ms of his time per sip. MN9 spikes across the grid:

| | sweet 0 | sweet 1 | sweet 2 | sweet 3 | sweet 4 |
|---|---|---|---|---|---|
| **bitter 0** | 0 | 5 | 0 | 12 | **24** |
| **bitter 1** | 0 | 1 | 0 | 1 | **25** |
| **bitter 2** | 0 | 0 | 0 | 0 | 5 |
| **bitter 3** | 0 | 0 | 0 | 0 | 0 |
| **bitter 4** | 0 | 0 | 0 | 0 | 0 |

Sweet reaches the motor neuron that lifts his proboscis; bitter brakes it, and from bitter 3 upwards no sweetness gets through. That is the published result for the female brain, seen here on the male wiring. It is also one seed: sweet 2 gave nothing where sweet 1 gave five, and some sips recruit three thousand neurons where their neighbours recruit two hundred. Slice 05 exists to find out what of this survives seeds, a shuffled wiring and a one-line rival. Nothing may be tuned because of how this table looks.

## The shots

`frame-sweet.jpg`, `frame-bitter.jpg`, `frame-sweet-and-bitter.jpg`: whole frames during tasting. `clouds-sweet-vs-both.jpg`: the cloud up close for sweet 4 alone and with bitter 4. `order-of-firing.jpg`, the slice's visual variable: three moments of one replay. Light starts near the taste centre at the front of the brain, spreads through the brain, and then runs down the nerve cord. Taken headless with the installed Chrome from still addresses, as in V1.

## Fresh eyes

A workflow of three reviewers with an adversarial verifier per finding went over slices 03 and V2: nineteen findings, nine verified before the account's spending limit stopped the rest, all nine real. All nineteen were then fixed by hand; choices R1 lists them. The one that mattered most: the card said "he stays until MN9 has fallen silent" of every bowl, and that was false for nineteen of the twenty-five, because in seventeen MN9 never fires and in two it is still firing when the longest stay ends. The card now gives the true reason, with the number it comes from beside it.

## Open: the human checkpoint

Can a newcomer see the order in which things fired? Non-blocking.
