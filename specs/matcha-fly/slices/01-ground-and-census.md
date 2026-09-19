# 01 · Ground and census

**Question:** do the cast members of the taste circuit exist in MaleCNS under names we can bind with independent evidence?

**Kill point: names.** This is the slice most likely to reshape the plan, so it runs on the small download only.

## Contract

Delivers a working repository, the two small data files with provenance, and a census that binds every role a later slice needs to body IDs, or says plainly that it cannot.

Does not deliver the connection weights (03), any simulation (02), or groups defined by connectivity, such as "the relays upstream of MN9". Those need weights and are added by the same census module in slice 03.

## Steps

0. **Ground.** `git init`. `.gitignore` for `data/raw/`, `data/built/full/`, `.venv/`, `node_modules/`, `lab/experiments/*/runs/`. `python3 -m venv .venv` and a pinned `lab/requirements.txt` (start from `../fly-escape/scripts/requirements.txt`: numpy, pandas, pyarrow, scipy; add matplotlib and pytest). A `Makefile` with `check`. A root `README.md` of one screen and a `CLAUDE.md` that carries the nine rules from the spec README. `uv`, `bun` and `wasm-pack` are not installed on this machine and are not needed.
1. **Consent, stage A.** Print and ask before fetching:
   - `body-annotations-male-cns-v1.0-minconf-0.5.feather`, 14.5 MB
   - `body-neurotransmitters-male-cns-v1.0.feather`, 43 MB
   - source `https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/`
2. **Fetch.** Streamed, written to `.part`, size and md5 checked against the `x-goog-hash` header, then renamed. Port the shape of `../fly-escape/scripts/connectome/download.py`. A second run is a no-op.
3. **Look before binding.** Print every column of the annotation file with its non-null count and ten sample values. Find any synonym, FlyWire-type or dimorphism column. RESEARCH.md expects one to exist because another project located FlyWire nicknames in this dataset.
4. **Census.** Bind the roles in the table below into `circuits/taste.lock.json`, in the lock format from CONTRACTS.md, and render `circuits/taste.census.html`.

**Pre-written pass:** `mn9`, `grn.sweet` and `grn.bitter` each bind with evidence of kind `paper` or `annotation`; no required role fails; every anchor mismatch is explained in the report. Anything less is a fail, and the fallback at the bottom applies.

## Seam

```
flylab.data.fetch:   plan(stage) -> [SourceRequest]      run(stage, consent: bool) -> [SourceRecord]
                     SourceRecord {file, url, bytes, md5, sha256, generation}  -> data/raw/sources.json
flylab.census:       census(circuit, annotations, nt) -> Lock | [Failure]
```

`circuits/taste.circuit.json`, one entry per role:

```json
{ "id": "mn9", "role": "readout",
  "select": {"type": ["MN9"], "side": "any", "bodyIds": null},
  "expect": {"count": 2, "perSide": 1, "nt": "acetylcholine"},
  "required": true,
  "evidence": {"claim": "rostrum protractor motor neuron", "source": "<paper, table or URL>", "kind": "annotation|paper|crosswalk"},
  "explain": "plain-language sentence for the card" }
```

`Lock = {annotationsSha256, groups: [{id, bodyIds[] as decimal strings, perSide, ntHistogram}]}`. Failures are data: `{group, code: TYPE_NOT_FOUND | COUNT_OUT_OF_RANGE | NT_MISMATCH | SIDE_IMBALANCE | BODYID_ABSENT | OVERLAP, found, nearest[]}`. `nearest` exists to catch `DNg12` → `DNg12_a`. Any failure on a `required` role exits non-zero and writes no lock. Side, transmitter matching and tie-breaking follow the circuit lock section of CONTRACTS.md. Sensory neurons have their cell bodies outside the volume, so their side usually comes from `rootSide` or the entry nerve.

Roles to bind. This was the starting table, written before the data was seen. The accepted bindings, with their evidence, are in `circuits/taste.circuit.json`; the Outcome section at the end says what changed.

| Role | Starting point | Required |
|---|---|---|
| `mn9` | type `MN9`; expect 1 left, 1 right, acetylcholine | yes |
| `mn.proboscis.other` | `MN4a`, `MN7`, `MN8` and any other proboscis motor neuron found | no |
| `grn.bitter` | labellar bristle `LB1*`. A planning draft read the taste-feeding preprint as mapping Gr33a bitter to LB1a–e. Verify from the paper's own table | yes |
| `grn.sweet` | `LB3c`. The same draft read Gr64f sugar as LB3b–c | yes |
| `grn.sweet.maybe` | `LB3b`, which that reading also gives to low salt. A body may sit in only one `grn.*` group, so `LB3b` stays out of both required groups until the paper settles it | no |
| `grn.water`, `grn.other` | `LB3a`, `LB3d` by the same reading. Verify | no |
| `grn.pharyngeal`, `grn.tastepeg`, `grn.tarsal` | by `class`, `subclass`, `entryNerve`. Tarsal neurons enter by the leg nerves | no |
| `touch.tastebristle` | `BM_Taste`. Mechanosensory, **not taste** (Eichler, Hampel et al. 2025) | no |
| informational | `BM_InOm` and other `BM_*`, `DNg12_*`, `IN13A*`, `IN13B*`, T1 leg motor neurons, Kenyon cells, MBONs, PAM, PPL1, `pIP10`, `mAL*` | no |

Identity comes from annotations and papers only. **Never bind a taste population by its effect on MN9**: that would make slice 05's headline true by construction.

## What the human sees

`python -m flylab census taste` writes `circuits/taste.census.html`: one card per role with counts per side, transmitter and confidence, which column matched, the evidence, and a link to the cell type explorer. Below it, an alias table of literature names (Usnea, Rattle, Phantom, G2N-1, Fdg, aBN1, aDN1, DNg11, DNg12) against the MaleCNS type that carries them, or "none".

## Verification

- Unit tests on synthetic annotations, one per failure code. The lock is byte-stable across runs.
- A flipped byte in a downloaded file is refused.
- Anchors seen on the explorer on 2026-09-18: `MN9` 2, `LB1a` 11, `LB3a` 17, `LB3d` 26, `BM_Taste` 40, `BM_InOm` 745. A mismatch is explained in the report, not silently accepted.
- The report explains one known discrepancy: flyverse-core counts "165 labellar sugar GRNs" while the explorer shows `LB3c` at 23.
- `DNg11` is flagged as a name collision: in MaleCNS it is predicted GABAergic with visual inputs and no foreleg output, which does not fit a leg-rubbing command neuron.

## Delegated

Internal structure, regexes, the nearest-name metric, HTML styling, exact dependency pins.

## Must stay green

`make check`. No file under `data/raw/` is tracked.

## Feedback that would change this slice

The user declines the download: only slices 02, 04 and the fixture half of 08 can proceed. The user can supply the gustatory paper's supplementary tables: they become the evidence source and the answer key for slice 05. Sweet or bitter cannot be bound independently: record it, and slice 05 uses its "labelled by effect" fallback.

## Outcome

**Accepted 2026-09-19. Verdict: pass.** `mn9`, `grn.bitter` and `grn.sweet` are bound on evidence from the taste-feeding preprint, read first-hand; all 29 roles bind; all 7 anchors match. Evidence is in `../assets/evidence/01/`, the findings are summarised in `../RESEARCH.md` under "Name census", and the decisions made where this slice was silent are in `../choices.md`.

What the data changed in the plan:
- Sweet is `LB3b` and `LB3c` together, and `LB3d` is aversive despite its name, so the table above was too coarse. The circuit file is the record now.
- `LB1b`, six of the 38 bitter neurons, has no usable transmitter label. Slice 05's second arm exists for cases like this.
- Literature nicknames resolve through the `synonyms` column, so slice 03 can check its wiring-derived relay groups against `relay.shiu2022`.
- Side comes from `rootSide` for taste neurons. CONTRACTS.md was corrected.
