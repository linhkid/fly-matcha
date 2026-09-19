"""Controls are pure functions of a graph and a seed taken from the pre-registration, never from a clock."""

from __future__ import annotations

import numpy as np

from flylab.graph.graph import Graph


def shuffle(graph: Graph, seed: int) -> Graph:
    """The same neurons, the same out-degrees, the same synapse counts leaving each neuron: only WHO receives them is random.

    Every neuron keeps its row: how many targets it has and the multiset of synapse counts it sends. The targets are
    the real graph's targets dealt out again at random, so the in-degree of each neuron is nearly kept as well. A row
    never names the same target twice and never names itself. If the real wiring matters, this graph should not do
    what the real one does.
    """
    rng = np.random.Generator(np.random.PCG64(seed))
    n, e = graph.n, graph.e
    rows = np.repeat(np.arange(n, dtype=np.int64), np.diff(graph.out_offset.astype(np.int64)))
    target = graph.target.astype(np.int64)[rng.permutation(e)]
    for _ in range(200):
        order = np.lexsort((target, rows))
        sorted_rows, sorted_targets = rows[order], target[order]
        bad = np.zeros(e, dtype=bool)
        bad[order[1:]] = (sorted_rows[1:] == sorted_rows[:-1]) & (sorted_targets[1:] == sorted_targets[:-1])
        bad |= target == rows
        if not bad.any():
            break
        target[bad] = rng.integers(0, n, size=int(bad.sum()))
    else:
        raise ValueError("the shuffle did not settle: a row is nearly as long as the graph is wide")
    order = np.lexsort((target, rows))                       # targets ascending within a row, as the format wants
    counts = graph.syn_count.copy()
    offsets = graph.out_offset.astype(np.int64)
    for i in np.flatnonzero(np.diff(offsets) > 1):           # which count goes to which new target is random too
        span = slice(offsets[i], offsets[i + 1])
        counts[span] = rng.permutation(counts[span])
    return Graph(graph.body_id, graph.nt, graph.flags, graph.out_offset, target[order].astype(np.uint32), counts, graph.min_synapses)


def random_population(pool: np.ndarray, size: int, exclude: np.ndarray, seed: int) -> np.ndarray:
    """`size` neurons drawn without replacement from `pool` (indices of the same superclass), none of them in `exclude`."""
    candidates = np.setdiff1d(pool, exclude)
    if len(candidates) < size:
        raise ValueError(f"a population of {size} cannot be drawn from {len(candidates)} candidates")
    rng = np.random.Generator(np.random.PCG64(seed))
    return np.sort(rng.choice(candidates, size=size, replace=False)).astype(np.int64)
