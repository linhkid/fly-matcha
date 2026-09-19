"""The harness: can an experiment fail honestly, and can it be gamed?"""

import json
import shutil

import numpy as np
import pytest

from flylab import REPO_ROOT
from flylab.experiments import controls, criteria, harness, mechanics, worlds

E00 = REPO_ROOT / "lab" / "experiments" / "E00-synthetic" / "prereg.json"
SEEDS = [100, 101, 102]


def copy_of_e00(tmp_path):
    folder = tmp_path / "E00-synthetic"
    folder.mkdir()
    shutil.copy(E00, folder / "prereg.json")
    return folder / "prereg.json"


@pytest.fixture(scope="module")
def finished(tmp_path_factory):
    """The synthetic experiment, run once. Tests that need a finished one copy it, trials and all, so a rerun costs nothing."""
    path = copy_of_e00(tmp_path_factory.mktemp("finished"))
    harness.Experiment(path, log=lambda *_: None).confirm(committed=lambda p: True)
    return path.parent


def copy_of_finished(finished, tmp_path):
    shutil.copytree(finished, tmp_path / "E00-synthetic")
    return tmp_path / "E00-synthetic" / "prereg.json"


# ---------------------------------------------------------------- criterion kinds

def test_threshold_counts_seeds():
    c = {"condition": "a", "op": ">=", "value": 10, "overSeeds": {"atLeast": 2, "of": 3}}
    assert criteria.threshold(c, {"a": {100: 10, 101: 9, 102: 30}}, SEEDS) == (True, {"perSeed": [10, 9, 30], "hits": 2})
    assert criteria.threshold(c, {"a": {100: 10, 101: 9, 102: 9}}, SEEDS)[0] is False


def test_ratio_vs_control_lets_a_silent_control_pass_and_a_silent_effect_fail():
    c = {"condition": "a", "minRatio": 10}
    values = {"a": {100: 40, 101: 50, 102: 60}}
    assert criteria.ratio_vs_control(c, values, SEEDS, [0, 5, 2])[0] is True          # 50 / 5 = 10
    assert criteria.ratio_vs_control(c, values, SEEDS, [0, 5.1])[0] is False
    assert criteria.ratio_vs_control(c, {"a": {s: 0 for s in SEEDS}}, SEEDS, [0, 0])[0] is False


def test_paired_drop_compares_the_same_seed_and_nothing_to_cut_is_not_a_cut():
    c = {"conditionA": "a", "conditionB": "b", "minDrop": 0.7, "overSeeds": {"atLeast": 2, "of": 3}}
    passed, observed = criteria.paired_drop(c, {"a": {100: 10, 101: 10, 102: 0}, "b": {100: 3, 101: 2, 102: 0}}, SEEDS)
    assert passed and observed["perSeedDrop"] == [0.7, 0.8, None]
    assert criteria.paired_drop(c, {"a": {100: 10, 101: 10, 102: 0}, "b": {100: 4, 101: 2, 102: 0}}, SEEDS)[0] is False


def test_monotone_allows_a_rise_within_the_tolerance_of_the_first_value():
    c = {"conditions": ["b0", "b1", "b2"], "direction": "nonincreasing", "tolerance": 0.1}
    flat = {"b0": {s: 100 for s in SEEDS}, "b1": {s: 109 for s in SEEDS}, "b2": {s: 20 for s in SEEDS}}
    assert criteria.monotone(c, flat, SEEDS)[0] is True
    flat["b1"] = {s: 111 for s in SEEDS}
    assert criteria.monotone(c, flat, SEEDS)[0] is False


def test_control_fraction_counts_controls_that_reach_a_share_of_the_real_value():
    c = {"condition": "a", "fraction": 0.5, "atMostFraction": 0.05}
    values = {"a": {s: 100 for s in SEEDS}}
    assert criteria.control_fraction(c, values, SEEDS, [0] * 95 + [50] * 5)[0] is True       # five of a hundred
    assert criteria.control_fraction(c, values, SEEDS, [0] * 94 + [50] * 6)[0] is False
    assert criteria.control_fraction(c, values, SEEDS, [0] * 29 + [60])[1]["allowed"] == 1  # one of thirty
    assert criteria.control_fraction(c, {"a": {s: 0 for s in SEEDS}}, SEEDS, [0] * 100)[0] is False   # no effect, nothing to be specific about


def test_fraction_active_reports_the_worst_trial():
    passed, observed = criteria.fraction_active({"maxFraction": 0.2}, {"a": {100: 0.01, 101: 0.19}, "b": {100: 0.21}})
    assert passed is False and (observed["condition"], observed["seed"]) == ("b", 100)


def test_the_decoder_is_set_by_rule_from_confirmation_seeds_and_judged_on_held_out_ones():
    rule = {"measure": "m", "extendFrom": "s", "refuseFrom": "b"}
    confirm = {"s": {100: 40, 101: 55, 102: 60}, "b": {100: 0, 101: 3, 102: 9}}
    thresholds = criteria.decoder_thresholds(rule, confirm, SEEDS)
    assert thresholds == {"extendAtLeast": 55, "refuseAtMost": 3, "separated": True}       # second lowest, second highest
    assert [criteria.decode(v, thresholds) for v in (55, 54, 4, 3)] == ["extend", "neither", "neither", "refuse"]
    c = {"checks": [{"condition": "s", "expect": "extend", "atLeast": 2}, {"condition": "b", "expect": "refuse", "atLeast": 2}]}
    held = {"s": {110: 70, 111: 56, 112: 10}, "b": {110: 0, 111: 1, 112: 30}}
    assert criteria.decoder_accuracy(c, held, [110, 111, 112], thresholds)[0] is True
    overlapping = criteria.decoder_thresholds(rule, {"s": {100: 5, 101: 5, 102: 5}, "b": {100: 9, 101: 9, 102: 9}}, SEEDS)
    assert overlapping["separated"] is False and criteria.decoder_accuracy(c, held, [110, 111, 112], overlapping)[0] is False


# ---------------------------------------------------------------- controls

def test_a_shuffle_keeps_every_row_and_changes_who_receives_it():
    graph = worlds.e00().graph
    shuffled = controls.shuffle(graph, 7)
    assert np.array_equal(shuffled.out_offset, graph.out_offset) and np.array_equal(shuffled.body_id, graph.body_id)
    for i in range(graph.n):
        assert sorted(shuffled.syn_count[shuffled.row(i)].tolist()) == sorted(graph.syn_count[graph.row(i)].tolist())
        targets = shuffled.target[shuffled.row(i)].tolist()
        assert targets == sorted(set(targets)) and i not in targets           # no target twice, never itself
    assert np.array_equal(controls.shuffle(graph, 7).target, shuffled.target)  # a seed from the prereg, not from a clock
    assert any(not np.array_equal(controls.shuffle(graph, s).target, graph.target) for s in range(5))


def test_a_random_population_is_size_matched_excludes_the_real_one_and_repeats():
    pool = np.arange(50)
    drawn = controls.random_population(pool, 6, np.array([1, 2, 3]), seed=9)
    assert len(drawn) == 6 and not set(drawn) & {1, 2, 3} and list(drawn) == sorted(drawn)
    assert np.array_equal(drawn, controls.random_population(pool, 6, np.array([1, 2, 3]), seed=9))
    with pytest.raises(ValueError):
        controls.random_population(np.arange(5), 6, np.array([]), seed=1)


# ---------------------------------------------------------------- the runner's rules

def test_the_synthetic_experiment_passes_a_true_claim_fails_a_false_one_and_rejects_a_cliff(finished):
    verdict = json.loads((finished / "verdict.json").read_text())
    outcome = {r["id"]: ("pass" if r["pass"] else r["rejected"] or "fail") for r in verdict["criteria"]}
    assert outcome == {"T1": "pass", "T2": "fail", "T3": "no plateau"}
    by_id = {r["id"]: r for r in verdict["criteria"]}
    assert by_id["T1"]["passingValues"] == [0.19, 0.275, 0.36] and by_id["T3"]["passingValues"] == [0.36] and by_id["T3"]["passAtShipped"] is True
    assert verdict["verdict"] == "fail" and verdict["gates"] == [] and verdict["attempts"] == ["E00-synthetic"]


def test_an_uncommitted_prereg_is_refused_and_consumes_nothing(tmp_path):
    path = copy_of_e00(tmp_path)
    with pytest.raises(harness.HarnessError, match="not committed"):
        harness.Experiment(path, log=lambda *_: None).confirm()              # the real check: a file in a temporary folder is not in git
    assert not (path.parent / "consumed.json").exists()
    assert harness.is_committed(REPO_ROOT / "CLAUDE.md") is True


def test_a_finished_experiment_reproduces_its_verdict_byte_for_byte(finished, tmp_path):
    path = copy_of_finished(finished, tmp_path)
    first = (path.parent / "verdict.json").read_bytes()
    shutil.rmtree(path.parent / "runs")                                       # even with nothing cached
    harness.Experiment(path, log=lambda *_: None).confirm(committed=lambda p: True)
    assert (path.parent / "verdict.json").read_bytes() == first and b"time" not in first.lower()


def test_changing_the_criteria_after_the_seeds_were_consumed_is_refused(finished, tmp_path):
    path = copy_of_finished(finished, tmp_path)
    prereg = json.loads(path.read_text())
    prereg["criteria"][1]["value"] = 0                                       # make the false claim come true
    path.write_text(json.dumps(prereg))
    with pytest.raises(harness.HarnessError, match="new experiment"):
        harness.Experiment(path, log=lambda *_: None).confirm(committed=lambda p: True)


def test_deleting_the_ledger_does_not_reset_an_experiment(finished, tmp_path):
    path = copy_of_finished(finished, tmp_path)
    (path.parent / "consumed.json").unlink()
    with pytest.raises(harness.HarnessError, match="no ledger"):
        harness.Experiment(path, log=lambda *_: None).confirm(committed=lambda p: True)


def test_the_ledger_is_written_before_any_confirmation_seed_runs(tmp_path, monkeypatch):
    path = copy_of_e00(tmp_path)
    experiment = harness.Experiment(path, log=lambda *_: None)

    def stop(*args):
        raise RuntimeError("the first trial")
    monkeypatch.setattr(experiment.trials, "run", stop)
    with pytest.raises(RuntimeError):
        experiment.confirm(committed=lambda p: True)
    ledger = json.loads((path.parent / "consumed.json").read_text())
    assert ledger["seeds"]["confirm"] == [100, 101, 102, 103, 104, 105] and ledger["preregSha256"] == harness.prereg_sha256(path)


def test_pilot_seeds_run_freely_and_leave_no_ledger_and_no_verdict(tmp_path):
    path = copy_of_e00(tmp_path)
    pilot = harness.Experiment(path, log=lambda *_: None).pilot()
    assert sorted(pilot["values"]["r"]["x"]) == [0, 1, 2] and min(pilot["values"]["r"]["x"].values()) > 100
    assert sorted(p.name for p in path.parent.iterdir()) == ["prereg.json", "runs"]


@pytest.mark.parametrize("damage, message", [
    (lambda p: p["criteria"][0].update(kind="vibes"), "fixed list"),
    (lambda p: p["seeds"].update(pilot=[100]), "disjoint"),
    (lambda p: p.update(shipped={"wSynMv": 0.5}), "shipped"),
    (lambda p: p["criteria"][0].update(condition="nowhere"), "does not define"),
    (lambda p: p.update(surprise=1), "unknown keys"),
    (lambda p: p["plateau"].update(param="dtMs"), "not swept"),
])
def test_a_malformed_prereg_is_refused(tmp_path, damage, message):
    path = copy_of_e00(tmp_path)
    prereg = json.loads(path.read_text())
    damage(prereg)
    path.write_text(json.dumps(prereg))
    with pytest.raises(harness.HarnessError, match=message):
        harness.load_prereg(path)


# ---------------------------------------------------------------- the mechanics gate

def test_a_mechanic_cannot_be_switched_on_without_a_passed_experiment_that_gates_it(tmp_path):
    mechanics_file, experiments = tmp_path / "mechanics.json", tmp_path / "experiments"
    (experiments / "E01").mkdir(parents=True)
    write = lambda enabled: mechanics_file.write_text(json.dumps([{"id": "taste.drink", "requires": "E01", "enabled": enabled}]))
    write(False)
    assert mechanics.unlicensed(mechanics_file, experiments) == []
    write(True)
    assert "no verdict" in mechanics.unlicensed(mechanics_file, experiments)[0]
    (experiments / "E01" / "verdict.json").write_text(json.dumps({"verdict": "fail", "gates": []}))
    assert "ended in fail" in mechanics.unlicensed(mechanics_file, experiments)[0]
    (experiments / "E01" / "verdict.json").write_text(json.dumps({"verdict": "pass", "gates": ["taste.brake"]}))
    assert "does not gate" in mechanics.unlicensed(mechanics_file, experiments)[0]
    (experiments / "E01" / "verdict.json").write_text(json.dumps({"verdict": "pass", "gates": ["taste.drink"]}))
    assert mechanics.unlicensed(mechanics_file, experiments) == []


def test_the_committed_mechanics_are_all_licensed():
    assert mechanics.unlicensed() == []
