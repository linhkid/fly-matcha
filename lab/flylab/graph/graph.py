"""The in-memory graph: exactly the fields of the ``.fskg`` file (contracts, "Graph artifact").

It holds facts only. No signs, no weights, no group names: those belong to the
model and to the circuit lock. Fixture graphs are built with ``from_edges``; the
file-backed loader of slice 03 returns this same type.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# transmitter codes of the graph format, by position
NT_NAMES = ("unknown", "acetylcholine", "gaba", "glutamate", "histamine", "dopamine", "octopamine", "serotonin")
SENTINEL = 1  # flags bit 0: simulated, out-edges omitted


class GraphError(ValueError):
    """The arrays do not describe a well-formed graph."""


@dataclass(frozen=True)
class Graph:
    body_id: np.ndarray     # uint64[N], strictly ascending; a neuron's index is its rank
    nt: np.ndarray          # uint8[N], index into NT_NAMES
    flags: np.ndarray       # uint8[N]
    out_offset: np.ndarray  # uint32[N+1], rows are presynaptic
    target: np.ndarray      # uint32[E], strictly ascending within a row
    syn_count: np.ndarray   # uint16[E], at least 1
    min_synapses: int = 1   # the edge threshold used when the graph was built
    sha256: str = ""        # hash of the file it was loaded from; empty for in-memory graphs

    def __post_init__(self) -> None:
        wanted = {"body_id": np.uint64, "nt": np.uint8, "flags": np.uint8,
                  "out_offset": np.uint32, "target": np.uint32, "syn_count": np.uint16}
        for name, dtype in wanted.items():
            if getattr(self, name).dtype != dtype:
                raise GraphError(f"{name} must be {np.dtype(dtype).name}, not {getattr(self, name).dtype}")
        n, e = len(self.body_id), len(self.target)
        if not (len(self.nt) == len(self.flags) == n and len(self.out_offset) == n + 1 and len(self.syn_count) == e):
            raise GraphError("array lengths disagree")
        if n > 1 and not (self.body_id[1:] > self.body_id[:-1]).all():
            raise GraphError("bodyId must be strictly ascending")
        if (self.flags & ~np.uint8(SENTINEL)).any():
            raise GraphError("unknown flag bits")
        offsets = self.out_offset.astype(np.int64)
        if offsets[0] != 0 or offsets[-1] != e or (np.diff(offsets) < 0).any():
            raise GraphError("outOffset must run from 0 to E without decreasing")
        if e and (self.target.max() >= n or self.syn_count.min() < 1):
            raise GraphError("a target is out of range or a synapse count is zero")
        if e > 1:
            same_row = np.repeat(np.arange(n), np.diff(offsets))
            inside = same_row[1:] == same_row[:-1]
            if (np.diff(self.target.astype(np.int64))[inside] <= 0).any():
                raise GraphError("targets must be strictly ascending within a row")
        if self.nt.size and self.nt.max() >= len(NT_NAMES):
            raise GraphError("unknown transmitter code")
        if (np.diff(offsets)[(self.flags & SENTINEL) == SENTINEL] != 0).any():
            raise GraphError("a sentinel has out-edges")

    @property
    def n(self) -> int:
        return len(self.body_id)

    @property
    def e(self) -> int:
        return len(self.target)

    @property
    def sentinel(self) -> np.ndarray:
        return (self.flags & SENTINEL) == SENTINEL

    def row(self, index: int) -> slice:
        return slice(int(self.out_offset[index]), int(self.out_offset[index + 1]))

    def to_json(self) -> dict:
        """The fixture form: plain lists, body IDs as decimal strings."""
        return {"bodyId": [str(b) for b in self.body_id], "nt": self.nt.tolist(), "flags": self.flags.tolist(),
                "outOffset": self.out_offset.tolist(), "target": self.target.tolist(), "synCount": self.syn_count.tolist()}


def from_edges(neurons: dict[int, str], edges: list[tuple[int, int, int]], sentinels: tuple[int, ...] = ()) -> Graph:
    """Build a graph from ``{bodyId: transmitter name}`` and ``(pre bodyId, post bodyId, synapses)`` triples."""
    bodies = sorted(neurons)
    index = {body: i for i, body in enumerate(bodies)}
    rows: list[list[tuple[int, int]]] = [[] for _ in bodies]
    for pre, post, count in edges:
        rows[index[pre]].append((index[post], count))
    offsets, targets, counts = [0], [], []
    for row in rows:
        for target, count in sorted(row):
            targets.append(target)
            counts.append(count)
        offsets.append(len(targets))
    return Graph(
        body_id=np.array(bodies, dtype=np.uint64),
        nt=np.array([NT_NAMES.index(neurons[b]) for b in bodies], dtype=np.uint8),
        flags=np.array([SENTINEL if b in sentinels else 0 for b in bodies], dtype=np.uint8),
        out_offset=np.array(offsets, dtype=np.uint32),
        target=np.array(targets, dtype=np.uint32),
        syn_count=np.array(counts, dtype=np.uint16),
    )
