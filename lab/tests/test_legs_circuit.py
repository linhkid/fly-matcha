"""The legs circuit: what slice V3's trials drive and read out. From V3 on its lock is not decoration, so it is held as the taste lock is."""

import json

import pandas as pd
import pytest

from flylab import CIRCUITS_DIR, RAW_DIR, REPO_ROOT
from flylab.census import binding as B
from flylab.census import connectivity
from flylab.data.fetch import ANNOTATIONS, TRANSMITTERS, file_hashes

CIRCUIT = json.loads((CIRCUITS_DIR / "legs.circuit.json").read_text(encoding="utf-8"))
GRAPH = REPO_ROOT / "data" / "built" / "full" / "malecns.fskg"
needs_data = pytest.mark.skipif(not (RAW_DIR / ANNOTATIONS).exists(), reason="the stage A files are not here")
SENSORS = [role for role in CIRCUIT["roles"] if role["id"].startswith("sens.")]


def test_the_sensor_roles_are_six_and_each_says_how_thin_its_evidence_is():
    assert sorted(role["id"] for role in SENSORS) == sorted(f"sens.{kind}.{leg}" for kind in ("hook", "claw") for leg in ("fl", "ml", "hl"))
    for role in SENSORS:
        assert role["evidence"]["kind"] == "annotation" and "of" in role["evidence"]["claim"] and "thin" in role["caveat"]
        assert role["select"]["where"]["subclass"] == ["chordotonal organ"]      # a row the dataset does not call chordotonal is not bound as one


@needs_data
def test_the_committed_legs_lock_reproduces_byte_for_byte_and_the_gate_passes():
    """An edit to the circuit file that is not followed by ``python -m flylab census legs`` is caught here, before stale recordings reach the page."""
    result = B.census(CIRCUIT, pd.read_feather(RAW_DIR / ANNOTATIONS), pd.read_feather(RAW_DIR / TRANSMITTERS))
    assert result.failures == []
    lock = B.build_lock(CIRCUIT, result, file_hashes(RAW_DIR / ANNOTATIONS)[0], file_hashes(RAW_DIR / TRANSMITTERS)[0])
    assert B.dump_lock(lock) == (CIRCUITS_DIR / "legs.lock.json").read_text(encoding="utf-8")
    assert B.gate(CIRCUIT, result, B.check_anchors(CIRCUIT, result.frame))["pass"]


@needs_data
def test_every_bound_sensor_is_what_its_role_says_and_the_evidence_counts_are_the_datasets():
    frame = pd.read_feather(RAW_DIR / ANNOTATIONS)
    lock = json.loads((CIRCUITS_DIR / "legs.lock.json").read_text(encoding="utf-8"))
    nerve = {"fl": "ProLN", "ml": "MesoLN", "hl": "MetaLN"}
    types = {"hook": {"SNpp39", "SNpp41"}, "claw": {"SNpp50", "SNpp51"}}
    seen: set[str] = set()
    for group in lock["groups"]:
        if not group["id"].startswith("sens."):
            continue
        _, kind, leg = group["id"].split(".")
        rows = frame[frame["bodyId"].isin([int(b) for b in group["bodyIds"]])]
        assert len(rows) == len(group["bodyIds"]) and set(rows["type"]) <= types[kind]
        assert set(rows["entryNerve"]) == {nerve[leg]} and set(rows["subclass"]) == {"chordotonal organ"} and set(rows["class"]) == {"mechanosensory_proprioceptive"}
        assert "U" not in group["sides"]                      # every one enters on a known side
        assert not seen & set(group["bodyIds"])
        seen |= set(group["bodyIds"])
    # the per-type counts the evidence text gives are recounted, so the text cannot drift from the table
    for role in SENSORS:
        kind = role["id"].split(".")[1]
        for name in types[kind]:
            of_type = frame[frame["type"] == name]
            named = int((of_type["synonyms"].astype(str) == f"FeCO {kind}").sum())
            assert f"{name}: {named} of {len(of_type)} neurons" in role["evidence"]["claim"]
            assert set(of_type["synonyms"].dropna()) <= {f"FeCO {kind}"}     # no member carries another organ's name


@pytest.mark.skipif(not GRAPH.exists(), reason="the whole-brain graph is not here")
def test_which_driven_sensors_nobody_can_hear_is_known():
    """One front-leg hook neuron has no out-edge at the graph's threshold: it is driven and counted, and can reach nobody. Written down, so that it cannot grow unseen."""
    from flylab.graph.format import read_graph

    lock = json.loads((CIRCUITS_DIR / "legs.lock.json").read_text(encoding="utf-8"))
    silent = connectivity.without_outputs(read_graph(GRAPH), lock, [g["id"] for g in lock["groups"] if g["id"].startswith("sens.")])
    assert {k: v for k, v in silent.items() if v} == {"sens.hook.fl": ["833439"]}
