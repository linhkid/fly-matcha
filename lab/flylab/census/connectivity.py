"""Binding by connectivity, and resolving a lock against a graph (slice 03).

The second kind of evidence. A hub is found by counting synapses in the graph and by nothing else: never by a
literature nickname, and never by what a population does in a simulation. The lock is the only owner of hop depth.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from flylab.census.binding import _majority, side_letters
from flylab.graph.graph import Graph

HUB_IN_TYPES = 20    # the types with most synapses onto the readout
HUB_OUT_TYPES = 10   # the types receiving most synapses from a taste population
TASTE_PREFIX = "grn."  # every bound group of taste neurons: a source for hop depth, and a population with a hub of its own
READOUT = "mn9"


def taste_populations(lock: dict) -> list[str]:
    return [group["id"] for group in lock["groups"] if group["id"].startswith(TASTE_PREFIX)]


class ResolveError(ValueError):
    """A body the lock names is not a neuron of the graph."""


def indices_of(graph: Graph, body_ids) -> np.ndarray:
    """Graph indices of body IDs, in the order given. Fails loudly on a body the graph does not hold."""
    wanted = np.array([int(b) for b in body_ids], dtype=np.uint64)
    at = np.searchsorted(graph.body_id, wanted)
    at[at == graph.n] = 0
    missing = wanted[graph.body_id[at] != wanted] if len(wanted) else wanted
    if len(missing):
        raise ResolveError(f"{len(missing)} bodies are not in the graph, first {int(missing[0])}")
    return at.astype(np.int64)


def resolve(lock: dict, graph: Graph) -> dict:
    """``{groupId: Members}`` as contracts/TRIAL.md defines it: indices ascending, one side letter each."""
    from flylab.model.oracle import members

    if lock.get("graphSha256") not in (None, graph.sha256):
        raise ResolveError("the lock was bound against another graph")
    resolved = {}
    for group in lock["groups"]:
        bodies, sides = group["bodyIds"], group["sides"]
        if len(sides) != len(bodies):            # zip() would drop the group's last bodies without a word
            raise ResolveError(f"group {group['id']} has {len(bodies)} bodies and {len(sides)} side letters")
        if len(set(bodies)) != len(bodies):
            raise ResolveError(f"group {group['id']} names a body twice")
        resolved[group["id"]] = members(indices_of(graph, bodies), sides)
    return resolved


def _pre_of_edges(graph: Graph) -> np.ndarray:
    return np.repeat(np.arange(graph.n, dtype=np.int64), np.diff(graph.out_offset.astype(np.int64)))


def _rank_types(type_of: np.ndarray, neurons: np.ndarray, synapses: np.ndarray, limit: int) -> list[dict]:
    """Types by summed synapses, most first, ties by name."""
    frame = pd.DataFrame({"type": type_of[neurons], "synapses": synapses.astype(np.int64)})
    totals = frame.groupby("type")["synapses"].sum().reset_index()
    totals = totals.sort_values(["synapses", "type"], ascending=[False, True]).head(limit)
    return [{"type": row.type, "synapses": int(row.synapses)} for row in totals.itertuples()]


def hop_depths(graph: Graph, sources: np.ndarray) -> np.ndarray:
    """Fewest synaptic steps from any source to each neuron, by breadth-first search. -1 where no path exists."""
    depth = np.full(graph.n, -1, dtype=np.int32)
    frontier = np.unique(sources)
    depth[frontier] = 0
    offsets = graph.out_offset.astype(np.int64)
    level = 0
    while len(frontier):
        level += 1
        spans = [graph.target[offsets[i]:offsets[i + 1]] for i in frontier]
        reached = np.unique(np.concatenate(spans)) if spans else np.zeros(0, np.uint32)
        frontier = reached[depth[reached] == -1].astype(np.int64)
        depth[frontier] = level
    return depth


def bind_connectivity(lock: dict, graph: Graph, frame: pd.DataFrame) -> dict:
    """The lock with its hubs, its hop depths and the hash of the graph they were counted in.

    ``frame`` is the census universe (``binding.prepare``): it says which type, side and transmitter a body has.
    """
    universe = np.sort(frame["bodyId"].to_numpy(dtype=np.uint64))
    if len(universe) != graph.n or not np.array_equal(universe, graph.body_id):
        # a graph body with no type would vanish from every ranking, and a hub could hold a body the graph lacks
        raise ResolveError(f"the census universe ({len(universe):,} typed bodies) and the graph ({graph.n:,} neurons) are not the same bodies: they were built from different annotation files")
    known = frame.set_index(frame["bodyId"].astype(np.uint64))
    type_of = known["type"].reindex(graph.body_id).to_numpy()
    groups = {group["id"]: group for group in lock["groups"] if group["evidenceKind"] != "connectivity"}
    pre, post, count = _pre_of_edges(graph), graph.target.astype(np.int64), graph.syn_count

    hubs: list[tuple[str, list[dict]]] = []
    readout = indices_of(graph, groups[READOUT]["bodyIds"])
    onto = np.isin(post, readout)
    hubs.append((f"hub.{READOUT}.in", _rank_types(type_of, pre[onto], count[onto], HUB_IN_TYPES)))
    populations = [name for name in groups if name.startswith(TASTE_PREFIX)]
    for population in populations:
        out_of = np.isin(pre, indices_of(graph, groups[population]["bodyIds"]))
        hubs.append((f"hub.grn.out.{population[len(TASTE_PREFIX):]}", _rank_types(type_of, post[out_of], count[out_of], HUB_OUT_TYPES)))

    bound = list(groups.values())
    for name, ranked in hubs:
        rows = frame[frame["type"].isin([r["type"] for r in ranked])].sort_values("bodyId")
        sides = rows["side"].value_counts().to_dict()
        bound.append({
            "id": name, "bodyIds": [str(int(b)) for b in rows["bodyId"]], "sides": side_letters(rows["side"]),
            "perSide": {k: int(sides.get(k, 0)) for k in ("L", "R", "unknown")},
            "ntHistogram": {k: int(v) for k, v in sorted(rows["nt"].value_counts().to_dict().items())},
            "evidenceKind": "connectivity", "byType": ranked,
        })

    taste = np.concatenate([indices_of(graph, groups[p]["bodyIds"]) for p in populations])
    depth = hop_depths(graph, taste)
    annotated = set(frame.loc[frame["bodyId"].astype(str).isin({b for g in groups.values() for b in g["bodyIds"]}), "type"])
    named = sorted(annotated | {r["type"] for _, ranked in hubs for r in ranked})   # from what is bound now, not from an older lock's list
    types = []
    for name in named:
        rows = frame[frame["type"] == name]
        reached = depth[type_of == name]
        reached = reached[reached >= 0]
        types.append({"type": name, "nNeurons": int(len(rows)), "nt": _majority(rows["nt"]), "hopDepth": int(reached.min()) if len(reached) else None})
    return {**lock, "graphSha256": graph.sha256, "groups": bound, "types": types}


def without_outputs(graph: Graph, lock: dict, group_ids) -> dict[str, list[str]]:
    """Bodies of the named groups that have no out-edge in the graph: neurons that can fire and be heard by nobody."""
    silent = np.diff(graph.out_offset.astype(np.int64)) == 0
    groups = {group["id"]: group for group in lock["groups"]}
    return {name: [b for b, i in zip(groups[name]["bodyIds"], indices_of(graph, groups[name]["bodyIds"])) if silent[i]] for name in group_ids if name in groups}
