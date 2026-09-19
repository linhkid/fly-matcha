"""The graph file: what is written is what is read, and nothing malformed gets in."""

import hashlib
import json
import struct

import numpy as np
import pytest

from flylab import REPO_ROOT
from flylab.graph import format as fskg
from flylab.graph.graph import Graph, GraphError, from_edges

FIXTURE = REPO_ROOT / "contracts" / "fixtures" / "graph"


def tiny() -> Graph:
    """Five neurons, one of them across 2^32, a sentinel, and section lengths that all need padding."""
    graph = from_edges(
        {7: "acetylcholine", 20: "gaba", 31: "glutamate", 2**32 + 7: "unknown", 2**40: "serotonin"},
        [(7, 20, 12), (7, 2**32 + 7, 5), (20, 31, 65535), (31, 7, 9), (2**32 + 7, 20, 6)],
        sentinels=(2**40,),
    )
    return Graph(graph.body_id, graph.nt, graph.flags, graph.out_offset, graph.target, graph.syn_count, min_synapses=5)


def test_a_graph_survives_the_file_array_for_array(tmp_path):
    path = tmp_path / "tiny.fskg"
    sha = fskg.write_graph(path, tiny(), {"kind": "full", "synthetic": True})
    loaded = fskg.read_graph(path, allow_synthetic=True)
    for name in ("body_id", "nt", "flags", "out_offset", "target", "syn_count"):
        assert np.array_equal(getattr(loaded, name), getattr(tiny(), name)), name
        assert getattr(loaded, name).dtype == getattr(tiny(), name).dtype
    assert (loaded.min_synapses, loaded.sha256, loaded.n, loaded.e) == (5, sha, 5, 5)
    assert sha == hashlib.sha256(path.read_bytes()).hexdigest() and len(path.read_bytes()) % 8 == 0
    assert int(loaded.body_id[3]) == 2**32 + 7 and int(loaded.syn_count.max()) == 65535   # 64-bit IDs and the largest count survive


def test_the_same_graph_always_gives_the_same_bytes_and_they_are_the_committed_fixture():
    assert fskg.graph_bytes(tiny()) == fskg.graph_bytes(tiny()) == (FIXTURE / "tiny.fskg").read_bytes()
    expected = json.loads((FIXTURE / "tiny.fskg.expected.json").read_text())
    assert fskg.parse_graph((FIXTURE / "tiny.fskg").read_bytes()).to_json() == expected["graph"]
    assert expected["minSynapses"] == 5


def test_the_arrays_are_views_onto_the_file_not_copies(tmp_path):
    path = tmp_path / "tiny.fskg"
    fskg.write_graph(path, tiny(), {"synthetic": False})
    loaded = fskg.read_graph(path)
    assert not loaded.target.flags.owndata and not loaded.target.flags.writeable


@pytest.mark.parametrize("damage, message", [
    (lambda b: b[:-8], "truncated"),
    (lambda b: b[:20], "truncated"),
    (lambda b: b + b"\0" * 8, "trailing"),
    (lambda b: b"FSKGRAPX" + b[8:], "not a graph file"),
    (lambda b: b[:8] + struct.pack("<I", 2) + b[12:], "version 2"),
])
def test_a_damaged_file_is_refused_by_name(damage, message):
    with pytest.raises(GraphError, match=message):
        fskg.parse_graph(damage(fskg.graph_bytes(tiny())))


def test_padding_that_is_not_zero_is_a_misaligned_section():
    data = bytearray(fskg.graph_bytes(tiny()))
    nt_end = fskg.HEADER.size + 8 * 5 + 5          # the five transmitter bytes end three short of a boundary
    assert data[nt_end] == 0
    data[nt_end] = 1
    with pytest.raises(GraphError, match="misaligned: section nt"):
        fskg.parse_graph(bytes(data))


def test_an_unsorted_row_and_unsorted_bodies_are_refused():
    graph = tiny()
    swapped = graph.target.copy()
    swapped[[0, 1]] = swapped[[1, 0]]              # neuron 7's two targets, out of order
    data = fskg.graph_bytes(tiny())
    start = data.index(graph.target.tobytes())
    with pytest.raises(GraphError, match="ascending within a row"):
        fskg.parse_graph(data[:start] + swapped.tobytes() + data[start + swapped.nbytes:])
    bodies = graph.body_id.copy()
    bodies[[0, 1]] = bodies[[1, 0]]
    with pytest.raises(GraphError, match="bodyId must be strictly ascending"):
        fskg.parse_graph(data[:fskg.HEADER.size] + bodies.tobytes() + data[fskg.HEADER.size + bodies.nbytes:])


def test_a_synthetic_graph_a_missing_manifest_and_a_swapped_file_are_refused(tmp_path):
    path = tmp_path / "tiny.fskg"
    fskg.write_graph(path, tiny(), {"synthetic": True})
    with pytest.raises(GraphError, match="synthetic"):
        fskg.read_graph(path)
    fskg.write_graph(path, tiny(), {})             # a manifest that does not say: not trusted either
    with pytest.raises(GraphError, match="synthetic"):
        fskg.read_graph(path)
    fskg.write_graph(path, tiny(), {"synthetic": False})
    other = from_edges({1: "gaba", 2: "gaba"}, [(1, 2, 5)])
    path.write_bytes(fskg.graph_bytes(other))
    with pytest.raises(GraphError, match="does not match the hash"):
        fskg.read_graph(path)
    fskg.manifest_path(path).unlink()
    with pytest.raises(GraphError, match="no manifest"):
        fskg.read_graph(path)
