# Evidence: slice 01, ground and census

**Accepted 2026-09-19. Census gate: pass.** Committed by the user as `fcb42f6` (`fcb42f680ebe85d1cdf7b6a75f83731fe99a59ad`), the repository's root commit, which also holds the whole plan. The evidence was taken on that tree just before it was committed.

- `taste.census.html` is the report the slice was judged on: 29 of 29 roles bound, the three gating roles (`mn9`, `grn.bitter`, `grn.sweet`) on independent evidence, 7 of 7 anchors matching.
- `source-columns.txt` is the "look before binding" dump of both source tables.
- Circuit file sha256 `1a5248a2701fd12028e0d99599b3fd720dfcd98bfa9552b7bdf8fb32e5e8071e`. Lock sha256 `08cb35784118d54d8466aa6a8c619c371f8e19e3d40d2d78fcb5a780a07158b7`. Source file hashes are in the lock and in `data/raw/sources.json`.
- `make check`: 53 tests passing, data guard passing. The lock regenerates byte for byte.

How the gating evidence was read: the Cell paper and bioRxiv refused automated reads. The bioRxiv preprint (10.1101/2025.08.25.671814) was read in full through its open copy at Europe PMC, record PPR1072256, on 2026-09-19. The assignments it makes are the authors' proposals from matching neuron shapes to light-microscopy images of receptor lines. They are not recordings. The census cards say so.

Review: an independent reviewer with no context read the first version of the code and found four things that had to change before acceptance. Overlap detection between taste groups depended on the order of the file. A misspelt key in the circuit file could silently widen a binding or switch off a check. The command's failure path and two selectors were untested. Several evidence claims said more than their sources. All were fixed, with tests, before this evidence was taken.

Gate not run: `screenshot-critique`. No screenshot tooling is installed yet; Playwright arrives in slice 06 and needs the user's yes. The report was checked by eye at desktop width.
