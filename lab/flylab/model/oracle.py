"""The oracle: the normative step of contracts/MODEL.md, and trials as contracts/TRIAL.md defines them.

This is one of exactly two implementations of the model. The other is the
browser engine, which must reproduce the fixtures this module writes, bit for
bit. Float arithmetic here is restricted to what two languages share: float64
add and multiply on plain NumPy ufuncs, constants parsed from frozen strings,
no ``exp``, no fused multiply-add. Synaptic input is summed as integers, so the
order of addition cannot matter.

A neuron at exact rest stays at exact rest, so ``step`` only visits neurons
whose state is not zero, that receive input, or that may be forced. ``dense``
visits every neuron instead; the two must agree step for step.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

import numpy as np

from flylab.graph import Graph
from flylab.model.prng import lane16
from flylab.model.spec import Model

ENGINE = {"name": "flylab-oracle", "version": "1"}
SIDES = {"both": "LRU", "left": "L", "right": "R"}

BAD_FIELD = "BAD_FIELD"
UNKNOWN_MODEL = "UNKNOWN_MODEL"
UNKNOWN_VARIANT = "UNKNOWN_VARIANT"
GRAPH_MISMATCH = "GRAPH_MISMATCH"
UNKNOWN_GROUP = "UNKNOWN_GROUP"
NEURON_DRIVEN_TWICE = "NEURON_DRIVEN_TWICE"
NEURON_SILENCED_AND_DRIVEN = "NEURON_SILENCED_AND_DRIVEN"

SPEC_KEYS = {"modelId", "variant", "graphSha256", "codecSha256", "seed", "durationSteps", "drives", "silenced", "activated"}
DRIVE_KEYS = {"group", "side", "thr16", "onStep", "offStep"}
ACTIVATION_KEYS = {"typeOrGroup", "thr16", "onStep", "offStep"}


class SpecError(ValueError):
    """An invalid trial. ``code`` is one of the stable codes above; the engine uses the same ones."""

    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(f"{code}: {detail}" if detail else code)
        self.code = code


@dataclass(frozen=True)
class Members:
    """A group resolved against a graph: neuron indices, strictly ascending, and each one's side (L, R or U)."""

    indices: np.ndarray
    sides: str

    def __post_init__(self) -> None:
        indices = np.asarray(self.indices, dtype=np.int64)
        object.__setattr__(self, "indices", indices)
        if len(self.sides) != len(indices) or set(self.sides) - set("LRU"):
            raise ValueError("a group needs exactly one side letter, L, R or U, per neuron")
        if (indices < 0).any() or (np.diff(indices) <= 0).any():
            raise ValueError("group indices must be non-negative and strictly ascending")

    def on(self, side: str) -> np.ndarray:
        """Members a drive on this side reaches. ``both`` reaches all of them, unknown side included."""
        return self.indices[np.array([letter in SIDES[side] for letter in self.sides], dtype=bool)]

    def to_json(self) -> dict:
        return {"indices": self.indices.tolist(), "sides": self.sides}


Groups = dict[str, Members]


def members(indices, sides: str | None = None) -> Members:
    """A group from indices in any order; each side letter travels with its index."""
    indices = list(indices)
    pairs = sorted(zip(indices, sides if sides is not None else "U" * len(indices)))
    return Members(np.array([i for i, _ in pairs], dtype=np.int64), "".join(s for _, s in pairs))


def check_groups(graph: Graph, groups: Groups) -> None:
    """Groups come from a resolver, not from a player: one that does not fit the graph is a bug, not a refusal."""
    for name, group in groups.items():
        if len(group.indices) and group.indices[-1] >= graph.n:
            raise ValueError(f"group {name} names neuron {int(group.indices[-1])}, but the graph has {graph.n}")


# --------------------------------------------------------------------------- the simulator


class Sim:
    def __init__(self, graph: Graph, model: Model, seed: int) -> None:
        if not 0 <= seed < 2**32:
            raise SpecError(BAD_FIELD, "seed must fit 32 bits")
        self.graph, self.model, self.seed, self.t = graph, model, seed, 0
        n = graph.n
        self.v = np.zeros(n, dtype=np.float64)
        self.g = np.zeros(n, dtype=np.float64)
        self.refr = np.zeros(n, dtype=np.int32)
        self.acc = np.zeros(n, dtype=np.int32)
        self._sign = np.array(model.sign_by_code, dtype=np.int32)[graph.nt]
        self._silenced = np.zeros(n, dtype=bool)
        self._silenced_idx = np.empty(0, dtype=np.int64)
        self._is_input = np.zeros(n, dtype=bool)
        self._mark = np.zeros(n, dtype=bool)          # scratch: which neurons this step must visit
        self._forced_now = np.zeros(n, dtype=bool)    # scratch: which of them are forced
        self._drives: list[tuple[np.ndarray, int, int, int]] = []
        self._in_flight: list[np.ndarray] = [np.empty(0, dtype=np.int64) for _ in range(model.delay_steps)]
        self._active = np.empty(0, dtype=np.int64)

    # ---- configuration, before the first step

    def _configuring(self) -> None:
        if self.t:
            raise RuntimeError("drives and silencing are set before the first step: an input neuron is one for the whole trial")

    def drive(self, indices, thr16: int, on_step: int, off_step: int) -> "Sim":
        """Make these neurons input neurons: forced spikes inside the window, no refractory period all trial."""
        self._configuring()
        idx = np.unique(np.asarray(indices, dtype=np.int64))
        if not (_is_int(thr16, 0, 0xFFFF) and _is_int(on_step, 0, 2**31 - 1) and _is_int(off_step, 0, 2**31 - 1) and on_step < off_step):
            raise SpecError(BAD_FIELD, "thr16 must fit 16 bits and the window must be non-empty")
        if self._is_input[idx].any():
            raise SpecError(NEURON_DRIVEN_TWICE)
        if self._silenced[idx].any():
            raise SpecError(NEURON_SILENCED_AND_DRIVEN)
        self._is_input[idx] = True
        self._drives.append((idx, int(thr16), int(on_step), int(off_step)))
        return self

    def silence(self, indices) -> "Sim":
        self._configuring()
        idx = np.unique(np.asarray(indices, dtype=np.int64))
        if self._is_input[idx].any():
            raise SpecError(NEURON_SILENCED_AND_DRIVEN)
        self._silenced[idx] = True
        self._silenced_idx = np.flatnonzero(self._silenced)
        self.v[idx] = self.g[idx] = 0.0
        self.refr[idx] = self.acc[idx] = 0
        return self

    # ---- the normative step

    def step(self, n: int = 1, dense: bool = False) -> tuple[np.ndarray, np.ndarray]:
        """Advance ``n`` steps. Returns (step, neuron index) of every spike, in that order."""
        steps, neurons = [], []
        for _ in range(n):
            spiked = self._step_once(dense)
            steps.append(np.full(len(spiked), self.t - 1, dtype=np.int64))
            neurons.append(spiked)
        return np.concatenate(steps) if steps else np.empty(0, np.int64), np.concatenate(neurons) if neurons else np.empty(0, np.int64)

    def _step_once(self, dense: bool) -> np.ndarray:
        model, graph, t = self.model, self.graph, self.t
        slot = t % model.delay_steps

        # 1. deliver what was emitted delay_steps ago: integer sums, so order cannot matter
        touched = [self._active]
        for source in self._in_flight[slot].tolist():
            sign = int(self._sign[source])
            if sign:
                row = graph.row(source)
                targets = graph.target[row].astype(np.int64)
                np.add.at(self.acc, targets, sign * graph.syn_count[row].astype(np.int32))
                touched.append(targets)

        # which neurons this step must visit; a neuron at exact rest with no input is a fixed point
        forced = self._forced(t)
        if dense:
            visit = np.flatnonzero(~self._silenced)
        else:
            for indices in (*touched, forced):
                self._mark[indices] = True
            self._mark[self._silenced_idx] = False
            visit = np.flatnonzero(self._mark)          # ascending, without a sort
            self._mark[visit] = False
        self.acc[self._silenced_idx] = 0

        # 2. arrivals are kept even while refractory
        self.g[visit] += model.w_syn * self.acc[visit]
        self.acc[visit] = 0

        refractory = self.refr[visit] > 0
        self.refr[visit[refractory]] -= 1          # frozen: v and g untouched, and the step ends here for them
        free = visit[~refractory]

        g_before = self.g[free]
        self.v[free] = self.v[free] * model.a + g_before * model.c
        self.g[free] = g_before * model.b

        self._forced_now[forced] = True
        spiking = self._forced_now[free] | (self.v[free] > model.v_th)   # strict
        self._forced_now[forced] = False
        spiked = free[spiking]
        self.v[spiked] = self.g[spiked] = 0.0
        self.refr[spiked] = np.where(self._is_input[spiked], 0, model.refrac_steps)

        quiet = free[~spiking]
        snap = quiet[(np.abs(self.v[quiet]) < model.snap_eps) & (np.abs(self.g[quiet]) < model.snap_eps)]
        self.v[snap] = self.g[snap] = 0.0

        # 3. emitted now, delivered delay_steps from now
        self._in_flight[slot] = spiked
        self._active = visit[(self.v[visit] != 0.0) | (self.g[visit] != 0.0) | (self.refr[visit] > 0)]
        self.t = t + 1
        return spiked

    def _forced(self, t: int) -> np.ndarray:
        """Input neurons whose lane says spike at step ``t``. Ascending."""
        hit = [idx[lane16(self.seed, self.graph.body_id[idx], t) < thr16]
               for idx, thr16, on_step, off_step in self._drives if on_step <= t < off_step and thr16 > 0]
        return np.sort(np.concatenate(hit)) if hit else np.empty(0, dtype=np.int64)

    @property
    def restless(self) -> int:
        """How many neurons are away from exact rest: what the next step will have to visit."""
        return len(self._active)

    def state_hash(self) -> str:
        """SHA-256 over t (u32), then per neuron ascending: v (f64), g (f64), refr (i32). Little-endian."""
        state = np.empty(self.graph.n, dtype=np.dtype([("v", "<f8"), ("g", "<f8"), ("refr", "<i4")]))
        state["v"], state["g"], state["refr"] = self.v, self.g, self.refr
        return hashlib.sha256(np.uint32(self.t).astype("<u4").tobytes() + state.tobytes()).hexdigest()


# --------------------------------------------------------------------------- trials


def canonical_json(value) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def normalise(value):
    """A number whose value is integral is an integer, however it was written: JSON.parse cannot tell 1.0 from 1."""
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, list):
        return [normalise(item) for item in value]
    if isinstance(value, dict):
        return {key: normalise(item) for key, item in value.items()}
    return value


def spec_sha256(spec: dict) -> str:
    return hashlib.sha256(canonical_json(normalise(spec))).hexdigest()


def spike_hash(steps: np.ndarray, body_ids: np.ndarray) -> str:
    """SHA-256 over (step u32, bodyId u64) pairs, little-endian, sorted by step and then by body ID."""
    order = np.lexsort((body_ids, steps))
    pairs = np.empty(len(order), dtype=np.dtype([("step", "<u4"), ("body", "<u8")]))
    pairs["step"], pairs["body"] = steps[order], body_ids[order]
    return hashlib.sha256(pairs.tobytes()).hexdigest()


def _is_int(value, low: int, high: int) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and low <= value <= high


def validate(spec: dict, model: Model, graph: Graph, groups: Groups, variants: set[str]) -> str | None:
    """The first problem with a trial spec, as a stable code, or None. Checks run in the order of TRIAL.md."""
    spec = normalise(spec)
    if not isinstance(spec, dict) or set(spec) != SPEC_KEYS:
        return BAD_FIELD
    text = all(isinstance(spec[k], str) for k in ("modelId", "variant", "graphSha256", "codecSha256"))
    lists = all(isinstance(spec[k], list) for k in ("drives", "silenced", "activated"))
    if not (text and lists and _is_int(spec["seed"], 0, 2**32 - 1) and _is_int(spec["durationSteps"], 1, 2**31 - 1)):
        return BAD_FIELD
    windows = []
    for drive in spec["drives"]:
        if not (isinstance(drive, dict) and set(drive) == DRIVE_KEYS and isinstance(drive["group"], str)
                and isinstance(drive["side"], str) and drive["side"] in SIDES):
            return BAD_FIELD
        windows.append(drive)
    for activation in spec["activated"]:
        if not (isinstance(activation, dict) and set(activation) == ACTIVATION_KEYS and isinstance(activation["typeOrGroup"], str)):
            return BAD_FIELD
        windows.append(activation)
    for window in windows:
        if not (_is_int(window["thr16"], 0, 0xFFFF) and _is_int(window["onStep"], 0, spec["durationSteps"])
                and _is_int(window["offStep"], 0, spec["durationSteps"]) and window["onStep"] < window["offStep"]):
            return BAD_FIELD
    if not all(isinstance(name, str) for name in spec["silenced"]):
        return BAD_FIELD

    if spec["modelId"] != model.id:
        return UNKNOWN_MODEL
    if spec["variant"] not in variants or spec["variant"] != model.variant:
        return UNKNOWN_VARIANT
    if spec["graphSha256"] != graph.sha256:
        return GRAPH_MISMATCH
    named = [d["group"] for d in spec["drives"]] + [a["typeOrGroup"] for a in spec["activated"]] + spec["silenced"]
    if any(name not in groups for name in named):
        return UNKNOWN_GROUP

    driven: set[int] = set()
    for indices in _driven_sets(spec, groups):
        if driven & set(indices.tolist()):
            return NEURON_DRIVEN_TWICE
        driven |= set(indices.tolist())
    if any(driven & set(groups[name].indices.tolist()) for name in spec["silenced"]):
        return NEURON_SILENCED_AND_DRIVEN
    return None


def _driven_sets(spec: dict, groups: Groups) -> list[np.ndarray]:
    return [groups[d["group"]].on(d["side"]) for d in spec["drives"]] + [groups[a["typeOrGroup"]].indices for a in spec["activated"]]


def prepare(graph: Graph, model: Model, spec: dict, groups: Groups, variants: set[str]) -> tuple[dict, Sim]:
    """A validated, normalised spec and a simulator configured for it. The one place a spec becomes a Sim."""
    check_groups(graph, groups)
    code = validate(spec, model, graph, groups, variants)
    if code:
        raise SpecError(code)
    spec = normalise(spec)
    sim = Sim(graph, model, spec["seed"])
    for window, indices in zip(spec["drives"] + spec["activated"], _driven_sets(spec, groups)):
        sim.drive(indices, window["thr16"], window["onStep"], window["offStep"])
    for name in spec["silenced"]:
        sim.silence(groups[name].indices)
    return spec, sim


def run_trial(graph: Graph, model: Model, spec: dict, groups: Groups, variants: set[str]) -> dict:
    """Run one trial to completion and return its recording (contracts/TRIAL.md)."""
    spec, sim = prepare(graph, model, spec, groups, variants)
    steps, neurons = sim.step(spec["durationSteps"])
    return recording(graph, spec, steps, neurons)


def recording(graph: Graph, spec: dict, steps: np.ndarray, neurons: np.ndarray) -> dict:
    sentinel = graph.sentinel[neurons]
    kept_steps, kept_bodies = steps[~sentinel], graph.body_id[neurons[~sentinel]]
    return {
        "spec": spec,
        "specSha256": spec_sha256(spec),
        "spikeStep": kept_steps.tolist(),
        "spikeBodyId": [str(b) for b in kept_bodies],
        "spikeHash": spike_hash(kept_steps, kept_bodies),
        "sentinelBreaches": sorted(set(steps[sentinel].tolist())),
        "engine": ENGINE,
    }
