"""``python -m flylab census <circuit>``: read files, run the census, write the lock and the report."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from flylab.census import binding, connectivity, report
from flylab.census.columns import describe_tables
from flylab.data.fetch import ANNOTATIONS, DATASET, TRANSMITTERS, file_hashes
from flylab.graph.format import read_graph


def run_census(name: str, raw_dir: Path, circuits_dir: Path) -> int:
    """Exit code 0 only when the lock was written and the census gate passed."""
    lock_path = circuits_dir / f"{name}.lock.json"
    report_path = circuits_dir / f"{name}.census.html"
    try:
        earlier = json.loads(lock_path.read_text(encoding="utf-8")) if lock_path.exists() else None
    except ValueError:
        earlier = None  # whatever was there was not a lock
    lock_path.unlink(missing_ok=True)  # never leave an old lock beside a run that fails, however it fails

    circuit = json.loads((circuits_dir / f"{name}.circuit.json").read_text(encoding="utf-8"))
    annotations = pd.read_feather(raw_dir / ANNOTATIONS)
    transmitters = pd.read_feather(raw_dir / TRANSMITTERS)

    result = binding.census(circuit, annotations, transmitters)
    anchors = binding.check_anchors(circuit, result.frame)
    gate = binding.gate(circuit, result, anchors)
    annotations_sha, transmitters_sha = file_hashes(raw_dir / ANNOTATIONS)[0], file_hashes(raw_dir / TRANSMITTERS)[0]

    if not result.required_failures:
        lock = binding.build_lock(circuit, result, annotations_sha, transmitters_sha)
        graph_path = raw_dir.parent / "built" / "full" / "malecns.fskg"
        if graph_path.exists() and connectivity.READOUT in result.bound:   # hubs and hop depths need the whole-brain graph of slice 03
            graph = read_graph(graph_path)
            lock = connectivity.bind_connectivity(lock, graph, result.frame)
            silent = connectivity.without_outputs(graph, lock, connectivity.taste_populations(lock))
            print("connectivity: bound against graph", graph.sha256[:16], "·", ", ".join(f"{g['id']} {len(g['bodyIds'])}" for g in lock["groups"] if g["evidenceKind"] == "connectivity"))
            print("taste neurons with no out-edge in the graph:", {k: len(v) for k, v in silent.items()})
        elif earlier and earlier.get("graphSha256"):
            # No graph here, so hubs and hop depths cannot be counted. The earlier lock had them. Keep it if what the
            # annotations decide has not changed, and refuse to put a lock without them in its place if it has.
            same = [g for g in earlier["groups"] if g["evidenceKind"] != "connectivity"] == lock["groups"] \
                and (earlier["annotationsSha256"], earlier["transmittersSha256"]) == (annotations_sha, transmitters_sha)
            if not same:
                print("The annotations now bind differently, and the whole-brain graph is not here to count hubs and hop depths again.")
                print("Build it first: python -m flylab data fetch --stage B --yes  (508 MB, ask first), then python -m flylab graph build")
                lock_path.write_text(binding.dump_lock(earlier), encoding="utf-8")
                return 1
            print("connectivity: NOT counted again, because the whole-brain graph is not here. The annotation layer is unchanged, so the earlier hubs and hop depths are kept.")
            lock = earlier
        lock_path.write_text(binding.dump_lock(lock), encoding="utf-8")
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
