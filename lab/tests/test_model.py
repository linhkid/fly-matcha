"""The reference model: the generator, the normative step, trials and their refusals."""

import json
import math

import numpy as np
import pytest

from flylab import CONTRACTS_DIR
from flylab.graph import Graph, GraphError, from_edges
from flylab.model import fixtures, oracle
from flylab.model.prng import lane16, threefry2x32
from flylab.model.spec import ModelError, apply_overrides, load_model, model_from_definition, variant_names

ACH, GABA = "acetylcholine", "gaba"
ALWAYS = fixtures.ALWAYS
BASE = load_model()


def sim_with(graph, drives=(), silenced=(), seed=1, model=BASE):
    sim = oracle.Sim(graph, model, seed)
    for indices, thr16, on, off in drives:
        sim.drive(indices, thr16, on, off)
    for indices in silenced:
        sim.silence(indices)
    return sim


def spikes_of(sim, steps, neuron=None):
    step, index = sim.step(steps)
    return [s for s, i in zip(step.tolist(), index.tolist()) if neuron is None or i == neuron]


# ---------------------------------------------------------------- the random input

def test_threefry_matches_the_published_random123_vectors():
    # confirmed against Random123's own tests/kat_vectors (columns: counter, key, expected) on 2026-09-19
    assert [int(w) for w in threefry2x32((0, 0), (0, 0))] == [0x6B200159, 0x99BA4EFE]
    assert [int(w) for w in threefry2x32((0xFFFFFFFF,) * 2, (0xFFFFFFFF,) * 2)] == [0x1CB996FC, 0xBB002BE7]
    assert [int(w) for w in threefry2x32((0x13198A2E, 0x03707344), (0x243F6A88, 0x85A308D3))] == [0xC4923A9C, 0x483DF7A0]


def test_four_steps_share_one_block_and_use_its_four_lanes():
    w0, w1 = (int(w) for w in threefry2x32(key=(9, 3), counter=(77, 0)))   # block 3 holds steps 12..15
    assert [int(lane16(9, 77, step)) for step in (12, 13, 14, 15)] == [w0 & 0xFFFF, w0 >> 16, w1 & 0xFFFF, w1 >> 16]


def test_the_high_word_of_a_body_id_takes_part():
    low, high = 7, (1 << 32) + 7
    assert [int(lane16(1, low, s)) for s in range(8)] != [int(lane16(1, high, s)) for s in range(8)]
    assert int(lane16(1, high, 5)) == int(lane16(1, np.array([high], dtype=np.uint64), 5)[0])


def test_a_train_depends_only_on_seed_body_and_step():
    alone = lane16(3, 1234, np.arange(100))
    among_others = lane16(3, np.array([[5], [1234], [99]], dtype=np.uint64), np.arange(100))[1]
    assert (alone == among_others).all()
    assert (lane16(4, 1234, np.arange(100)) != alone).any()


# ---------------------------------------------------------------- the model definition

def test_the_frozen_constants_are_the_exponentials_they_claim_to_be():
    a, b = math.exp(-0.1 / 20), math.exp(-0.1 / 5)
    assert math.isclose(BASE.a, a, rel_tol=1e-15) and math.isclose(BASE.b, b, rel_tol=1e-15)
    assert math.isclose(BASE.c, (a - b) * 5 / 15, rel_tol=1e-14)
    definition = json.loads((CONTRACTS_DIR / "model" / "lif-shiu-v1.json").read_text())
    assert all(format(float(definition[k]), ".17g") == definition[k] for k in "ABC")   # each string is its own round trip


def test_a_variant_changes_exactly_what_it_names_and_nothing_else():
    glu = load_model("gluExcitatory")
    assert glu.sign_by_code[3] == 1 and BASE.sign_by_code[3] == -1
    assert [x for i, x in enumerate(glu.sign_by_code) if i != 3] == [x for i, x in enumerate(BASE.sign_by_code) if i != 3]
    assert variant_names() == {"base", "gluExcitatory"}


@pytest.mark.parametrize("overrides", [{"signPolicy.glutamat": 1}, {"nope": 1}, {"nope.deeper": 1}])
def test_an_override_of_something_that_does_not_exist_is_refused(overrides):
    with pytest.raises(ModelError):
        apply_overrides(BASE.definition, overrides)


def test_a_model_with_a_missing_or_stray_key_or_another_generator_is_refused():
    for change in ({"extra": 1}, {"prng": "xoshiro"}):
        with pytest.raises(ModelError):
            model_from_definition({**BASE.definition, **change})
    with pytest.raises(ModelError):
        load_model("nope")


# ---------------------------------------------------------------- the graph

def test_a_malformed_graph_is_refused():
    good = from_edges({1: ACH, 2: ACH, 3: ACH}, [(1, 2, 5), (1, 3, 5)])
    fields = {name: getattr(good, name) for name in ("body_id", "nt", "flags", "out_offset", "target", "syn_count")}
    broken = [
        {"body_id": good.body_id[::-1].copy()},                       # not ascending
        {"target": good.target[::-1].copy()},                         # a row not ascending
        {"target": np.array([1, 9], dtype=np.uint32)},                # target out of range
        {"syn_count": np.array([5, 0], dtype=np.uint16)},             # an edge with no synapses
        {"syn_count": good.syn_count.astype(np.uint32)},              # wrong width
        {"nt": np.array([1, 1, 9], dtype=np.uint8)},                  # unknown transmitter code
        {"flags": np.array([1, 0, 0], dtype=np.uint8)},               # a sentinel with out-edges
        {"out_offset": np.array([0, 2, 2], dtype=np.uint32)},         # wrong length
        {"body_id": np.array([1, 1, 3], dtype=np.uint64)},            # two neurons with one body ID
        {"target": np.array([1, 3], dtype=np.uint32)},                # target equal to N
        {"target": np.array([2, 2], dtype=np.uint32)},                # the same target twice in a row
        {"out_offset": np.array([0, 2, 1, 2], dtype=np.uint32)},      # offsets that go backwards
        {"flags": np.array([0, 0, 2], dtype=np.uint8)},               # a flag bit nobody defined
    ]
    for change in broken:
        with pytest.raises(GraphError):
            Graph(**{**fields, **change})


# ---------------------------------------------------------------- the normative step

PAIR = from_edges({10: ACH, 20: ACH}, [(10, 20, 8)])


def test_nothing_arrives_before_the_delay_and_the_first_potential_is_w_times_count_times_c():
    sim = sim_with(PAIR, drives=[([0], ALWAYS, 0, 1)])
    sim.step(18)
    assert sim.v[1] == 0.0 and sim.g[1] == 0.0
    sim.step(1)
    arrived = BASE.w_syn * 8
    assert sim.v[1] == arrived * BASE.c and sim.g[1] == arrived * BASE.b     # exact: v uses g before it decays


def test_the_potential_follows_the_analytic_curve():
    sim = sim_with(PAIR, drives=[([0], ALWAYS, 0, 1)])
    sim.step(18)
    for k in range(1, 400):
        sim.step(1)
        t = 0.1 * k
        analytic = BASE.w_syn * 8 * (5 / 15) * (math.exp(-t / 20) - math.exp(-t / 5))
        assert math.isclose(sim.v[1], analytic, rel_tol=1e-9)


def test_a_refractory_neuron_is_frozen_for_exactly_22_steps_and_keeps_what_arrives():
    graph = from_edges({10: ACH, 11: ACH, 20: ACH}, [(10, 20, fixtures.STRONG), (11, 20, 8)])
    sim = sim_with(graph, drives=[([0], ALWAYS, 0, 1), ([1], ALWAYS, 10, 11)])
    assert spikes_of(sim, 19, neuron=2) == [18]
    assert (sim.v[2], sim.g[2], sim.refr[2]) == (0.0, 0.0, 22)              # reset clears g as well
    frozen = []
    for _ in range(22):                                                     # steps 19..40
        sim.step(1)
        frozen.append((sim.v[2], sim.g[2]))
    assert all(v == 0.0 for v, _ in frozen)
    assert [g for _, g in frozen[:9]] == [0.0] * 9                          # nothing has arrived yet
    assert {g for _, g in frozen[9:]} == {BASE.w_syn * 8}                   # arrived at step 28, kept, not decayed
    assert sim.refr[2] == 0
    sim.step(1)                                                             # step 41: free again
    assert sim.v[2] == BASE.w_syn * 8 * BASE.c


def test_an_input_neuron_has_no_refractory_period_and_is_forced_only_inside_its_window():
    sim = sim_with(PAIR, drives=[([0], ALWAYS, 3, 9)])
    assert spikes_of(sim, 30, neuron=0) == [3, 4, 5, 6, 7, 8]
    assert sim.refr[0] == 0


def test_a_lane_equal_to_the_threshold_does_not_fire():
    lane = int(lane16(1, 10, 5))                                            # body 10 is neuron 0 of PAIR
    assert spikes_of(sim_with(PAIR, drives=[([0], lane, 5, 6)]), 10) == []
    assert spikes_of(sim_with(PAIR, drives=[([0], lane + 1, 5, 6)]), 10) == [5]


def test_a_threshold_of_zero_never_fires():
    assert spikes_of(sim_with(PAIR, drives=[([0], 0, 0, 500)]), 500) == []


def test_a_silenced_neuron_stays_at_rest_and_emits_nothing():
    chain = from_edges({10: ACH, 20: ACH, 30: ACH}, [(10, 20, fixtures.STRONG), (20, 30, fixtures.STRONG)])
    assert spikes_of(sim_with(chain, drives=[([0], ALWAYS, 0, 1)]), 60) == [0, 18, 36]
    cut = sim_with(chain, drives=[([0], ALWAYS, 0, 1)], silenced=[[1]])
    assert spikes_of(cut, 60) == [0]
    assert (cut.v[1], cut.g[1], cut.acc[1], cut.v[2]) == (0.0, 0.0, 0, 0.0)


def test_silencing_one_neuron_leaves_every_other_input_train_unchanged():
    graph = from_edges({1: ACH, 2: ACH, 3: ACH, 9: ACH}, [(1, 9, 8), (2, 9, 8), (3, 9, 8)])
    def trains(silenced):
        sim = sim_with(graph, drives=[([0], 9000, 0, 600), ([2], 9000, 0, 600)], silenced=silenced, seed=5)
        step, index = sim.step(600)
        return {n: step[index == n].tolist() for n in (0, 2)}
    assert trains([]) == trains([[1]]) and all(trains([]).values())


def test_signs_follow_the_policy_and_a_zero_sign_source_counts_for_nothing():
    graph = from_edges({10: ACH, 11: GABA, 12: "dopamine", 20: ACH}, [(10, 20, 20), (11, 20, 12), (12, 20, 500)])
    sim = sim_with(graph, drives=[([0, 1, 2], ALWAYS, 0, 1)])
    sim.step(19)
    assert sim.g[3] == BASE.w_syn * 8 * BASE.b                               # 20 - 12, and dopamine ignored


def test_the_glutamate_variant_flips_only_glutamate():
    graph = from_edges({10: "glutamate", 20: ACH}, [(10, 20, 6)])
    for model, sign in ((BASE, -1), (load_model("gluExcitatory"), 1)):
        sim = sim_with(graph, drives=[([0], ALWAYS, 0, 1)], model=model)
        sim.step(19)
        assert sim.g[1] == BASE.w_syn * (sign * 6) * BASE.b


def test_the_same_seed_gives_the_same_run_and_another_seed_does_not():
    graph = from_edges({1: ACH, 2: ACH}, [(1, 2, 30)])
    def run(seed):
        sim = sim_with(graph, drives=[([0], 8000, 0, 500)], seed=seed)
        sim.step(500)
        return sim.state_hash()
    assert run(11) == run(11) != run(12)


def test_visiting_only_restless_neurons_equals_visiting_all_of_them():
    rng = np.random.default_rng(0)
    bodies = {int(b): (ACH if rng.random() < 0.7 else GABA) for b in rng.choice(10_000, size=60, replace=False)}
    ids = sorted(bodies)
    edges = {(ids[a], ids[b]): int(rng.integers(1, 4000)) for a, b in rng.integers(0, 60, size=(400, 2)) if a != b}
    graph = from_edges(bodies, [(pre, post, count) for (pre, post), count in edges.items()])
    fast, dense = (sim_with(graph, drives=[(list(range(6)), 5000, 0, 800)], seed=3) for _ in range(2))
    for _ in range(1000):
        fast.step(1)
        dense.step(1, dense=True)
        assert fast.state_hash() == dense.state_hash()
    assert len(fast.step(0)[0]) == 0


# ---------------------------------------------------------------- refusals at the simulator

def test_the_simulator_refuses_a_neuron_driven_twice_or_both_silenced_and_driven():
    for build in (lambda s: s.drive([0], 10, 0, 5).drive([0], 10, 6, 9), lambda s: s.drive([0], 10, 0, 5).silence([0]),
                  lambda s: s.silence([0]).drive([0], 10, 0, 5)):
        with pytest.raises(oracle.SpecError):
            build(oracle.Sim(PAIR, BASE, 1))
    for bad in (lambda s: s.drive([0], 70000, 0, 5), lambda s: s.drive([0], 10, 5, 5)):
        with pytest.raises(oracle.SpecError) as refused:
            bad(oracle.Sim(PAIR, BASE, 1))
        assert refused.value.code == oracle.BAD_FIELD


def test_drives_and_silencing_cannot_change_once_the_trial_has_begun():
    sim = sim_with(PAIR, drives=[([0], ALWAYS, 0, 5)])
    sim.step(1)
    for late in (lambda: sim.drive([1], 10, 2, 5), lambda: sim.silence([1])):
        with pytest.raises(RuntimeError):
            late()


# ---------------------------------------------------------------- trials and fixtures

def test_a_recording_reports_breaches_and_hashes_only_real_neurons():
    guard = from_edges({10: ACH, 20: ACH, 30: ACH}, [(10, 20, fixtures.STRONG), (10, 30, fixtures.STRONG)], sentinels=(30,))
    groups = {"in": oracle.members([0])}
    spec = fixtures.spec_for(BASE, 40, drives=[("in", "both", ALWAYS, 0, 1)])
    rec = oracle.run_trial(guard, BASE, spec, groups, variant_names())
    assert (rec["spikeStep"], rec["spikeBodyId"], rec["sentinelBreaches"]) == ([0, 18], ["10", "20"], [18])
    assert rec["spikeHash"] == oracle.spike_hash(np.array([18, 0]), np.array([20, 10], dtype=np.uint64))   # order free
    assert rec["specSha256"] == oracle.spec_sha256(json.loads(json.dumps(spec)))


def test_the_spec_hash_ignores_key_order_and_whitespace():
    spec = fixtures.spec_for(BASE, 10)
    assert oracle.spec_sha256(dict(reversed(list(spec.items())))) == oracle.spec_sha256(spec)
    assert oracle.canonical_json({"b": 1, "a": [1, 2]}) == b'{"a":[1,2],"b":1}'


def test_every_invalid_fixture_is_refused_with_its_code_and_run_trial_raises_it():
    cases = fixtures.invalid_cases()
    assert {case["error"] for case in cases} >= {oracle.BAD_FIELD, oracle.UNKNOWN_MODEL, oracle.UNKNOWN_VARIANT, oracle.GRAPH_MISMATCH,
                                                 oracle.UNKNOWN_GROUP, oracle.NEURON_DRIVEN_TWICE, oracle.NEURON_SILENCED_AND_DRIVEN, None}
    for case in cases:
        graph = from_edges({10: ACH, 11: ACH, 20: ACH}, [(10, 20, 8), (11, 20, 8)])
        groups = {name: oracle.Members(np.array(m["indices"]), m["sides"]) for name, m in case["groups"].items()}
        if case["error"] is None:
            assert oracle.run_trial(graph, BASE, case["spec"], groups, variant_names())["specSha256"] == case["specSha256"]
            continue
        with pytest.raises(oracle.SpecError) as refused:
            oracle.run_trial(graph, BASE, case["spec"], groups, variant_names())
        assert refused.value.code == case["error"], case["fixture"]


def test_junk_is_refused_with_a_code_and_never_with_a_crash():
    graph = from_edges({10: ACH, 20: ACH}, [(10, 20, 8)])
    groups = {"a": oracle.members([0])}
    good = fixtures.spec_for(BASE, 30, drives=[("a", "both", 100, 0, 30)])
    junk = [None, [], {}, "x", 3.5, True, {"a": {}}, [[]], float("nan"), 2**70, -2**70]
    codes = (oracle.BAD_FIELD, oracle.UNKNOWN_MODEL, oracle.UNKNOWN_VARIANT, oracle.GRAPH_MISMATCH)
    for key in good:
        for value in junk:
            code = oracle.validate({**good, key: value}, BASE, graph, groups, variant_names())
            legal = (key == "codecSha256" and isinstance(value, str)) or (key in ("drives", "silenced", "activated") and value == [])
            assert (code is None) if legal else (code in codes), (key, value, code)
    for key in good["drives"][0]:
        for value in junk:
            code = oracle.validate({**good, "drives": [{**good["drives"][0], key: value}]}, BASE, graph, groups, variant_names())
            assert code in (oracle.BAD_FIELD, oracle.UNKNOWN_GROUP), (key, value, code)
    for value in junk:
        assert oracle.validate(value, BASE, graph, groups, variant_names()) == oracle.BAD_FIELD


def test_a_group_that_does_not_fit_is_a_bug_not_a_refusal():
    graph = from_edges({10: ACH, 20: ACH}, [(10, 20, 8)])
    for bad in (lambda: oracle.Members(np.array([-1]), "L"), lambda: oracle.Members(np.array([1, 0]), "LR"),
                lambda: oracle.Members(np.array([0, 0]), "LR"), lambda: oracle.Members(np.array([0]), "LR"), lambda: oracle.Members(np.array([0]), "X")):
        with pytest.raises(ValueError):
            bad()
    with pytest.raises(ValueError):
        oracle.run_trial(graph, BASE, fixtures.spec_for(BASE, 5, drives=[("a", "both", 1, 0, 5)]), {"a": oracle.members([7])}, variant_names())
    paired = oracle.members([5, 2], "LR")                       # each side letter travels with its index
    assert (paired.indices.tolist(), paired.sides) == ([2, 5], "RL")
    assert paired.on("left").tolist() == [5] and oracle.members([1, 2, 3], "LUR").on("both").tolist() == [1, 2, 3]
    assert oracle.members([1, 2, 3], "LUR").on("left").tolist() == [1]      # unknown side is reached only by 'both'


def test_an_input_neuron_still_integrates_and_a_forced_spike_empties_it():
    graph = from_edges({10: ACH, 11: ACH, 20: ACH}, [(10, 20, fixtures.STRONG), (11, 20, 8)])
    sim = sim_with(graph, drives=[([0], ALWAYS, 0, 2), ([1], ALWAYS, 20, 21), ([2], ALWAYS, 45, 46)])
    assert spikes_of(sim, 45, neuron=2) == [18, 19]              # synapses fire it on consecutive steps: never refractory
    assert sim.v[2] > 0 and sim.g[2] > 0                         # charged by the weak arrival at step 38
    assert spikes_of(sim, 1, neuron=2) == [45] and (sim.v[2], sim.g[2], sim.refr[2]) == (0.0, 0.0, 0)


def test_a_frozen_neuron_is_not_snapped():
    graph = from_edges({10: ACH, 11: ACH, 12: GABA, 13: GABA, 20: ACH}, [(10, 20, fixtures.STRONG), (11, 20, 20), (12, 20, 12), (13, 20, 8)])
    sim = sim_with(graph, drives=[([0], ALWAYS, 0, 1), ([1], ALWAYS, 4, 5), ([2], ALWAYS, 6, 7), ([3], ALWAYS, 8, 9)])
    sim.step(41)
    assert 0 < abs(sim.g[4]) < BASE.snap_eps and sim.refr[4] == 0          # the residue survived 14 frozen steps
    sim.step(1)
    assert (sim.v[4], sim.g[4]) == (0.0, 0.0)


def test_model_parameters_that_would_break_the_premises_are_refused():
    for overrides in ({"vThMv": -1.0}, {"snapEpsMv": -1e-9}, {"delaySteps": 0}, {"delaySteps": 18.9}, {"refracSteps": -1},
                      {"dtMs": 0.5}, {"signPolicy.gaba": 2}):
        with pytest.raises(ModelError):
            model_from_definition(apply_overrides(BASE.definition, overrides))


def test_restless_counts_neurons_away_from_rest():
    sim = sim_with(PAIR, drives=[([0], ALWAYS, 0, 1)])
    sim.step(18)
    assert sim.restless == 0
    sim.step(1)
    assert sim.restless == 1


def test_the_committed_fixtures_regenerate_byte_for_byte(tmp_path):
    written = fixtures.write_all(tmp_path)
    committed = sorted(p for folder in ("lif", "trial", "prng") for p in (CONTRACTS_DIR / "fixtures" / folder).glob("*.json"))
    assert [p.relative_to(tmp_path) for p in sorted(written)] == [p.relative_to(CONTRACTS_DIR / "fixtures") for p in committed]
    for fresh in written:
        assert fresh.read_bytes() == (CONTRACTS_DIR / "fixtures" / fresh.relative_to(tmp_path)).read_bytes(), fresh.name
