"""What an experiment runs on: a graph, the groups a trial may name, and pools to draw control populations from."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field

import numpy as np

from flylab import CIRCUITS_DIR, RAW_DIR, REPO_ROOT
from flylab.graph.graph import Graph, from_edges
from flylab.model.oracle import Members, members

FULL_GRAPH = REPO_ROOT / "data" / "built" / "full" / "malecns.fskg"


@dataclass
class World:
    name: str
    graph: Graph
    groups: dict[str, Members]
    codec: dict | None = None
    lock_sha256: str | None = None
    codec_sha256: str | None = None
    pools: dict[str, np.ndarray] = field(default_factory=dict)   # group id -> indices of every neuron of that group's superclass


def e00() -> World:
    """Eight neurons. X excites the readout R, Y inhibits it, and two bystanders do nothing. Built in, so the harness can be tested with no data."""
    ach, gaba = "acetylcholine", "gaba"
    neurons = {1: ach, 2: ach, 3: gaba, 4: gaba, 5: ach, 6: ach, 7: ach, 8: ach}
    edges = [(1, 5, 70), (2, 6, 70), (1, 6, 40), (2, 5, 40), (3, 5, 90), (4, 6, 90), (3, 6, 60), (4, 5, 60)]
    graph = from_edges(neurons, edges)
    index = {body: i for i, body in enumerate(sorted(neurons))}
    groups = {"x": members([index[1], index[2]], "LR"), "y": members([index[3], index[4]], "LR"), "r": members([index[5], index[6]], "LR")}
    return World("e00", graph, groups, pools={"x": np.array([index[7], index[8], index[3], index[4]])})


def full(circuit: str = "taste") -> World:
    """The whole brain, the circuit's lock resolved against it, the codec, and the sensory pools the controls draw from."""
    import pandas as pd

    from flylab.census import connectivity
    from flylab.codec.build import CODEC_PATH, load_codec
    from flylab.data.fetch import ANNOTATIONS
    from flylab.graph.format import read_graph

    graph = read_graph(FULL_GRAPH)
    lock_bytes = (CIRCUITS_DIR / f"{circuit}.lock.json").read_bytes()
    groups = connectivity.resolve(json.loads(lock_bytes), graph)
    annotations = pd.read_feather(RAW_DIR / ANNOTATIONS, columns=["bodyId", "type", "superclass"])
    typed = annotations[annotations["type"].notna()]
    superclass = typed.set_index(typed["bodyId"].astype(np.uint64))["superclass"].reindex(graph.body_id).to_numpy()
    pools = {}
    for name, group in groups.items():
        if name.startswith("grn.") and len(group.indices):
            kinds = pd.Series(superclass[group.indices]).mode()
            pools[name] = np.flatnonzero(superclass == kinds.iloc[0])
    return World("full", graph, groups, load_codec(), hashlib.sha256(lock_bytes).hexdigest(), hashlib.sha256(CODEC_PATH.read_bytes()).hexdigest(), pools)


def load(name: str) -> World:
    if name == "e00":
        return e00()
    if name == "full":
        return full()
    raise ValueError(f"no such world: {name}")
