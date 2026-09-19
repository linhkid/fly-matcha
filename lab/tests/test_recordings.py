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
    assert index["pilot"] is True and len(index["recordings"]) == 25 and index["durationSteps"] == R.DURATION_STEPS
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
        assert R.summarise(recording, groups["mn9"], groups["grn.sweet"] | groups["grn.bitter"]) == {k: entry[k] for k in ("spikes", "neurons", "neuronsBeyondTaste", "readoutSpikes", "readoutFirstStep", "readoutLastStep")}
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
