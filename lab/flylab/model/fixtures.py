"""Write the fixtures that bind every engine to the oracle (contracts/TRIAL.md, "Fixtures").

Each fixture is self-contained: the model definition it ran under, a tiny graph,
the resolved groups, the trial spec, and the oracle's real state after chosen
steps. Floats appear as IEEE-754 bit patterns so no parser can round them. Only
this module writes fixtures; an engine reads them and must match every value.
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path

import numpy as np

from flylab import CONTRACTS_DIR
from flylab.graph import Graph, from_edges
from flylab.model import oracle
from flylab.model.prng import lane16, threefry2x32
from flylab.model.spec import Model, apply_overrides, load_model, model_from_definition, variant_names

ALWAYS = 0xFFFF  # fires unless the lane is exactly 65535
STRONG = 6000    # synapses: 1650 mV into g, enough to cross threshold in the very step it arrives
ACH, GABA, GLU, DA = "acetylcholine", "gaba", "glutamate", "dopamine"


def float_bits(value: float) -> str:
    return "0x" + struct.pack(">d", float(value)).hex()


def spec_for(model: Model, steps: int, seed: int = 1, drives=(), silenced=(), activated=()) -> dict:
    return {"modelId": model.id, "variant": model.variant, "graphSha256": "", "codecSha256": "", "seed": seed,
            "durationSteps": steps,
            "drives": [{"group": g, "side": side, "thr16": thr, "onStep": on, "offStep": off} for g, side, thr, on, off in drives],
            "silenced": list(silenced),
            "activated": [{"typeOrGroup": g, "thr16": thr, "onStep": on, "offStep": off} for g, thr, on, off in activated]}


def trace_trial(graph: Graph, model: Model, spec: dict, groups: oracle.Groups, trace_steps) -> dict:
    """Run a trial step by step, checking dense against active-set, and capture the state after chosen steps."""
    (spec, fast), (_, dense) = (oracle.prepare(graph, model, spec, groups, variant_names()) for _ in range(2))
    wanted, trace, steps, neurons = set(trace_steps), [], [], []
    for t in range(spec["durationSteps"]):
        step, spiked = fast.step(1)
        dense.step(1, dense=True)
        assert fast.state_hash() == dense.state_hash(), f"active-set and dense updates disagree at step {t}"
        steps.append(step), neurons.append(spiked)
        if t in wanted:
            trace.append({"t": t, "v": [float_bits(x) for x in fast.v], "g": [float_bits(x) for x in fast.g],
                          "refr": fast.refr.tolist(), "spikes": spiked.tolist(), "stateHash": fast.state_hash()})
    return {"trace": trace, "recording": oracle.recording(graph, spec, np.concatenate(steps), np.concatenate(neurons))}


def fixture(name: str, about: str, graph: Graph, model: Model, spec: dict, groups: oracle.Groups, trace_steps) -> dict:
    return {"fixture": name, "about": about, "model": model.definition, "variant": model.variant, "graph": graph.to_json(),
            "groups": {k: v.to_json() for k, v in groups.items()}, "spec": spec, **trace_trial(graph, model, spec, groups, trace_steps)}


def bits_to_float(bits: str) -> float:
    return struct.unpack(">d", bytes.fromhex(bits[2:]))[0]


def invalid(name: str, about: str, graph: Graph, model: Model, spec: dict, groups: oracle.Groups, code: str) -> dict:
    assert oracle.validate(spec, model, graph, groups, variant_names()) == code, (name, oracle.validate(spec, model, graph, groups, variant_names()))
    return {"fixture": name, "about": about, "model": model.definition, "variant": model.variant, "graph": graph.to_json(),
            "groups": {k: v.to_json() for k, v in groups.items()}, "spec": spec, "error": code}


# --------------------------------------------------------------------------- the cases


def lif_cases() -> list[dict]:
    base = load_model()
    cases = []

    # one spike, one synapse: the delay and the shape of a postsynaptic potential
    pair = from_edges({10: ACH, 20: ACH}, [(10, 20, 8)])
    groups = {"in": oracle.members([0], "L"), "out": oracle.members([1], "L")}
    once = spec_for(base, 160, drives=[("in", "both", ALWAYS, 0, 1)])
    psp = fixture("delay-and-psp", "One forced spike at step 0 reaches its target at step 18 and not before; the potential then rises, crests near step 110 and decays.",
                  pair, base, once, groups, range(160))
    assert psp["recording"]["spikeStep"] == [0] and all(entry["v"][1] == float_bits(0.0) for entry in psp["trace"][:18])
    potentials = [bits_to_float(entry["v"][1]) for entry in psp["trace"]]
    crest_step, crest = max(enumerate(potentials), key=lambda pair_: pair_[1])
    assert 100 < crest_step < 130 and potentials[-1] < crest and potentials.count(crest) == 1   # a true, single crest
    cases.append(psp)

    # strict threshold: a potential that crests exactly on threshold never spikes; a threshold one bit lower is crossed at the crest
    for label, threshold in (("equal", crest), ("just-below", math.nextafter(crest, 0.0))):
        model = model_from_definition(apply_overrides(base.definition, {"vThMv": threshold}))
        case = fixture(f"threshold-{label}", f"Threshold set {'exactly at' if label == 'equal' else 'one bit below'} the crest of the potential, step {crest_step}: "
                       f"{'it never spikes, because v > vTh is strict' if label == 'equal' else 'it spikes at the crest and at no other step'}.",
                       pair, model, once, groups, range(160))
        target_spikes = [s for s, b in zip(case["recording"]["spikeStep"], case["recording"]["spikeBodyId"]) if b == "20"]
        assert target_spikes == ([] if label == "equal" else [crest_step]), (label, target_spikes)
        cases.append(case)

    # refractory freeze: v and g frozen for 22 steps, arrivals kept, reset clears g
    trio = from_edges({10: ACH, 11: ACH, 20: ACH}, [(10, 20, STRONG), (11, 20, 8)])
    groups = {"strong": oracle.members([0]), "late": oracle.members([1]), "out": oracle.members([2])}
    spec = spec_for(base, 80, drives=[("strong", "both", ALWAYS, 0, 1), ("late", "both", ALWAYS, 10, 11)])
    freeze = fixture("refractory-freeze", "The target spikes at step 18 and is frozen for 22 steps; an arrival at step 28 is added to g, which neither decays nor moves v until step 41.",
                     trio, base, spec, groups, range(80))
    by_step = {entry["t"]: entry for entry in freeze["trace"]}
    assert by_step[18]["spikes"] == [2] and by_step[18]["g"][2] == float_bits(0.0) and by_step[18]["refr"][2] == 22
    assert by_step[28]["g"][2] == by_step[39]["g"][2] != float_bits(0.0) and by_step[40]["v"][2] == float_bits(0.0)
    assert by_step[40]["refr"][2] == 0 and by_step[41]["v"][2] != float_bits(0.0)
    cases.append(freeze)

    # input neurons: forced inside the window only, and never refractory
    spec = spec_for(base, 20, drives=[("in", "both", ALWAYS, 3, 9)])
    window = fixture("input-window-no-refractory", "An input neuron fires on six consecutive steps inside its window, which a refractory period would forbid, and never outside it.",
                     pair, base, spec, {"in": oracle.members([0]), "out": oracle.members([1])}, range(20))
    assert [s for s, b in zip(window["recording"]["spikeStep"], window["recording"]["spikeBodyId"]) if b == "10"] == [3, 4, 5, 6, 7, 8]
    cases.append(window)

    # the forced-spike comparison is strict: a lane equal to the threshold does not fire, one above it does
    lane = int(lane16(1, 10, 5))
    for label, thr16, expected in (("equal", lane, []), ("one-above", lane + 1, [5])):  # noqa: B007
        spec = spec_for(base, 10, drives=[("in", "both", thr16, 5, 6)])
        case = fixture(f"lane-{label}-to-threshold", f"At step 5 this neuron's lane is {lane}. With thr16 = {thr16} it "
                       f"{'fires' if expected else 'does not fire: lane16 < thr16 is strict'}.", pair, base, spec, {"in": oracle.members([0])}, [5])
        assert case["recording"]["spikeStep"] == expected
        cases.append(case)

    # an input neuron is still a neuron: it integrates, synapses can fire it on consecutive steps, and a forced spike clears its state
    busy = from_edges({10: ACH, 11: ACH, 20: ACH}, [(10, 20, STRONG), (11, 20, 8)])
    groups_busy = {"twice": oracle.members([0]), "weak": oracle.members([1]), "target": oracle.members([2])}
    spec = spec_for(base, 60, drives=[("twice", "both", ALWAYS, 0, 2), ("weak", "both", ALWAYS, 20, 21)], activated=[("target", ALWAYS, 45, 46)])
    busy_case = fixture("input-neuron-with-synapses", "Neuron 20 is an input neuron that also receives synapses. Strong arrivals fire it at steps 18 and 19, back to back, "
                        "because an input neuron is never refractory. A weak arrival at step 38 then charges it, and its forced spike at step 45 empties v and g.",
                        busy, base, spec, groups_busy, [17, 18, 19, 20, 38, 44, 45, 46])
    by_step = {entry["t"]: entry for entry in busy_case["trace"]}
    target_spikes = [s for s, b in zip(busy_case["recording"]["spikeStep"], busy_case["recording"]["spikeBodyId"]) if b == "20"]
    assert target_spikes == [18, 19, 45] and all(entry["refr"][2] == 0 for entry in busy_case["trace"])
    assert bits_to_float(by_step[44]["v"][2]) > 0 and by_step[45]["v"][2] == by_step[45]["g"][2] == float_bits(0.0)
    cases.append(busy_case)

    spec = spec_for(base, 40, drives=[("in", "both", 0, 0, 40)])
    never = fixture("thr16-zero-never-fires", "A threshold of zero never fires: the comparison lane16 < thr16 is strict.", pair, base, spec,
                    {"in": oracle.members([0])}, [0, 39])
    assert never["recording"]["spikeStep"] == []
    cases.append(never)

    # a chain with its middle silenced; activation of a neuron that is not sensory
    chain = from_edges({10: ACH, 20: ACH, 30: ACH}, [(10, 20, STRONG), (20, 30, STRONG)])
    groups = {"in": oracle.members([0]), "middle": oracle.members([1]), "end": oracle.members([2])}
    spec = spec_for(base, 60, drives=[("in", "both", ALWAYS, 0, 1)])
    intact = fixture("chain-intact", "A spike travels down a chain of three, 18 steps per hop.", chain, base, spec, groups, [0, 18, 36, 59])
    assert intact["recording"]["spikeStep"] == [0, 18, 36]
    cases.append(intact)
    spec = spec_for(base, 60, drives=[("in", "both", ALWAYS, 0, 1)], silenced=["middle"])
    cut = fixture("chain-middle-silenced", "With the middle neuron silenced it stays at rest and emits nothing, so the end never hears the spike.", chain, base, spec, groups, [0, 18, 36, 59])
    assert cut["recording"]["spikeStep"] == [0]
    cases.append(cut)
    spec = spec_for(base, 60, activated=[("middle", ALWAYS, 5, 6)])
    lit = fixture("activation", "Activating a cell type is the same mechanism as sensory drive: the middle neuron is forced at step 5 and the end follows at 23.", chain, base, spec, groups, [5, 23, 59])
    assert lit["recording"]["spikeStep"] == [5, 23]
    cases.append(lit)

    # signs: excitation, inhibition, a zero-sign source, and the glutamate variant
    mixed = from_edges({10: ACH, 11: GABA, 12: DA, 13: GLU, 20: ACH}, [(10, 20, 20), (11, 20, 12), (12, 20, 500), (13, 20, 6)])
    groups = {"all": oracle.members([0, 1, 2, 3]), "out": oracle.members([4])}
    spec = spec_for(base, 60, drives=[("all", "both", ALWAYS, 0, 1)])
    signs = fixture("signs-base", "Acetylcholine adds 20 synapses, GABA removes 12, glutamate removes 6, and 500 dopamine synapses count for nothing: net input 2.",
                    mixed, base, spec, groups, [17, 18, 19, 59])
    assert signs["trace"][1]["g"][4] == float_bits(base.w_syn * 2 * base.b)
    cases.append(signs)
    glu = load_model("gluExcitatory")
    spec = spec_for(glu, 60, drives=[("all", "both", ALWAYS, 0, 1)])
    signs = fixture("signs-glu-excitatory", "The same trial under the gluExcitatory variant: glutamate now adds its 6 synapses, net input 14.",
                    mixed, glu, spec, groups, [17, 18, 19, 59])
    assert signs["trace"][1]["g"][4] == float_bits(base.w_syn * 14 * base.b)
    cases.append(signs)

    # body IDs wider than 32 bits: the high word takes part in the random input
    low_id, high_id = 7, (1 << 32) + 7
    wide = from_edges({low_id: ACH, high_id: ACH, 99: ACH}, [(low_id, 99, 1), (high_id, 99, 1)])
    groups = {"in": oracle.members([0, 2], "LR"), "out": oracle.members([1])}
    spec = spec_for(base, 400, seed=2026, drives=[("in", "both", 6553, 0, 400)])
    wide_case = fixture("body-id-64-bit", "Body IDs 7 and 2^32 + 7 share their low 32 bits. Driven at about 10% per step, their trains differ, so the high word takes part.",
                        wide, base, spec, groups, [0, 199, 399])
    trains = {body: [s for s, b in zip(wide_case["recording"]["spikeStep"], wide_case["recording"]["spikeBodyId"]) if b == body]
              for body in (str(low_id), str(high_id))}
    assert all(trains.values()) and trains[str(low_id)] != trains[str(high_id)]
    cases.append(wide_case)

    # one side only
    sided = from_edges({10: ACH, 11: ACH, 20: ACH}, [(10, 20, 8), (11, 20, 8)])
    groups = {"taste": oracle.members([0, 1], "LR"), "out": oracle.members([2])}
    spec = spec_for(base, 30, drives=[("taste", "left", ALWAYS, 0, 1)])
    left = fixture("drive-left-only", "A drive on the left side reaches only the group's left member.", sided, base, spec, groups, [0, 18, 29])
    assert left["recording"]["spikeBodyId"] == ["10"]
    cases.append(left)

    # snap to rest: a small potential decays until both v and g fall under snapEps, then the state is exactly zero
    weak = from_edges({10: ACH, 20: ACH}, [(10, 20, 1)])
    groups = {"in": oracle.members([0])}
    spec = spec_for(base, 4200, drives=[("in", "both", ALWAYS, 0, 1)])
    snap = fixture("snap-to-rest", "One synapse leaves 0.275 mV in g; about four thousand steps later both v and g are under 1e-9 mV and are set to exact zero.",
                   weak, base, spec, groups, [18, 19, 1000, 3000, 4199])
    assert snap["trace"][-1]["v"][1] == float_bits(0.0) and snap["trace"][-2]["v"][1] != float_bits(0.0)
    cases.append(snap)

    # snap needs BOTH variables small: with a large epsilon, v is under it while g is not, and the potential must survive
    coarse = model_from_definition(apply_overrides(base.definition, {"snapEpsMv": 0.05}))
    spec = spec_for(coarse, 80, drives=[("in", "both", ALWAYS, 0, 1)])
    both = fixture("snap-needs-both-small", "With snapEps raised to 0.05 mV, the first potential of a one-synapse input is under it but g is not. The neuron must not be snapped, and its potential grows.",
                   weak, coarse, spec, groups, [18, 19, 40, 79])
    assert bits_to_float(both["trace"][0]["v"][1]) < 0.05 < bits_to_float(both["trace"][0]["g"][1]) and bits_to_float(both["trace"][2]["v"][1]) > 0.02
    cases.append(both)

    # a frozen neuron is not snapped: arrivals of +20, -12 and -8 synapses on different steps leave a rounding residue in g
    residue = from_edges({10: ACH, 11: ACH, 12: GABA, 13: GABA, 20: ACH}, [(10, 20, STRONG), (11, 20, 20), (12, 20, 12), (13, 20, 8)])
    groups_residue = {"fire": oracle.members([0]), "plus": oracle.members([1]), "minus12": oracle.members([2]), "minus8": oracle.members([3])}
    spec = spec_for(base, 60, drives=[("fire", "both", ALWAYS, 0, 1), ("plus", "both", ALWAYS, 4, 5), ("minus12", "both", ALWAYS, 6, 7), ("minus8", "both", ALWAYS, 8, 9)])
    frozen = fixture("refractory-residue-is-not-snapped", "While neuron 20 is frozen, arrivals of +20, -12 and -8 synapses on three different steps leave a residue near -4e-16 mV in g. "
                     "A frozen neuron is not visited by the snap rule, so the residue stays until the neuron is free at step 41, and only then is it snapped.",
                     residue, base, spec, groups_residue, [18, 22, 24, 26, 27, 40, 41])
    by_step = {entry["t"]: entry for entry in frozen["trace"]}
    assert by_step[26]["g"][4] == by_step[40]["g"][4] and 0 < abs(bits_to_float(by_step[40]["g"][4])) < 1e-9
    assert by_step[41]["g"][4] == by_step[41]["v"][4] == float_bits(0.0)
    cases.append(frozen)

    # a small recurrent net with a bystander at rest: what the active-set update must preserve
    net = from_edges({1: ACH, 2: ACH, 3: GABA, 4: ACH, 5: ACH, 6: ACH},
                     [(1, 2, 4000), (2, 3, 4000), (2, 4, 4000), (3, 4, 9000), (4, 2, 30), (4, 5, 10)])
    groups = {"in": oracle.members([0]), "loop": oracle.members([1, 2, 3])}
    spec = spec_for(base, 300, seed=7, drives=[("in", "both", 3000, 0, 200)])
    cases.append(fixture("recurrent-net-with-bystander", "Excitation, feedback inhibition and a neuron nobody talks to. The generator ran this with the dense and the active-set update and they agreed at every step.",
                         net, base, spec, groups, [0, 50, 100, 150, 200, 250, 299]))

    # a sentinel that fires is a breach, and stays out of the spike hash
    guard = from_edges({10: ACH, 20: ACH, 30: ACH, 31: ACH}, [(10, 20, STRONG), (10, 30, STRONG), (10, 31, STRONG)], sentinels=(30, 31))
    groups = {"in": oracle.members([0])}
    spec = spec_for(base, 40, drives=[("in", "both", ALWAYS, 0, 1)])
    breach = fixture("sentinel-breach", "Neurons 30 and 31 are sentinels. Both fire at step 18. That step is reported as a breach, once, and neither spike enters the spike list or the spike hash.",
                     guard, base, spec, groups, [18])
    assert breach["recording"]["sentinelBreaches"] == [18] and breach["recording"]["spikeBodyId"] == ["10", "20"]
    cases.append(breach)

    # a group name outside ASCII: the canonical JSON keeps it as UTF-8, as JSON.stringify does
    spec = spec_for(base, 20, drives=[("甘味", "both", ALWAYS, 0, 1)])
    named = fixture("group-name-outside-ascii", "The group is called 甘味. The spec hash is taken over UTF-8 bytes with the name unescaped.",
                    pair, base, spec, {"甘味": oracle.members([0])}, [0, 18])
    assert named["recording"]["specSha256"] == __import__("hashlib").sha256(oracle.canonical_json(spec)).hexdigest() and "\\u" not in oracle.canonical_json(spec).decode()
    cases.append(named)
    return cases


def invalid_cases() -> list[dict]:
    """One fixture per way to be refused, then one per neighbouring pair of checks, to pin their order."""
    base = load_model()
    graph = from_edges({10: ACH, 11: ACH, 20: ACH}, [(10, 20, 8), (11, 20, 8)])
    groups = {"a": oracle.members([0, 1], "LR"), "left-only": oracle.members([0], "L"), "out": oracle.members([2])}
    good = spec_for(base, 30, drives=[("a", "both", 100, 0, 30)])
    assert oracle.validate(good, base, graph, groups, variant_names()) is None

    def changed(**updates) -> dict:
        return {**good, **updates}

    def drive(**updates) -> list[dict]:
        return [{**good["drives"][0], **updates}]

    twice = [{**good["drives"][0], "offStep": 10}, {"group": "left-only", "side": "both", "thr16": 100, "onStep": 20, "offStep": 30}]
    fine = spec_for(base, 30, drives=[("a", "right", 100, 0, 30)], silenced=["left-only"])
    assert oracle.validate(fine, base, graph, groups, variant_names()) is None  # sides are resolved before neurons are compared
    integral = changed(seed=1.0, durationSteps=3e1)
    assert oracle.validate(integral, base, graph, groups, variant_names()) is None and oracle.spec_sha256(integral) == oracle.spec_sha256(good)

    one_defect = [
        ("missing-key", "A key is missing.", {k: v for k, v in good.items() if k != "silenced"}, oracle.BAD_FIELD),
        ("stray-key", "An unknown key is an error, so a typo cannot be ignored.", changed(sede=3), oracle.BAD_FIELD),
        ("fractional-seed", "A trial spec holds strings and integers. 1.0 would be accepted as the integer 1; 1.5 is not an integer.", changed(seed=1.5), oracle.BAD_FIELD),
        ("boolean-seed", "true is not the integer 1.", changed(seed=True), oracle.BAD_FIELD),
        ("seed-of-33-bits", "A seed must fit 32 unsigned bits.", changed(seed=2**32), oracle.BAD_FIELD),
        ("negative-seed", "A seed cannot be negative.", changed(seed=-1), oracle.BAD_FIELD),
        ("no-steps", "A trial lasts at least one step.", changed(durationSteps=0), oracle.BAD_FIELD),
        ("too-many-steps", "A trial lasts at most 2^31 - 1 steps.", changed(durationSteps=2**31), oracle.BAD_FIELD),
        ("threshold-too-wide", "thr16 must fit 16 bits.", changed(drives=drive(thr16=70000)), oracle.BAD_FIELD),
        ("threshold-as-text", "thr16 is an integer, not a string.", changed(drives=drive(thr16="100")), oracle.BAD_FIELD),
        ("unknown-side", "A side is both, left or right.", changed(drives=drive(side="top")), oracle.BAD_FIELD),
        ("side-not-text", "A side that is not a string is refused, not crashed on.", changed(drives=drive(side=[])), oracle.BAD_FIELD),
        ("empty-window", "A window must hold at least one step.", changed(drives=drive(onStep=5, offStep=5)), oracle.BAD_FIELD),
        ("negative-window", "A window cannot start before step 0.", changed(drives=drive(onStep=-1)), oracle.BAD_FIELD),
        ("window-past-the-end", "A window may not run past the trial.", changed(drives=drive(offStep=31)), oracle.BAD_FIELD),
        ("drive-not-an-object", "A drive is an object.", changed(drives=["a"]), oracle.BAD_FIELD),
        ("drive-with-stray-key", "A drive has exactly its five keys.", changed(drives=drive(rate=10)), oracle.BAD_FIELD),
        ("activation-missing-key", "An activation has exactly its four keys.", changed(activated=[{"typeOrGroup": "out", "thr16": 5, "onStep": 0}]), oracle.BAD_FIELD),
        ("silenced-not-text", "Silenced entries are group names.", changed(silenced=[3]), oracle.BAD_FIELD),
        ("unknown-model", "The spec names another model.", changed(modelId="lif-other"), oracle.UNKNOWN_MODEL),
        ("unregistered-variant", "The spec names a variant nobody registered.", changed(variant="nope"), oracle.UNKNOWN_VARIANT),
        ("variant-not-loaded", "gluExcitatory is registered, but this engine was loaded with base.", changed(variant="gluExcitatory"), oracle.UNKNOWN_VARIANT),
        ("graph-mismatch", "The spec was made for another graph.", changed(graphSha256="ab" * 32), oracle.GRAPH_MISMATCH),
        ("unknown-group", "A drive names a group that was not resolved.", changed(drives=drive(group="nope")), oracle.UNKNOWN_GROUP),
        ("unknown-silenced-group", "A silencing names a group that was not resolved.", changed(silenced=["nope"]), oracle.UNKNOWN_GROUP),
        ("driven-twice", "Neuron 10 sits in two drives, even though their windows do not overlap.", changed(drives=twice), oracle.NEURON_DRIVEN_TWICE),
        ("driven-and-activated", "Neuron 10 is driven and also activated: an activation is a drive.", changed(activated=[{"typeOrGroup": "left-only", "thr16": 5, "onStep": 0, "offStep": 3}]), oracle.NEURON_DRIVEN_TWICE),
        ("silenced-and-driven", "Neuron 10 is driven on the left and silenced by name.", changed(drives=drive(side="left"), silenced=["left-only"]), oracle.NEURON_SILENCED_AND_DRIVEN),
    ]
    # two defects at once: the check that comes first in TRIAL.md's table must win
    in_order = [
        ("order-field-before-model", changed(seed=-1, modelId="lif-other"), oracle.BAD_FIELD),
        ("order-model-before-variant", changed(modelId="lif-other", variant="nope"), oracle.UNKNOWN_MODEL),
        ("order-variant-before-graph", changed(variant="nope", graphSha256="ab" * 32), oracle.UNKNOWN_VARIANT),
        ("order-graph-before-group", changed(graphSha256="ab" * 32, drives=drive(group="nope")), oracle.GRAPH_MISMATCH),
        ("order-group-before-driven-twice", changed(drives=twice, silenced=["nope"]), oracle.UNKNOWN_GROUP),
        ("order-driven-twice-before-silenced", changed(drives=twice, silenced=["left-only"]), oracle.NEURON_DRIVEN_TWICE),
    ]
    cases = [invalid(f"invalid-{name}", about, graph, base, spec, groups, code) for name, about, spec, code in one_defect]
    cases += [invalid(f"invalid-{name}", "Two defects at once; the earlier check in the table wins.", graph, base, spec, groups, code) for name, spec, code in in_order]
    valid = {"fixture": "valid-integral-floats", "about": "1.0 and 3e1 are the integers 1 and 30: JSON.parse cannot tell them apart, so nobody may. The spec is valid and hashes like the plain one.",
             "model": base.definition, "variant": base.variant, "graph": graph.to_json(), "groups": {k: v.to_json() for k, v in groups.items()},
             "spec": integral, "error": None, "specSha256": oracle.spec_sha256(integral)}
    return cases + [valid]


def prng_cases() -> dict:
    vectors = [((0, 0), (0, 0)), ((0xFFFFFFFF,) * 2, (0xFFFFFFFF,) * 2), ((0x13198A2E, 0x03707344), (0x243F6A88, 0x85A308D3))]
    known = [{"key": [f"{k:08x}" for k in key], "counter": [f"{c:08x}" for c in ctr],
              "output": [f"{int(w):08x}" for w in threefry2x32(key, ctr)]} for key, ctr in vectors]
    lanes = [{"seed": seed, "bodyId": str(body), "step": step, "lane16": int(lane16(seed, body, step))}
             for seed in (0, 1, 4294967295) for body in (1, 10, 4294967295, 4294967296, 5813105172, (1 << 63) + 5)
             for step in (0, 1, 2, 3, 4, 7, 8, 9999, 123456789)]
    return {"fixture": "threefry2x32-20-lane16",
            "about": "The three published Random123 vectors, then lane16 for seeds, body IDs on both sides of 2^32 and steps on both sides of a block of four.",
            "knownAnswers": known, "lanes": lanes}


# --------------------------------------------------------------------------- writing


def dump(value: dict) -> str:
    return json.dumps(value, indent=1, sort_keys=True, ensure_ascii=False) + "\n"


def write_all(directory: Path = CONTRACTS_DIR / "fixtures") -> list[Path]:
    written = []
    for folder, cases in (("lif", lif_cases()), ("trial", invalid_cases()), ("prng", [prng_cases()])):
        (directory / folder).mkdir(parents=True, exist_ok=True)
        for case in cases:
            path = directory / folder / f"{case['fixture']}.json"
            path.write_text(dump(case), encoding="utf-8")
            written.append(path)
    return written
