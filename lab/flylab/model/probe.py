"""``python -m flylab model probe``: how long one simulated second takes on a brain-sized random graph."""

from __future__ import annotations

import time

import numpy as np

from flylab.graph import Graph
from flylab.model import oracle
from flylab.model.spec import load_model


def random_graph(n: int, out_degree: int, seed: int, mean_synapses: float = 13.0) -> Graph:
    rng = np.random.default_rng(seed)
    targets = np.sort(rng.integers(0, n, size=(n, out_degree), dtype=np.int64), axis=1)
    keep = np.ones_like(targets, dtype=bool)
    keep[:, 1:] = targets[:, 1:] != targets[:, :-1]                     # drop duplicate targets within a row
    offsets = np.concatenate([[0], np.cumsum(keep.sum(axis=1))])
    counts = np.minimum(5 + rng.geometric(1.0 / max(mean_synapses - 5.0, 1.0), size=int(keep.sum())), 2000)
    return Graph(body_id=np.arange(1, n + 1, dtype=np.uint64) * np.uint64(7), nt=rng.choice(np.array([1, 2, 3], dtype=np.uint8), size=n, p=[0.72, 0.2, 0.08]),
                 flags=np.zeros(n, dtype=np.uint8), out_offset=offsets.astype(np.uint32), target=targets[keep].astype(np.uint32),
                 syn_count=counts.astype(np.uint16), min_synapses=5)


def run(n: int = 160_000, out_degree: int = 25, inputs: int = 400, rate_hz: int = 100, steps: int = 10_000, mean_synapses: float = 13.0) -> dict:
    """``mean_synapses`` decides whether activity propagates: at 13 only the input neurons fire; by 60 it spreads."""
    began = time.perf_counter()
    graph = random_graph(n, out_degree, seed=1, mean_synapses=mean_synapses)
    built = time.perf_counter() - began
    sim = oracle.Sim(graph, load_model(), 1).drive(np.arange(inputs), int(rate_hz * 0.1 * 65.536), 0, steps)
    restless, spikes, began = [], 0, time.perf_counter()
    for _ in range(steps // 100):
        spikes += len(sim.step(100)[0])
        restless.append(sim.restless)
    wall = time.perf_counter() - began
    forced = int(inputs * rate_hz * steps / 10_000)
    return {"neurons": n, "edges": graph.e, "buildSeconds": round(built, 1), "steps": steps, "simulatedSeconds": steps / 10_000,
            "wallSeconds": round(wall, 1), "spikes": spikes, "ofWhichForcedRoughly": min(forced, spikes), "spikesPerStep": round(spikes / steps, 1),
            "restlessNeuronsMean": int(np.mean(restless)), "restlessShare": round(float(np.mean(restless)) / n, 4)}
