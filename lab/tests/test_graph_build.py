"""Building a graph: every filter in the contract, on a table small enough to check by hand."""

import numpy as np
import pandas as pd
import pytest

from flylab.graph import build
from flylab.graph.graph import GraphError

BODY = np.array([7, 20, 31, 2**32 + 7], dtype=np.uint64)


def batches(rows, size=3):
    table = np.array(rows, dtype=np.int64).reshape(-1, 3)
    for start in range(0, len(table), size):
        part = table[start:start + size]
        yield part[:, 0].astype(np.uint64), part[:, 1].astype(np.uint64), part[:, 2]


def test_neurons_are_the_typed_bodies_ascending_with_the_datasets_transmitter():
    annotations = pd.DataFrame({"bodyId": [31, 7, 99, 20, 2**32 + 7], "type": ["A", "B", None, "C", "D"]})
    transmitters = pd.DataFrame({"body": [7, 20, 31, 99], "consensus_nt": ["Acetylcholine", "GABA", "unclear", "glutamate"]})
    body, nt, untyped = build.neurons_of(annotations, transmitters)
    assert body.tolist() == BODY.tolist() and body.dtype == np.uint64
    assert nt.tolist() == [1, 2, 0, 0]          # unclear is unknown; a body the transmitter table does not list is unknown
    assert untyped == 1
    with pytest.raises(GraphError, match="twice"):
        build.neurons_of(pd.DataFrame({"bodyId": [7, 7], "type": ["A", "A"]}), transmitters)


def test_pairs_are_summed_before_the_threshold_self_edges_go_and_everything_is_counted():
    rows = [
        (7, 20, 3), (7, 20, 2),                  # two rows of one pair: 5 together, kept only because they are summed first
        (20, 7, 4),                              # below the threshold
        (31, 31, 50),                            # a self-edge
        (2**32 + 7, 7, 9), (7, 2**32 + 7, 6), (7, 31, 5),
        (99, 7, 100), (7, 99, 100),              # 99 is not a neuron
    ]
    out_offset, target, syn_count, counts = build.edges_of(batches(rows), BODY, 5)
    assert out_offset.tolist() == [0, 3, 3, 3, 4]
    assert target.tolist() == [1, 2, 3, 0] and syn_count.tolist() == [5, 5, 6, 9]      # row 7: 20, 31, 2^32+7, ascending
    assert counts == {"weightsRows": 9, "rowsBetweenTyped": 7, "summedDuplicatePairs": 1, "droppedBelowThreshold": 1, "droppedSelfEdges": 1}
    assert counts["rowsBetweenTyped"] - counts["summedDuplicatePairs"] - counts["droppedSelfEdges"] - counts["droppedBelowThreshold"] == len(target)
    assert (out_offset.dtype, target.dtype, syn_count.dtype) == (np.uint32, np.uint32, np.uint16)


def test_a_small_self_edge_is_a_self_edge_not_a_weak_pair():
    _, target, _, counts = build.edges_of(batches([(31, 31, 2), (7, 20, 9), (20, 7, 1)]), BODY, 5)
    assert (counts["droppedSelfEdges"], counts["droppedBelowThreshold"], len(target)) == (1, 1, 1)


def test_body_ids_stay_64_bit_whatever_the_table_hands_over():
    big = np.array([2**60, 2**60 + 1, 2**60 + 2], dtype=np.uint64)     # as float64 these three are one number
    signed = [(np.array([2**60], dtype=np.int64), np.array([2**60 + 2], dtype=np.int64), np.array([7], dtype=np.int64))]
    out_offset, target, syn_count, _ = build.edges_of(iter(signed), big, 5)
    assert out_offset.tolist() == [0, 1, 1, 1] and target.tolist() == [2] and syn_count.tolist() == [7]


def test_rows_with_no_neurons_at_all_are_counted_and_nothing_breaks():
    out_offset, target, _, counts = build.edges_of(batches([(7, 20, 9)]), np.zeros(0, dtype=np.uint64), 5)
    assert out_offset.tolist() == [0] and len(target) == 0 and counts["weightsRows"] == 1 and counts["rowsBetweenTyped"] == 0


def test_the_order_of_the_rows_and_the_size_of_the_batches_do_not_matter():
    rows = [(7, 20, 9), (20, 31, 8), (31, 7, 7), (7, 31, 6), (2**32 + 7, 20, 5), (7, 20, 1)]
    first = build.edges_of(batches(rows, 2), BODY, 5)
    second = build.edges_of(batches(rows[::-1], 5), BODY, 5)
    for a, b in zip(first[:3], second[:3]):
        assert np.array_equal(a, b)


def test_a_pair_with_more_synapses_than_the_file_can_hold_stops_the_build():
    with pytest.raises(GraphError, match="more than the file can hold"):
        build.edges_of(batches([(7, 20, 40000), (7, 20, 30000)]), BODY, 5)
    build.edges_of(batches([(31, 31, 70000)]), BODY, 5)   # a self-edge is dropped before it can overflow


def test_no_rows_is_an_empty_graph_not_a_crash():
    out_offset, target, syn_count, counts = build.edges_of(iter(()), BODY, 5)
    assert out_offset.tolist() == [0, 0, 0, 0, 0] and len(target) == len(syn_count) == 0 and counts["weightsRows"] == 0
