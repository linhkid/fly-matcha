"""The census command on synthetic files: what lands on disk, and what the exit code says."""

import json

import pytest

from flylab.census.cli import run_census
from flylab.data.fetch import ANNOTATIONS, TRANSMITTERS
from test_census import ANNOTATIONS as FRAME
from test_census import TRANSMITTERS as PREDICTIONS
from test_census import circuit, role


@pytest.fixture
def dirs(tmp_path):
    raw, circuits = tmp_path / "raw", tmp_path / "circuits"
    raw.mkdir(), circuits.mkdir()
    FRAME.to_feather(raw / ANNOTATIONS)
    PREDICTIONS.to_feather(raw / TRANSMITTERS)
    return raw, circuits


def write(circuits, *roles, **extra):
    (circuits / "t.circuit.json").write_text(json.dumps(circuit(*roles, **extra)))


def test_a_passing_census_writes_a_lock_and_a_report_and_exits_zero(dirs):
    raw, circuits = dirs
    write(circuits, role("mn9", {"type": ["MN9"]}, {"count": 2}))
    assert run_census("t", raw, circuits) == 0
    lock = json.loads((circuits / "t.lock.json").read_text())
    assert lock["groups"][0]["bodyIds"] == ["1", "2"] and len(lock["transmittersSha256"]) == 64
    assert "Census gate: PASS" in (circuits / "t.census.html").read_text()


def test_a_failed_required_role_removes_the_old_lock_still_reports_and_exits_nonzero(dirs):
    raw, circuits = dirs
    (circuits / "t.lock.json").write_text("stale")
    write(circuits, role("mn9", {"type": ["MN10"]}))
    assert run_census("t", raw, circuits) == 1
    assert not (circuits / "t.lock.json").exists()
    report = (circuits / "t.census.html").read_text()
    assert "TYPE_NOT_FOUND" in report and "Census gate: FAIL" in report


def test_a_failed_optional_role_does_not_block_the_lock(dirs):
    raw, circuits = dirs
    write(circuits, role("mn9", {"type": ["MN9"]}), role("maybe", {"type": ["Nope"]}, required=False))
    assert run_census("t", raw, circuits) == 0
    assert [g["id"] for g in json.loads((circuits / "t.lock.json").read_text())["groups"]] == ["mn9"]


def test_a_gate_failure_without_a_role_failure_writes_the_lock_but_exits_nonzero(dirs):
    raw, circuits = dirs
    write(circuits, role("mn9", {"type": ["MN9"]}, kind="crosswalk"))
    assert run_census("t", raw, circuits) == 1
    assert (circuits / "t.lock.json").exists()


def test_a_malformed_circuit_leaves_no_old_lock_behind(dirs):
    raw, circuits = dirs
    (circuits / "t.lock.json").write_text("stale")
    bad = role("mn9", {"type": ["MN9"]})
    bad["select"]["wher"] = {}
    write(circuits, bad)
    with pytest.raises(Exception):
        run_census("t", raw, circuits)
    assert not (circuits / "t.lock.json").exists()
