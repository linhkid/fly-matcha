"""The recordings the page replays: real trials, reproducible from their specs, summarised truthfully."""

import json

import pytest

from flylab import CIRCUITS_DIR
import hashlib

import numpy as np

from flylab.codec.build import CODEC_PATH, load_codec, sip_spec
from flylab.model import oracle
from flylab.model.spec import load_model
from flylab.web import recordings as R

CODEC = load_codec()


def test_a_sip_is_a_trial_that_drives_each_taste_population_at_its_levels_threshold():
    spec = sip_spec("lif-shiu-v1", "g", CODEC, "c", sweet=4, bitter=2, seed=1, steps=3000)
    assert spec["drives"] == [
        {"group": "grn.sweet", "side": "both", "thr16": 1310, "onStep": 0, "offStep": 3000},
        {"group": "grn.bitter", "side": "both", "thr16": 327, "onStep": 0, "offStep": 3000},
    ]
    assert (spec["seed"], spec["durationSteps"], spec["variant"], spec["activated"], spec["silenced"]) == (1, 3000, "base", [], [])


def test_level_zero_is_no_drive_at_all():
    assert sip_spec("m", "g", CODEC, "c", 0, 0, 1, 3000)["drives"] == []
    assert [d["group"] for d in sip_spec("m", "g", CODEC, "c", 0, 3, 1, 3000)["drives"]] == ["grn.bitter"]


def test_with_a_licensed_decoder_the_summary_holds_the_count_in_its_window_and_the_outcome():
    recording = {"spikeStep": [10, 2000, 2500, 9999, 10000], "spikeBodyId": ["20", "20", "21", "20", "20"]}
    decoder = {"window": [2000, 10000], "extendAtLeast": 3, "refuseAtMost": 1}
    summary = R.summarise(recording, readout={"20", "21"}, taste=set(), decoder=decoder)
    assert (summary["windowCount"], summary["outcome"], summary["readoutSpikes"]) == (3, "extend", 5)      # the window is [2000, 10000)
    assert R.summarise({"spikeStep": [5], "spikeBodyId": ["20"]}, {"20"}, set(), decoder)["outcome"] == "refuse"
    assert "outcome" not in R.summarise(recording, {"20"}, set())                                          # no decoder, no verdict


def test_the_summary_counts_what_the_recording_holds():
    recording = {"spikeStep": [0, 0, 5, 40, 41, 90], "spikeBodyId": ["1", "2", "9", "20", "9", "20"]}
    assert R.summarise(recording, readout={"20", "21"}, taste={"1", "2"}) == {
        "spikes": 6, "neurons": 4, "neuronsBeyondTaste": 2, "readoutSpikes": 2, "readoutFirstStep": 40, "readoutLastStep": 90}
    silent = R.summarise({"spikeStep": [3], "spikeBodyId": ["1"]}, {"20"}, {"1"})
    assert (silent["readoutSpikes"], silent["readoutFirstStep"], silent["readoutLastStep"]) == (0, None, None)


needs_graph = pytest.mark.skipif(not R.GRAPH_PATH.exists(), reason="needs the whole-brain graph: python -m flylab graph build")


def test_the_recordings_are_of_this_codec_this_model_and_this_lock_and_hold_what_they_say():
    """Needs no graph. A recording made under another codec, model or lock is stale, and this is where that is caught (rule 5)."""
    index = json.loads((R.OUT_DIR / "index.json").read_text())
    assert len(index["recordings"]) == 25 and index["durationSteps"] == R.duration_steps(index["decoder"])
    from flylab.codec.build import load_decoder
    assert index["decoder"] == load_decoder() and index["pilot"] is (index["decoder"] is None)   # a verdict on the page only with a licensed decoder
    lock_bytes = (CIRCUITS_DIR / "taste.lock.json").read_bytes()
    lock = json.loads(lock_bytes)
    codec_sha = hashlib.sha256(CODEC_PATH.read_bytes()).hexdigest()
    assert index["codecSha256"] == codec_sha and index["modelId"] == load_model().id
    assert index["lockSha256"] == hashlib.sha256(lock_bytes).hexdigest() and index["graphSha256"] == lock["graphSha256"]
    groups = {g["id"]: set(g["bodyIds"]) for g in lock["groups"]}
    for entry in index["recordings"]:
        recording = json.loads((R.OUT_DIR / entry["file"]).read_text())
        assert recording["specSha256"] == entry["specSha256"] and recording["spikeHash"] == entry["spikeHash"]
        assert recording["spec"] == sip_spec(index["modelId"], index["graphSha256"], CODEC, codec_sha, entry["sweet"], entry["bitter"], entry["seed"], index["durationSteps"])
        steps, bodies = np.array(recording["spikeStep"], dtype=np.int64), np.array([int(b) for b in recording["spikeBodyId"]], dtype=np.uint64)
        assert oracle.spike_hash(steps, bodies) == recording["spikeHash"]      # the hash is of these spikes, not just a string the index repeats
        keys = ("spikes", "neurons", "neuronsBeyondTaste", "readoutSpikes", "readoutFirstStep", "readoutLastStep") + (("windowCount", "outcome") if index["decoder"] else ())
        assert R.summarise(recording, groups["mn9"], groups["grn.sweet"] | groups["grn.bitter"], index["decoder"]) == {k: entry[k] for k in keys}
        assert recording["spikeStep"] == sorted(recording["spikeStep"]) and recording["sentinelBreaches"] == []
    empty = next(e for e in index["recordings"] if e["sweet"] == 0 and e["bitter"] == 0)
    assert empty["spikes"] == 0                      # no tea, no spikes: the model has no activity of its own


@needs_graph
def test_a_recording_is_reproduced_by_running_its_spec_again():
    from flylab.census import connectivity
    from flylab.graph.format import read_graph
    from flylab.model import oracle
    from flylab.model.spec import load_model, variant_names

    graph = read_graph(R.GRAPH_PATH)
    groups = connectivity.resolve(json.loads((CIRCUITS_DIR / "taste.lock.json").read_text()), graph)
    for name in ("s4-b0-seed1.json", "s4-b4-seed1.json"):
        committed = json.loads((R.OUT_DIR / name).read_text())
        again = oracle.run_trial(graph, load_model(), committed["spec"], groups, variant_names())
        assert again["spikeHash"] == committed["spikeHash"] and again["spikeBodyId"] == committed["spikeBodyId"]


# --------------------------------------------------------------------------- his moving legs (slice V3)


def test_a_movement_is_a_trial_that_drives_the_knee_sensors_of_the_moving_legs_and_nothing_else():
    from flylab.codec.build import CodecError, build_legs_codec, movement_spec

    codec = build_legs_codec()
    walk = movement_spec("m", "g", codec, "c", "walk", 1, 3000)
    front = movement_spec("m", "g", codec, "c", "front", 1, 3000)
    assert sorted(d["group"] for d in walk["drives"]) == sorted(f"sens.{kind}.{pair}" for kind in ("hook", "claw") for pair in ("fl", "ml", "hl"))
    assert sorted(d["group"] for d in front["drives"]) == ["sens.claw.fl", "sens.hook.fl"]
    for spec in (walk, front):
        assert all(d == {"group": d["group"], "side": "both", "thr16": 655, "onStep": 0, "offStep": 3000} for d in spec["drives"])
        assert spec["activated"] == [] and spec["silenced"] == []          # no motor neuron is forced: whatever they do is his wiring's
        assert not any(d["group"].startswith("mn.") for d in spec["drives"])
    with pytest.raises(CodecError):
        movement_spec("m", "g", codec, "c", "moonwalk", 1, 3000)


def test_the_legs_codec_on_disk_is_the_one_the_builder_writes_and_names_only_groups_the_legs_census_bound():
    from flylab.codec.build import LEGS_CODEC_PATH, build_legs_codec, dump

    assert LEGS_CODEC_PATH.read_text() == dump(build_legs_codec())
    bound = {g["id"] for g in json.loads((CIRCUITS_DIR / "legs.lock.json").read_text())["groups"]}
    named = {group for sensor in build_legs_codec()["sensors"] for group in sensor["groups"].values()}
    assert named <= bound and len(named) == 6


def test_the_summary_of_a_movement_counts_what_the_recording_holds():
    recording = {"spikeBodyId": ["1", "2", "1", "50", "60", "60", "70"], "spikeStep": [0, 1, 2, 3, 4, 5, 6]}
    assert R.summarise_movement(recording, readout={"60", "61"}, driven={"1", "2"}, other_motor={"70", "71"}) == {
        "spikes": 7, "neurons": 5, "neuronsBeyondSensors": 3, "readoutSpikes": 2, "readoutNeurons": 1, "otherMotorSpikes": 1, "otherMotorNeurons": 1}


def test_the_recordings_of_his_moving_legs_are_of_this_codec_and_this_lock_and_hold_what_they_say():
    """Needs no graph. Stale recordings are caught here, as the sips' are (rule 5)."""
    from flylab.codec.build import LEGS_CODEC_PATH, load_codec, movement_spec

    index = json.loads((R.OUT_DIR / "index.json").read_text())
    movements = index["movements"]
    lock_bytes = (CIRCUITS_DIR / "legs.lock.json").read_bytes()
    groups = {g["id"]: g["bodyIds"] for g in json.loads(lock_bytes)["groups"]}
    codec, codec_sha = load_codec(LEGS_CODEC_PATH), hashlib.sha256(LEGS_CODEC_PATH.read_bytes()).hexdigest()
    assert movements["pilot"] is True and movements["codecSha256"] == codec_sha and movements["lockSha256"] == hashlib.sha256(lock_bytes).hexdigest()
    assert movements["durationSteps"] == R.PILOT_STEPS
    assert {m["id"]: m["pairs"] for m in movements["recordings"]} == {m["id"]: m["pairs"] for m in codec["movements"]}     # the index's pairs are the codec's, not just its own
    assert [m["id"] for m in movements["recordings"]] == [m["id"] for m in codec["movements"]]
    pools = {pool["id"]: pool["bodyIds"] for pool in movements["pools"]}
    assert pools == {name: sorted(bodies, key=int) for name, bodies in groups.items() if name.startswith("mn.")}     # the readout is every leg motor neuron of the census
    readout = {body for bodies in pools.values() for body in bodies}
    other_motor = set(movements["otherMotorBodyIds"])
    assert not other_motor & readout
    for entry in movements["recordings"]:
        recording = json.loads((R.OUT_DIR / entry["file"]).read_text())
        assert recording["specSha256"] == entry["specSha256"] and recording["spikeHash"] == entry["spikeHash"]
        assert recording["spec"] == movement_spec(index["modelId"], index["graphSha256"], codec, codec_sha, entry["id"], entry["seed"], movements["durationSteps"])
        steps, bodies = np.array(recording["spikeStep"], dtype=np.int64), np.array([int(b) for b in recording["spikeBodyId"]], dtype=np.uint64)
        assert oracle.spike_hash(steps, bodies) == recording["spikeHash"]
        for sensor in codec["sensors"]:
            assert entry["sensors"][sensor["id"]] == sorted((b for pair in entry["pairs"] for b in groups[sensor["groups"][pair]]), key=int)
        driven = {body for bodies in entry["sensors"].values() for body in bodies}
        assert not driven & readout
        keys = ("spikes", "neurons", "neuronsBeyondSensors", "readoutSpikes", "readoutNeurons", "otherMotorSpikes", "otherMotorNeurons")
        assert R.summarise_movement(recording, readout, driven, other_motor) == {k: entry[k] for k in keys}
        assert recording["spikeStep"] == sorted(recording["spikeStep"]) and recording["sentinelBreaches"] == []


@needs_graph
def test_a_movements_recording_is_reproduced_by_running_its_spec_again():
    from flylab.census import connectivity
    from flylab.graph.format import read_graph
    from flylab.model.spec import variant_names

    graph = read_graph(R.GRAPH_PATH)
    groups = connectivity.resolve(json.loads((CIRCUITS_DIR / "legs.lock.json").read_text()), graph)
    for name in ("move-front-seed1.json", "move-walk-seed1.json"):
        committed = json.loads((R.OUT_DIR / name).read_text())
        again = oracle.run_trial(graph, load_model(), committed["spec"], groups, variant_names())
        assert again["spikeHash"] == committed["spikeHash"] and again["spikeBodyId"] == committed["spikeBodyId"]


def test_the_other_motor_neurons_are_every_motor_neuron_the_dataset_names_that_is_not_of_his_legs():
    import pandas as pd

    frame = pd.DataFrame({"bodyId": [1, 2, 3, 4], "type": ["a", "b", None, "d"], "superclass": ["vnc_motor", "cb_motor", "vnc_motor", "vnc_intrinsic"]})
    assert R.motor_neurons(frame) == {"1", "2"}                      # typed, and called motor by the dataset: nothing else
