"""The census against synthetic annotations: one test per way it can refuse, and per way a typo could fool it."""

import copy

import pandas as pd
import pytest

from flylab.census import binding as B

COLUMNS = ["bodyId", "type", "instance", "somaSide", "rootSide", "class", "subclass", "flywireType", "hemibrainType", "mancType", "synonyms"]
ANNOTATIONS = pd.DataFrame([
    (1, "MN9", "MN9_L", "L", None, None, "pm", None, None, None, None),
    (2, "MN9", "MN9_R", "R", None, None, "pm", None, None, None, None),
    (10, "LBa", "LBa_L", None, "L", "gustatory", "labellar bristle", None, None, None, None),
    (11, "LBa", "LBa_R", None, "R", "gustatory", "labellar bristle", None, None, None, None),
    (12, "LBb", "LBb_L", None, None, "gustatory", "taste peg", None, None, None, None),
    (13, "LBc", "LBc_R", "L", "R", "gustatory", "taste peg", None, None, None, None),   # soma says L, root says R
    (20, "DNg12_a", "DNg12_a_L", "L", None, None, None, None, None, None, None),
    (21, "DNg12_b", "DNg12_b_R", "R", None, None, None, None, None, None, None),
    (30, "GNG175", "GNG175_L", "L", None, None, None, "CB0008", None, None, "Shiu 2022: Usnea"),
    (40, None, None, "L", None, "gustatory", "taste peg", None, None, None, None),        # untyped: outside the universe
], columns=COLUMNS)
TRANSMITTERS = pd.DataFrame(
    [(1, "acetylcholine", 0.9), (2, "acetylcholine", 0.7), (10, "acetylcholine", 0.8), (11, "gaba", 0.6), (12, "unclear", 0.5), (30, "gaba", 0.9)],
    columns=["body", "consensus_nt", "predicted_nt_confidence"],
)


def role(id, select, expect=None, required=True, kind="annotation"):
    expect = dict(expect or {})
    if "count" in expect or "countRange" in expect:
        expect.setdefault("basis", "observed")
    return {"id": id, "role": "test", "select": select, "expect": expect, "required": required,
            "evidence": {"claim": "c", "source": "s", "kind": kind}, "explain": "e"}


def circuit(*roles, **extra):
    return {"circuit": "t", "version": 1, "roles": list(roles), **extra}


def run(*roles, **extra):
    return B.census(circuit(*roles, **extra), ANNOTATIONS, TRANSMITTERS)


def codes(result):
    return [f.code for f in result.failures]


# ---------------------------------------------------------------- binding

def test_a_well_specified_role_binds_with_sides_transmitters_and_confidence():
    result = run(role("mn9", {"type": ["MN9"]}, {"count": 2, "perSide": 1, "nt": "acetylcholine"}))
    assert result.failures == []
    bound = result.bound["mn9"]
    assert (bound.body_ids, bound.per_side, bound.nt_histogram) == ([1, 2], {"L": 1, "R": 1, "unknown": 0}, {"acetylcholine": 2})
    assert bound.nt_confidence == 0.8


def test_the_soma_side_outranks_the_root_side_and_neither_means_unknown():
    frame = B.prepare(ANNOTATIONS, TRANSMITTERS).set_index("bodyId")
    assert frame.loc[1, "side"] == "L"         # soma
    assert frame.loc[11, "side"] == "R"        # root, because there is no soma
    assert frame.loc[13, "side"] == "L"        # soma L beats root R
    assert frame.loc[12, "side"] == "unknown"  # an instance suffix alone is not evidence of side


def test_untyped_bodies_are_outside_the_universe_because_the_graph_drops_them():
    assert 40 not in set(B.prepare(ANNOTATIONS, TRANSMITTERS)["bodyId"])
    pegs = run(role("pegs", {"where": {"subclass": ["taste peg"]}}))
    assert pegs.bound["pegs"].body_ids == [12, 13]
    assert codes(run(role("explicit", {"bodyIds": ["40"]}))) == [B.BODYID_ABSENT]


def test_labels_the_model_does_not_know_become_unknown():
    frame = B.prepare(ANNOTATIONS, TRANSMITTERS).set_index("bodyId")
    assert frame.loc[12, "nt"] == "unknown"   # 'unclear' in the source
    assert frame.loc[20, "nt"] == "unknown"   # no prediction at all


def test_names_are_alternatives_and_column_filters_narrow_them():
    either = run(role("r", {"type": ["LBa"], "typeRegex": "^LBb$"}))
    assert either.bound["r"].body_ids == [10, 11, 12]
    narrowed = run(role("r", {"typeRegex": "^LB", "where": {"class": ["gustatory"], "subclass": ["taste peg"]}}))
    assert narrowed.bound["r"].body_ids == [12, 13]
    by_column_alone = run(role("r", {"where": {"subclass": ["pm"]}}))
    assert by_column_alone.bound["r"].types == ["MN9"]
    assert run(role("r", {"typeRegex": "^LB", "side": "L"})).bound["r"].body_ids == [10, 13]
    assert run(role("r", {"typeRegex": "^LB", "whereNull": ["somaSide"]})).bound["r"].body_ids == [10, 11, 12]
    assert run(role("r", {"contains": {"synonyms": "Shiu 2022:"}}, kind="crosswalk")).bound["r"].types == ["GNG175"]
    assert "somaSide is empty" in run(role("r", {"typeRegex": "^LB", "whereNull": ["somaSide"]})).bound["r"].matched_by


# ---------------------------------------------------------------- refusals

def test_type_not_found_suggests_the_subtypes_it_probably_meant():
    result = run(role("groom", {"type": ["DNg12"]}))
    assert codes(result) == [B.TYPE_NOT_FOUND]
    assert result.failures[0].nearest[:2] == ["DNg12_a", "DNg12_b"]
    assert "groom" not in result.bound


def test_type_not_found_follows_the_datasets_own_synonyms():
    result = run(role("relay", {"type": ["Usnea"]}))
    assert any("GNG175" in s and "Shiu 2022: Usnea" in s for s in result.failures[0].nearest)


def test_count_out_of_range():
    assert codes(run(role("mn9", {"type": ["MN9"]}, {"count": 3}))) == [B.COUNT_OUT_OF_RANGE]
    assert codes(run(role("mn9", {"type": ["MN9"]}, {"countRange": [1, 5]}))) == []


def test_nt_mismatch_needs_at_least_half():
    assert codes(run(role("lba", {"type": ["LBa"]}, {"nt": "acetylcholine"}))) == []                # exactly half
    assert codes(run(role("lb", {"typeRegex": "^LB[ab]"}, {"nt": "acetylcholine"}))) == [B.NT_MISMATCH]  # one of three


def test_side_imbalance():
    assert codes(run(role("lb", {"typeRegex": "^LB[ac]"}, {"perSide": 1}))) == [B.SIDE_IMBALANCE]   # two left, one right
    assert codes(run(role("lb", {"type": ["LBa"]}, {"perSide": 1}))) == []


def test_bodyid_absent():
    result = run(role("explicit", {"bodyIds": ["1", "999"]}))
    assert codes(result) == [B.BODYID_ABSENT]
    assert result.failures[0].found == ["999"]


@pytest.mark.parametrize("order", [(0, 1), (1, 0)])
def test_every_party_to_a_taste_overlap_fails_whatever_the_file_order(order):
    roles = [role("grn.sweet", {"type": ["LBa"]}), role("grn.maybe", {"typeRegex": "^LB[ab]"}, required=False)]
    result = run(*[roles[i] for i in order])
    assert sorted(f.group for f in result.failures) == ["grn.maybe", "grn.sweet"]
    assert all(f.code == B.OVERLAP for f in result.failures)
    assert result.bound == {}
    sweet = next(f for f in result.failures if f.group == "grn.sweet")
    assert sweet.found == {"alsoIn": ["grn.maybe"], "bodyIds": ["10", "11"], "contested": 2}
    assert sweet.required


def test_an_overlap_is_reported_even_when_a_party_already_failed_for_another_reason():
    result = run(role("grn.a", {"type": ["LBa"]}, {"count": 9}), role("grn.b", {"type": ["LBa"]}))
    assert sorted((f.group, f.code) for f in result.failures) == [("grn.a", B.COUNT_OUT_OF_RANGE), ("grn.a", B.OVERLAP), ("grn.b", B.OVERLAP)]


def test_groups_outside_taste_may_share_neurons():
    assert run(role("relay.a", {"type": ["GNG175"]}), role("relay.b", {"type": ["GNG175"]})).failures == []


def test_failures_remember_whether_their_role_was_required():
    result = run(role("a", {"type": ["Nope"]}, required=True), role("b", {"type": ["Nada"]}, required=False))
    assert [f.required for f in result.failures] == [True, False]
    assert [f.group for f in result.required_failures] == ["a"]


# ---------------------------------------------------------------- a typo must not fool it

@pytest.mark.parametrize("mutate", [
    lambda r: r["expect"].update({"Count": 99}),                      # misspelt expectation would switch a check off
    lambda r: r["select"].update({"wher": {"class": ["gustatory"]}}),  # misspelt filter would widen the binding
    lambda r: r["select"].update({"side": "left"}),
    lambda r: r["select"].update({"where": {"klass": ["gustatory"]}}),
    lambda r: r["select"].update({"typeRegex": "^LB("}),
    lambda r: r["expect"].update({"countRange": [1]}),
    lambda r: r["expect"].update({"count": 0, "basis": "observed"}),
    lambda r: r["expect"].update({"count": 2, "countRange": [1, 3], "basis": "observed"}),
    lambda r: r["expect"].update({"count": 2}),                        # a count with no stated basis
    lambda r: r["expect"].update({"nt": "acetylcholin"}),
    lambda r: r["evidence"].update({"kind": "hunch"}),
    lambda r: r.update({"select": {}}),
    lambda r: r.update({"select": {"bodyIds": ["1"], "side": "L"}}),
    lambda r: r.update({"notes": "stray key"}),
])
def test_a_malformed_role_is_refused_before_any_binding(mutate):
    bad = role("x", {"type": ["MN9"]})
    mutate(bad)
    with pytest.raises(B.CircuitError):
        B.census(circuit(bad), ANNOTATIONS, TRANSMITTERS)


def test_duplicate_role_ids_are_refused():
    with pytest.raises(B.CircuitError):
        run(role("x", {"type": ["MN9"]}), role("x", {"type": ["MN9"]}))


# ---------------------------------------------------------------- the lock and the gate

def test_the_lock_is_byte_stable_and_describes_whole_types():
    roles = (role("mn9", {"type": ["MN9"]}), role("grn.sweet", {"type": ["LBa"], "side": "L"}, kind="paper"))
    first = B.dump_lock(B.build_lock(circuit(*roles), run(*roles), "abc", "def"))
    shuffled = ANNOTATIONS.sample(frac=1, random_state=7)
    second = B.dump_lock(B.build_lock(circuit(*roles), B.census(circuit(*roles), shuffled, TRANSMITTERS), "abc", "def"))
    assert first == second
    lock = B.build_lock(circuit(*roles), run(*roles), "abc", "def")
    assert lock["groups"][1] == {"id": "grn.sweet", "bodyIds": ["10"], "sides": "L", "perSide": {"L": 1, "R": 0, "unknown": 0},
                                 "ntHistogram": {"acetylcholine": 1}, "evidenceKind": "paper"}
    mn9 = lock["groups"][0]
    assert len(mn9["sides"]) == len(mn9["bodyIds"]) and set(mn9["sides"]) <= set("LRU")   # a trial can drive one side: each body says which it is on
    assert lock["version"] == 2
    # one of two LBa neurons is bound, yet the type entry describes the whole type: hop depth will be a property of types
    assert {t["type"]: (t["nNeurons"], t["nt"], t["hopDepth"]) for t in lock["types"]} == {"LBa": (2, "acetylcholine", None), "MN9": (2, "acetylcholine", None)}
    assert (lock["annotationsSha256"], lock["transmittersSha256"], lock["graphSha256"]) == ("abc", "def", None)


def test_no_lock_can_be_built_from_a_census_with_a_failed_required_role():
    failed = (role("mn9", {"type": ["MN10"]}),)
    with pytest.raises(ValueError):
        B.build_lock(circuit(*failed), run(*failed), "abc", "def")


def test_the_gate_passes_only_on_independent_evidence_and_explained_anchors():
    good = (role("mn9", {"type": ["MN9"]}), role("grn.sweet", {"type": ["LBa"]}, kind="paper"))
    result = run(*good)
    assert B.gate(circuit(*good), result, B.check_anchors({"anchors": [{"type": "MN9", "expected": 2}]}, result.frame))["pass"]

    crosswalk_only = copy.deepcopy(good)
    crosswalk_only[1]["evidence"]["kind"] = "crosswalk"
    assert not B.gate(circuit(*crosswalk_only), run(*crosswalk_only), [])["pass"]

    missing = (role("mn9", {"type": ["MN10"]}),)
    assert not B.gate(circuit(*missing), run(*missing), [])["pass"]

    wrong = B.check_anchors({"anchors": [{"type": "MN9", "expected": 3}]}, result.frame)
    assert not B.gate(circuit(*good), result, wrong)["pass"]
    explained = B.check_anchors({"anchors": [{"type": "MN9", "expected": 3, "explanation": "the explorer double-counted"}]}, result.frame)
    assert B.gate(circuit(*good), result, explained)["pass"]


def test_aliases_report_where_a_literature_name_lives():
    frame = B.prepare(ANNOTATIONS, TRANSMITTERS)
    rows = B.resolve_aliases({"aliases": [{"name": "Usnea"}, {"name": "aBN1"}, {"name": "MN9"}, {"name": "G2N-1 (x)["}]}, frame)
    assert rows[0]["matches"] == [{"type": "GNG175", "column": "synonyms", "value": "Shiu 2022: Usnea", "neurons": 1}]
    assert rows[1]["matches"] == [] and not rows[1]["isType"]
    assert rows[2]["isType"]
    assert rows[3]["matches"] == []   # regex metacharacters in a name are harmless


def test_a_circuit_file_cannot_claim_the_layer_that_is_counted():
    hub = role("hub.mine", {"type": ["MN9"]})
    with pytest.raises(B.CircuitError, match="hub."):
        B.validate_circuit(circuit(hub))
    counted = role("mn9", {"type": ["MN9"]}, kind="connectivity")
    with pytest.raises(B.CircuitError, match="bind_connectivity"):
        B.validate_circuit(circuit(counted))
