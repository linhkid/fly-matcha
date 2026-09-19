"""The brain cloud: facts only, one point per neuron with a cell body position."""

import json
import struct

import numpy as np
import pandas as pd
import pytest

from flylab import CIRCUITS_DIR, RAW_DIR
from flylab.census import binding
from flylab.data.fetch import ANNOTATIONS, TRANSMITTERS
from flylab.web import cloud

needs_data = pytest.mark.skipif(not (RAW_DIR / ANNOTATIONS).exists(), reason="stage A files not fetched")


def tiny():
    frame = pd.DataFrame({
        "bodyId": [30, 10, 20, 40, 50, 60],
        "type": ["MN9", "GNG1", "LB3c", "MN9", "KCx", "Other"],
        # five placed neurons, an odd number on purpose: 12 * 5 is not a multiple of 8, so the padding after the positions is real
        "somaLocation": [np.array([10, 0, 0]), np.array([0, 0, 0]), None, np.array([20, 40, 0]), np.array([10, 20, 10]), np.array([20, 0, 10])],
        "side": ["L", "L", "R", "R", "L", "R"], "nt": ["acetylcholine", "gaba", "unknown", "acetylcholine", "acetylcholine", "gaba"],
    })
    groups = {name: [] for name in (*cloud.CLOUD_GROUPS, *cloud.MOUTHPART_GROUPS)}
    groups.update({"mn9": ["30", "40"], "relay.shiu2022": ["10", "30"], "mb.kc": ["50"], "grn.sweet": ["20"]})
    return frame, {"annotationsSha256": "abc", "groups": [{"id": k, "bodyIds": v} for k, v in groups.items()]}


def parse(data: bytes):
    magic, (version, n) = data[:8], struct.unpack("<II", data[8:16])
    body = np.frombuffer(data, dtype="<u8", count=n, offset=16)
    start = 16 + 8 * n
    xyz = np.frombuffer(data, dtype="<f4", count=3 * n, offset=start).reshape(n, 3)
    start += -(-12 * n // 8) * 8
    return magic, version, body, xyz, np.frombuffer(data, dtype="u1", count=n, offset=start)


def test_the_cloud_holds_only_neurons_with_a_position_ascending_and_the_first_group_wins():
    data, companion = cloud.build_cloud(*tiny())
    magic, version, body, xyz, group = parse(data)
    assert (magic, version, body.tolist()) == (b"FSKCLOUD", 1, [10, 30, 40, 50, 60])
    names = ["none", *cloud.CLOUD_GROUPS]
    assert [names[g] for g in group] == ["relay.shiu2022", "mn9", "mn9", "mb.kc", "none"]  # body 30 is in two groups: mn9 comes first
    assert len(data) % 8 == 0 and companion["points"] == 5 and companion["typedNeurons"] == 6


FIXTURE = cloud.REPO_ROOT / "contracts" / "fixtures" / "cloud"


def test_the_tiny_cloud_is_the_fixture_the_browser_reads():
    """One file, two readers: the bytes written here are the bytes web/tests/view.test.ts holds readCloud to."""
    data, _ = cloud.build_cloud(*tiny())
    assert data == (FIXTURE / "tiny.cloud").read_bytes()
    _, _, body, xyz, group = parse(data)
    expected = json.loads((FIXTURE / "tiny.cloud.expected.json").read_text())
    assert expected == {"bodyId": [str(b) for b in body], "xyz": [float(v) for v in xyz.ravel()], "group": [int(g) for g in group]}


def test_positions_are_centred_and_share_one_scale():
    _, _, _, xyz, _ = parse(cloud.build_cloud(*tiny())[0])
    assert np.allclose(xyz.min(axis=0) + xyz.max(axis=0), 0)                           # centred on the bounding box
    assert np.isclose((xyz.max(axis=0) - xyz.min(axis=0)).max(), 1.0)                   # the largest extent is exactly 1
    assert np.allclose(xyz[2] - xyz[1], np.array([10, 40, 0]) / 40)                     # one uniform scale, shape preserved


def test_taste_neurons_are_listed_for_the_mouthparts_with_side_and_whether_they_can_speak():
    assert cloud.build_cloud(*tiny())[1]["mouthparts"] == [{"bodyId": "20", "group": "grn.sweet", "side": "R", "speaks": False}]


@needs_data
def test_the_committed_cloud_regenerates_byte_for_byte_and_matches_the_lock(tmp_path):
    cloud_path, json_path = cloud.export_cloud(out_dir=tmp_path)
    assert cloud_path.read_bytes() == (cloud.WEB_DIR / "brain.cloud").read_bytes()
    assert json_path.read_bytes() == (cloud.WEB_DIR / "brain.cloud.json").read_bytes()
    companion = json.loads(json_path.read_text())
    lock = json.loads((CIRCUITS_DIR / "taste.lock.json").read_text())
    assert {g["id"] for g in companion["groups"]} - {"none"} <= {g["id"] for g in lock["groups"]}
    assert companion["points"] == 138556 and len(companion["mouthparts"]) == 72
    assert sum(1 for m in companion["mouthparts"] if not m["speaks"]) == 6             # the six LB1b neurons
