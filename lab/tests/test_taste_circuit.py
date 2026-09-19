"""The real taste circuit: its file is well formed, and its lock reproduces from the source data."""

import json

import pandas as pd
import pytest

from flylab import CIRCUITS_DIR, RAW_DIR
from flylab.census import binding as B
from flylab.data.fetch import ANNOTATIONS, TRANSMITTERS, file_hashes

CIRCUIT = json.loads((CIRCUITS_DIR / "taste.circuit.json").read_text(encoding="utf-8"))
needs_data = pytest.mark.skipif(not (RAW_DIR / ANNOTATIONS).exists(), reason="stage A files not fetched")


def test_the_circuit_file_is_well_formed():
    B.validate_circuit(CIRCUIT)


def test_the_three_gating_roles_rest_on_independent_evidence():
    required = {role["id"]: role["evidence"]["kind"] for role in CIRCUIT["roles"] if role["required"]}
    assert set(required) == {"mn9", "grn.sweet", "grn.bitter"}
    assert set(required.values()) <= set(B.INDEPENDENT_EVIDENCE)


@needs_data
def test_the_committed_lock_reproduces_byte_for_byte_and_the_gate_passes():
    result = B.census(CIRCUIT, pd.read_feather(RAW_DIR / ANNOTATIONS), pd.read_feather(RAW_DIR / TRANSMITTERS))
    assert result.failures == []
    lock = B.build_lock(CIRCUIT, result, file_hashes(RAW_DIR / ANNOTATIONS)[0], file_hashes(RAW_DIR / TRANSMITTERS)[0])
    assert B.dump_lock(lock) == (CIRCUITS_DIR / "taste.lock.json").read_text(encoding="utf-8")
    assert B.gate(CIRCUIT, result, B.check_anchors(CIRCUIT, result.frame))["pass"]


@needs_data
def test_no_touch_neuron_is_bound_as_taste():
    result = B.census(CIRCUIT, pd.read_feather(RAW_DIR / ANNOTATIONS), pd.read_feather(RAW_DIR / TRANSMITTERS))
    taste = {body for id, bound in result.bound.items() if id.startswith("grn.") for body in bound.body_ids}
    classes = set(result.frame[result.frame["bodyId"].isin(taste)]["class"].dropna())
    assert classes == {"gustatory"}
