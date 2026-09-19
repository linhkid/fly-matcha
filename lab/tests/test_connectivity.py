"""Hubs are counted, never named; hop depth is a search; a lock resolves against a graph or fails loudly."""

import numpy as np
import pandas as pd
import pytest

from flylab import REPO_ROOT
from flylab.census import connectivity as C
from flylab.graph.format import read_graph
from flylab.graph.graph import from_edges

# sweet taste 1,2 -> relay 10,11 -> MN9 20,21; bitter 3 -> brake 12 -> MN9; 30 is a bystander nobody reaches
NEURONS = {1: "acetylcholine", 2: "acetylcholine", 3: "acetylcholine", 10: "acetylcholine", 11: "acetylcholine", 12: "gaba",
           20: "acetylcholine", 21: "acetylcholine", 30: "glutamate", 2**32 + 5: "gaba"}
EDGES = [(1, 10, 40), (2, 11, 30), (1, 11, 5), (3, 12, 50), (10, 20, 25), (11, 21, 20), (12, 20, 60), (12, 21, 9), (2**32 + 5, 20, 7), (20, 30, 5)]
FRAME = pd.DataFrame({
    "bodyId": list(NEURONS), "type": ["LBs", "LBs", "LBb", "Relay", "Relay", "Brake", "MN9", "MN9", "Far", "Deep"],
    "side": ["L", "R", "L", "L", "R", "unknown", "L", "R", "L", "R"], "nt": list(NEURONS.values()),
})


def group(name, bodies, sides, kind="annotation"):
    return {"id": name, "bodyIds": [str(b) for b in bodies], "sides": sides, "perSide": {}, "ntHistogram": {}, "evidenceKind": kind}


LOCK = {"version": 2, "circuit": "t", "graphSha256": None, "annotationsSha256": "a", "transmittersSha256": "b",
        "groups": [group("mn9", [20, 21], "LR"), group("grn.sweet", [1, 2], "LR", "paper"), group("grn.bitter", [3], "L", "paper")],
        "types": [{"type": "MN9", "nNeurons": 2, "nt": "acetylcholine", "hopDepth": None}, {"type": "LBs", "nNeurons": 2, "nt": "acetylcholine", "hopDepth": None}]}


def graph():
    return from_edges(NEURONS, EDGES)


def test_hubs_are_the_types_with_most_synapses_counted_in_the_graph():
    bound = C.bind_connectivity(LOCK, graph(), FRAME)
    hubs = {g["id"]: g for g in bound["groups"] if g["evidenceKind"] == "connectivity"}
    assert set(hubs) == {"hub.mn9.in", "hub.grn.out.sweet", "hub.grn.out.bitter"}
    assert hubs["hub.mn9.in"]["byType"] == [{"type": "Brake", "synapses": 69}, {"type": "Relay", "synapses": 45}, {"type": "Deep", "synapses": 7}]
    assert hubs["hub.mn9.in"]["bodyIds"] == ["10", "11", "12", str(2**32 + 5)] and hubs["hub.mn9.in"]["sides"] == "LRUR"
    assert hubs["hub.grn.out.sweet"]["byType"] == [{"type": "Relay", "synapses": 75}]
    assert hubs["hub.grn.out.bitter"]["byType"] == [{"type": "Brake", "synapses": 50}]
    assert [g["id"] for g in bound["groups"][:3]] == ["mn9", "grn.sweet", "grn.bitter"]           # what the annotations bound is untouched


def test_binding_twice_changes_nothing_and_names_the_graph():
    once = C.bind_connectivity(LOCK, graph(), FRAME)
    assert C.bind_connectivity(once, graph(), FRAME) == once
    assert once["graphSha256"] == graph().sha256


def test_hop_depth_is_the_fewest_synaptic_steps_from_any_taste_neuron():
    g = graph()
    depth = C.hop_depths(g, C.indices_of(g, [1, 2, 3]))
    assert dict(zip(g.body_id.tolist(), depth.tolist())) == {1: 0, 2: 0, 3: 0, 10: 1, 11: 1, 12: 1, 20: 2, 21: 2, 30: 3, 2**32 + 5: -1}
    types = {t["type"]: t["hopDepth"] for t in C.bind_connectivity(LOCK, g, FRAME)["types"]}
    assert types == {"Brake": 1, "Deep": None, "LBb": 0, "LBs": 0, "MN9": 2, "Relay": 1}        # every bound type and every hub type; a type nothing reaches has no depth


def test_a_lock_resolves_to_ascending_indices_with_a_side_letter_each():
    g = graph()
    groups = C.resolve(C.bind_connectivity(LOCK, g, FRAME), g)
    assert groups["mn9"].indices.tolist() == [6, 7] and groups["mn9"].sides == "LR"
    assert groups["mn9"].on("left").tolist() == [6] and groups["grn.sweet"].on("right").tolist() == [1]
    assert groups["hub.mn9.in"].sides == "LRUR"


def test_a_body_that_is_not_in_the_graph_fails_loudly_and_so_does_another_graph():
    g = graph()
    missing = {**LOCK, "groups": [*LOCK["groups"], group("ghost", [20, 999], "LR")]}
    with pytest.raises(C.ResolveError, match="first 999"):
        C.resolve(missing, g)
    with pytest.raises(C.ResolveError, match="another graph"):
        C.resolve({**LOCK, "graphSha256": "feed"}, g)
    with pytest.raises(C.ResolveError):
        C.indices_of(g, [2**40])                                                                # past the last body: not an index error, a refusal


def test_neurons_with_no_out_edge_are_found_and_named():
    g = graph()
    assert C.without_outputs(g, {"groups": [group("far", [30, 20], "LL")]}, ["far", "absent"]) == {"far": ["30"]}


GRAPH = REPO_ROOT / "data" / "built" / "full" / "malecns.fskg"


@pytest.mark.skipif(not GRAPH.exists(), reason="the whole-brain graph is not built: python -m flylab graph build")
def test_the_whole_brain_graph_meets_the_slices_anchors():
    import json

    from flylab import CIRCUITS_DIR

    g = read_graph(GRAPH)
    assert g.n >= 160_000 and g.min_synapses == 5
    manifest = json.loads((GRAPH.parent / "malecns.manifest.json").read_text())
    assert manifest["counts"]["signCoverage"] >= 0.95 and manifest["synthetic"] is False
    lock = json.loads((CIRCUITS_DIR / "taste.lock.json").read_text())
    assert lock["graphSha256"] == g.sha256
    top = [t["type"] for t in next(gr for gr in lock["groups"] if gr["id"] == "hub.mn9.in")["byType"]]
    assert {"GNG015", "GNG095", "DNge062"} <= set(top)                                          # seen on the explorer before any of this was built
    silent = C.without_outputs(g, lock, C.taste_populations(lock))
    assert all(not silent[name] for name in ("grn.sweet", "grn.bitter", "grn.water", "grn.ir94e", "grn.highsalt"))   # every taste neuron he is served through can be heard
    groups = C.resolve(lock, g)
    assert len(groups["mn9"].indices) == 2 and groups["mn9"].sides in ("LR", "RL")
    assert {t["type"]: t["hopDepth"] for t in lock["types"]}["MN9"] == 2


def test_a_lock_whose_sides_do_not_match_its_bodies_is_refused_not_trimmed():
    g = graph()
    short = {**LOCK, "groups": [group("mn9", [20, 21], "L")]}
    with pytest.raises(C.ResolveError, match="2 bodies and 1 side letters"):
        C.resolve(short, g)
    with pytest.raises(C.ResolveError, match="twice"):
        C.resolve({**LOCK, "groups": [group("mn9", [20, 20], "LR")]}, g)


def test_a_census_and_a_graph_built_from_different_annotations_are_not_bound_together():
    with pytest.raises(C.ResolveError, match="not the same bodies"):
        C.bind_connectivity(LOCK, graph(), FRAME[FRAME["bodyId"] != 30])
    extra = pd.concat([FRAME, pd.DataFrame({"bodyId": [31], "type": ["New"], "side": ["L"], "nt": ["gaba"]})])
    with pytest.raises(C.ResolveError, match="not the same bodies"):
        C.bind_connectivity(LOCK, graph(), extra)


def test_the_committed_lock_carries_its_connectivity_layer():
    """Needs no graph: a checkout without the 508 MB can still see that nobody replaced the lock with a lesser one."""
    import json

    from flylab import CIRCUITS_DIR

    lock = json.loads((CIRCUITS_DIR / "taste.lock.json").read_text())
    hubs = [g["id"] for g in lock["groups"] if g["evidenceKind"] == "connectivity"]
    assert lock["version"] == 2 and lock["graphSha256"] and len(hubs) == 11 and "hub.mn9.in" in hubs
    assert all(len(g["sides"]) == len(g["bodyIds"]) for g in lock["groups"])
    assert {t["type"]: t["hopDepth"] for t in lock["types"]}["MN9"] == 2
