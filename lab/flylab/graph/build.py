"""Build the whole-brain graph from the three source files (contracts/GRAPH.md, "How the full graph is built").

Sole owner of what goes into a full graph. Every filter is counted, and the counts go into the manifest, so that
nobody has to take the numbers on trust. The build is deterministic: same sources, same bytes, same SHA-256.
"""

from __future__ import annotations

import subprocess
from collections.abc import Callable
from pathlib import Path

import numpy as np
import pandas as pd
import pyarrow as pa

from flylab import REPO_ROOT
from flylab.data.fetch import ANNOTATIONS, DATASET, TRANSMITTERS, WEIGHTS, file_hashes
from flylab.graph.graph import NT_NAMES, Graph, GraphError

MIN_SYNAPSES = 5
NONZERO_SIGN = ("acetylcholine", "gaba", "glutamate", "histamine")  # the transmitters the base policy gives a sign


def neurons_of(annotations: pd.DataFrame, transmitters: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, int]:
    """(ascending body IDs of the typed bodies, their transmitter codes, how many bodies were dropped as untyped)."""
    typed = annotations.loc[annotations["type"].notna(), "bodyId"].to_numpy(dtype=np.uint64)
    body = np.sort(typed)
    if len(body) > 1 and (body[1:] == body[:-1]).any():
        raise GraphError("a body ID appears twice in the annotation table")
    code = {name: i for i, name in enumerate(NT_NAMES)}
    named = transmitters["consensus_nt"].astype("string").str.lower().map(code).fillna(0).astype(np.uint8)
    by_body = pd.Series(named.to_numpy(), index=transmitters["body"].to_numpy(dtype=np.uint64))
    by_body = by_body[~by_body.index.duplicated()]
    nt = by_body.reindex(body).fillna(0).to_numpy(dtype=np.uint8)
    return body, nt, int(len(annotations) - len(body))


def edges_of(batches, body: np.ndarray, min_synapses: int, progress: Callable[[int], None] | None = None) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    """(out_offset, target, syn_count, counts) from batches of (body_pre, body_post, weight) arrays."""
    n = len(body)
    keys, weights, rows = [], [], 0
    for pre, post, weight in batches:
        pre, post = np.asarray(pre, dtype=np.uint64), np.asarray(post, dtype=np.uint64)   # searchsorted against int64 would go through float64 and merge IDs above 2^53
        rows += len(pre)
        if n == 0:
            continue
        i = np.searchsorted(body, pre)
        j = np.searchsorted(body, post)
        i[i == n] = 0
        j[j == n] = 0
        both = (body[i] == pre) & (body[j] == post)
        keys.append(i[both].astype(np.uint64) * np.uint64(n) + j[both].astype(np.uint64))
        weights.append(weight[both].astype(np.int64))
        if progress:
            progress(rows)
    key = np.concatenate(keys) if keys else np.zeros(0, np.uint64)
    weight = np.concatenate(weights) if weights else np.zeros(0, np.int64)
    del keys, weights
    between_typed = len(key)
    order = np.argsort(key, kind="stable")
    key, weight = key[order], weight[order]
    del order
    first = np.ones(len(key), dtype=bool)
    first[1:] = key[1:] != key[:-1]
    summed_pairs = int(len(key) - first.sum())               # rows that repeated a pair already seen
    starts = np.flatnonzero(first)
    weight = np.add.reduceat(weight, starts) if len(key) else weight
    key = key[starts]
    pre, post = (key // np.uint64(n)).astype(np.int64), (key % np.uint64(n)).astype(np.int64)
    strong = weight >= min_synapses
    own = pre == post
    keep = strong & ~own
    if keep.any() and weight[keep].max() > 65535:
        raise GraphError(f"a pair has {int(weight[keep].max())} synapses, more than the file can hold")
    # every pair is counted once: a self-edge is a self-edge whatever its size, and only the others can fall below the threshold
    counts = {"weightsRows": rows, "rowsBetweenTyped": between_typed, "summedDuplicatePairs": summed_pairs,
              "droppedSelfEdges": int(own.sum()), "droppedBelowThreshold": int((~strong & ~own).sum())}
    pre, post, weight = pre[keep], post[keep], weight[keep]   # still sorted by (pre, post): rows ascending, targets ascending within a row
    out_offset = np.zeros(n + 1, dtype=np.uint32)
    np.cumsum(np.bincount(pre, minlength=n), out=out_offset[1:])
    return out_offset, post.astype(np.uint32), weight.astype(np.uint16), counts


def _weight_batches(path: Path):
    with pa.memory_map(str(path)) as source:
        reader = pa.ipc.open_file(source)
        wanted = [reader.schema.get_field_index(name) for name in ("body_pre", "body_post", "weight")]  # type_pre and type_post are not ours to read
        for index in range(reader.num_record_batches):
            batch = reader.get_batch(index)
            yield tuple(batch.column(k).to_numpy(zero_copy_only=False).astype(np.uint64 if name != "weight" else np.int64)
                        for k, name in zip(wanted, ("body_pre", "body_post", "weight")))


def _git_rev() -> str:
    try:
        return subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO_ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def build_full(raw_dir: Path, min_synapses: int = MIN_SYNAPSES, progress: Callable[[int], None] | None = None) -> tuple[Graph, dict]:
    """The whole-brain graph and the manifest that goes beside its file (without the ``graph`` block, which the writer adds)."""
    annotations = pd.read_feather(raw_dir / ANNOTATIONS, columns=["bodyId", "type"])
    transmitters = pd.read_feather(raw_dir / TRANSMITTERS, columns=["body", "consensus_nt"])
    body, nt, untyped = neurons_of(annotations, transmitters)
    out_offset, target, syn_count, counts = edges_of(_weight_batches(raw_dir / WEIGHTS), body, min_synapses, progress)
    graph = Graph(body, nt, np.zeros(len(body), dtype=np.uint8), out_offset, target, syn_count, min_synapses=min_synapses)
    histogram = {name: int((nt == code).sum()) for code, name in enumerate(NT_NAMES)}
    signed = sum(histogram[name] for name in NONZERO_SIGN)
    sources = []
    for name in (ANNOTATIONS, TRANSMITTERS, WEIGHTS):
        sha, _ = file_hashes(raw_dir / name)
        sources.append({"file": name, "sha256": sha, "bytes": (raw_dir / name).stat().st_size})
    sources_of_the_bytes = [Path(__file__), Path(__file__).with_name("format.py"), Path(__file__).with_name("graph.py")]
    manifest = {
        "kind": "full",
        "dataset": {"name": "MaleCNS", "version": "1.0", "license": "CC-BY 4.0", "attribution": DATASET},
        "sources": sources,
        "filters": {"droppedUntypedBodies": untyped, **counts},
        "counts": {"ntHistogram": histogram, "unknownNt": histogram["unknown"], "signCoverage": round(signed / max(len(body), 1), 6)},
        # what made the bytes: the builder, the layout and the transmitter codes. A git revision alone says nothing of uncommitted work.
        "exporter": {"gitRev": _git_rev(), "sourceSha256": {path.name: file_hashes(path)[0] for path in sources_of_the_bytes}},
        "synthetic": False,
    }
    return graph, manifest
