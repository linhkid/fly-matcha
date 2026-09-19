# Evidence

One folder per accepted slice or branch, named by its number: `01/`, `05/`, `b2/`. A slice that is re-accepted after a reslice gets a suffix: `05-rerun/`.

Each folder holds what the slice was judged on, copied here so the record does not depend on files that later change:

- the report, shot or probe output the slice names under "What the human sees";
- `verdict.json` for experiment slices, passed or failed;
- for visual slices, the screenshot, the critique it received and, where a target existed, the comparison;
- a `README.md` of a few lines: the commit it was made at, the verdict in one sentence, and anything a later reader must know.

Failed attempts stay. They are part of the evidence.
