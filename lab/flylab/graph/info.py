"""What a person wants to know about a graph file before trusting it (slice 03, "What the human sees")."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from flylab.graph import format as fskg
from flylab.graph.graph import NT_NAMES, Graph


def inputs_by_type(graph: Graph, targets: np.ndarray, types: pd.Series) -> pd.DataFrame:
    """Synapses onto the neurons at ``targets`` (indices), summed by the presynaptic neuron's type.

    ``types`` maps body ID to type name. Returns type, synapses, neurons (how many of the type take part) and nt
    (the majority transmitter of those that do), most synapses first, ties by name.
    """
    onto = np.isin(graph.target, targets)
    pre = np.repeat(np.arange(graph.n), np.diff(graph.out_offset.astype(np.int64)))[onto]
    frame = pd.DataFrame({"pre": pre, "synapses": graph.syn_count[onto].astype(np.int64)})
    frame["type"] = types.reindex(graph.body_id[frame["pre"]]).to_numpy()
    frame["nt"] = [NT_NAMES[code] for code in graph.nt[frame["pre"]]]
    rows = []
    for name, part in frame.groupby("type"):
        per_neuron = part.drop_duplicates("pre")
        counts = per_neuron["nt"].value_counts()
        rows.append({"type": name, "synapses": int(part["synapses"].sum()), "neurons": int(len(per_neuron)),
                     "nt": sorted(counts[counts == counts.max()].index)[0]})
    table = pd.DataFrame(rows, columns=["type", "synapses", "neurons", "nt"])
    return table.sort_values(["synapses", "type"], ascending=[False, True], ignore_index=True)


def describe(path: Path, annotations: pd.DataFrame) -> str:
    graph = fskg.read_graph(path)
    manifest = json.loads(fskg.manifest_path(path).read_text(encoding="utf-8"))
    types = annotations.dropna(subset=["type"]).set_index(annotations.dropna(subset=["type"])["bodyId"].astype(np.uint64))["type"]
    lines = [
        f"{path.name}  sha256 {graph.sha256}",
        f"  neurons {graph.n:,}   edges {graph.e:,}   synapses {int(graph.syn_count.astype(np.int64).sum()):,}   threshold {graph.min_synapses}",
        f"  dropped as untyped: {manifest['filters']['droppedUntypedBodies']:,} bodies;  self-edges dropped: {manifest['filters']['droppedSelfEdges']:,};  "
        f"pairs summed: {manifest['filters']['summedDuplicatePairs']:,};  below threshold: {manifest['filters']['droppedBelowThreshold']:,}",
        "  transmitters: " + ", ".join(f"{name} {count:,}" for name, count in manifest["counts"]["ntHistogram"].items()),
        f"  sign coverage under the base policy: {manifest['counts']['signCoverage']:.1%}",
        f"  neurons with no out-edge: {int((np.diff(graph.out_offset.astype(np.int64)) == 0).sum()):,}",
    ]
    mn9 = np.flatnonzero(np.isin(graph.body_id, types.index[types == "MN9"].to_numpy()))
    if len(mn9):
        lines.append(f"  top inputs to MN9 ({len(mn9)} neurons), by type:")
        for row in inputs_by_type(graph, mn9, types).head(10).itertuples():
            lines.append(f"    {row.type:<14} {row.synapses:>6,} synapses from {row.neurons:>2} neurons   {row.nt}")
    return "\n".join(lines)
