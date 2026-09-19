"""The fixed list of criterion kinds (CONTRACTS.md, "Experiments"). A new kind is added here with a test, never inlined in one experiment.

Each kind is a pure function of measured values. `values[condition][seed]` is a measure's value in one trial.
Every function returns `(passed, observed)`, where `observed` is plain data for the verdict and the report.
"""

from __future__ import annotations

import math

OPS = {">=": lambda a, b: a >= b, "<=": lambda a, b: a <= b, ">": lambda a, b: a > b, "<": lambda a, b: a < b}
KINDS = ("threshold", "ratio_vs_control", "paired_drop", "monotone", "control_fraction", "fraction_active", "decoder_accuracy")


def _mean(numbers) -> float:
    numbers = list(numbers)
    return sum(numbers) / len(numbers) if numbers else math.nan


def threshold(c: dict, values: dict, seeds: list[int]) -> tuple[bool, dict]:
    per_seed = [values[c["condition"]][seed] for seed in seeds]
    hits = sum(OPS[c["op"]](v, c["value"]) for v in per_seed)
    return hits >= c["overSeeds"]["atLeast"], {"perSeed": per_seed, "hits": hits}


def ratio_vs_control(c: dict, values: dict, seeds: list[int], control_means: list[float]) -> tuple[bool, dict]:
    real = _mean(values[c["condition"]][seed] for seed in seeds)
    ratios = [None if m == 0 else real / m for m in control_means]          # a control that does nothing passes
    ok = real > 0 and all(r is None or r >= c["minRatio"] for r in ratios)
    return ok, {"real": real, "controls": control_means, "worstRatio": min((r for r in ratios if r is not None), default=None)}


def paired_drop(c: dict, values: dict, seeds: list[int]) -> tuple[bool, dict]:
    drops = []
    for seed in seeds:                                                       # the same seed in both conditions: the same input trains
        a, b = values[c["conditionA"]][seed], values[c["conditionB"]][seed]
        drops.append(None if a == 0 else 1 - b / a)                          # nothing to cut is not a cut
    hits = sum(d is not None and d >= c["minDrop"] for d in drops)
    return hits >= c["overSeeds"]["atLeast"], {"perSeedDrop": drops, "hits": hits}


def monotone(c: dict, values: dict, seeds: list[int]) -> tuple[bool, dict]:
    means = [_mean(values[condition][seed] for seed in seeds) for condition in c["conditions"]]
    slack = c["tolerance"] * means[0]
    steps = [b - a for a, b in zip(means, means[1:])]
    ok = all(step <= slack for step in steps) if c["direction"] == "nonincreasing" else all(step >= -slack for step in steps)
    return ok, {"means": means, "slack": slack}


def control_fraction(c: dict, values: dict, seeds: list[int], control_values: list[float]) -> tuple[bool, dict]:
    real = _mean(values[c["condition"]][seed] for seed in seeds)
    reached = sum(v >= c["fraction"] * real for v in control_values) if real > 0 else len(control_values)
    allowed = math.floor(c["atMostFraction"] * len(control_values))
    return real > 0 and reached <= allowed, {"real": real, "reached": reached, "allowed": allowed, "n": len(control_values), "controlMax": max(control_values, default=None)}


def fraction_active(c: dict, fractions: dict) -> tuple[bool, dict]:
    worst = max(((f, condition, seed) for condition, by_seed in fractions.items() for seed, f in by_seed.items()), default=(0.0, None, None))
    return worst[0] < c["maxFraction"], {"worst": worst[0], "condition": worst[1], "seed": worst[2]}


def decoder_thresholds(rule: dict, values: dict, confirm: list[int]) -> dict:
    """The decoder's two thresholds, by a rule written before any confirmation seed ran. None if the conditions do not separate."""
    extend = sorted(values[rule["extendFrom"]][seed] for seed in confirm)[1]            # the second lowest
    refuse = sorted(values[rule["refuseFrom"]][seed] for seed in confirm)[-2]           # the second highest
    return {"extendAtLeast": extend, "refuseAtMost": refuse, "separated": refuse < extend}


def decode(count: float, thresholds: dict) -> str:
    if count >= thresholds["extendAtLeast"]:
        return "extend"
    return "refuse" if count <= thresholds["refuseAtMost"] else "neither"


def decoder_accuracy(c: dict, values: dict, holdout: list[int], thresholds: dict) -> tuple[bool, dict]:
    if not thresholds["separated"]:
        return False, {"thresholds": thresholds, "checks": []}
    checks = []
    for check in c["checks"]:
        decoded = [decode(values[check["condition"]][seed], thresholds) for seed in holdout]
        hits = sum(d == check["expect"] for d in decoded)
        checks.append({"condition": check["condition"], "expect": check["expect"], "hits": hits, "of": len(holdout), "pass": hits >= check["atLeast"]})
    return all(ch["pass"] for ch in checks), {"thresholds": thresholds, "checks": checks}
