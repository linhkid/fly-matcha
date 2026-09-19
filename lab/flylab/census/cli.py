"""``python -m flylab census <circuit>``: read files, run the census, write the lock and the report."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from flylab.census import binding, report
from flylab.census.columns import describe_tables
from flylab.data.fetch import ANNOTATIONS, DATASET, TRANSMITTERS, file_hashes


def run_census(name: str, raw_dir: Path, circuits_dir: Path) -> int:
    """Exit code 0 only when the lock was written and the census gate passed."""
    lock_path = circuits_dir / f"{name}.lock.json"
    report_path = circuits_dir / f"{name}.census.html"
    lock_path.unlink(missing_ok=True)  # never leave an old lock beside a run that fails, however it fails

    circuit = json.loads((circuits_dir / f"{name}.circuit.json").read_text(encoding="utf-8"))
    annotations = pd.read_feather(raw_dir / ANNOTATIONS)
    transmitters = pd.read_feather(raw_dir / TRANSMITTERS)

    result = binding.census(circuit, annotations, transmitters)
    anchors = binding.check_anchors(circuit, result.frame)
    gate = binding.gate(circuit, result, anchors)
    annotations_sha, transmitters_sha = file_hashes(raw_dir / ANNOTATIONS)[0], file_hashes(raw_dir / TRANSMITTERS)[0]

    if not result.required_failures:
        lock_path.write_text(binding.dump_lock(binding.build_lock(circuit, result, annotations_sha, transmitters_sha)), encoding="utf-8")
    provenance = {"dataset": DATASET, "annotationsSha256": annotations_sha, "annotated": len(annotations), "typed": len(result.frame)}
    report_path.write_text(report.render(
        circuit, result, anchors, binding.resolve_aliases(circuit, result.frame), gate,
        binding.inventory(circuit, result.frame), provenance,
        describe_tables({ANNOTATIONS: annotations, TRANSMITTERS: transmitters}),
    ), encoding="utf-8")

    print(f"{len(result.bound)} roles bound, {len(result.failures)} failures ({len(result.required_failures)} on required roles)")
    for failure in result.failures:
        suggestion = f"  nearest: {failure.nearest}" if failure.nearest else ""
        print(f"  {'REQUIRED ' if failure.required else ''}{failure.group}: {failure.code} {failure.found}{suggestion}")
    print("census gate:", "PASS" if gate["pass"] else "FAIL")
    for reason in gate["reasons"]:
        print("  -", reason)
    print(f"report: {report_path}")
    print(f"lock:   {lock_path if lock_path.exists() else 'not written'}")
    return 0 if gate["pass"] else 1
