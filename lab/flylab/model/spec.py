"""Load the model definition and its variants from ``contracts/model``."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from flylab import CONTRACTS_DIR
from flylab.graph import NT_NAMES

PRNG_ID = "threefry2x32-20/lane16"
MODEL_KEYS = {"id", "dtMs", "delaySteps", "refracSteps", "vThMv", "A", "B", "C", "wSynMv", "snapEpsMv", "signPolicy", "prng"}


class ModelError(ValueError):
    """The model definition or a variant is malformed."""


@dataclass(frozen=True)
class Model:
    id: str
    variant: str
    delay_steps: int
    refrac_steps: int
    v_th: float
    a: float
    b: float
    c: float
    w_syn: float
    snap_eps: float
    sign_by_code: tuple[int, ...]  # by transmitter code, see flylab.graph.NT_NAMES
    definition: dict               # the JSON it came from, variant applied: what a fixture embeds


def _whole(value, low: int) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= low


def model_from_definition(definition: dict, variant: str = "base") -> Model:
    if set(definition) != MODEL_KEYS:
        raise ModelError(f"model keys differ from the contract: {sorted(set(definition) ^ MODEL_KEYS)}")
    if definition["prng"] != PRNG_ID:
        raise ModelError(f"this oracle implements {PRNG_ID}, not {definition['prng']}")
    if definition["dtMs"] != 0.1:
        raise ModelError("the step is 0.1 ms: the frozen constants and the step counts were derived for it")
    if set(definition["signPolicy"]) != set(NT_NAMES) or set(definition["signPolicy"].values()) - {-1, 0, 1}:
        raise ModelError("signPolicy must give -1, 0 or +1 to exactly the transmitters of the graph format")
    if not (_whole(definition["delaySteps"], 1) and _whole(definition["refracSteps"], 0)):
        raise ModelError("delaySteps must be a whole number of at least 1 and refracSteps one of at least 0")
    if not (float(definition["vThMv"]) >= 0 and float(definition["snapEpsMv"]) >= 0):
        raise ModelError("vThMv and snapEpsMv cannot be negative: a neuron at rest must stay at rest")
    return Model(
        id=definition["id"], variant=variant,
        delay_steps=int(definition["delaySteps"]), refrac_steps=int(definition["refracSteps"]),
        v_th=float(definition["vThMv"]),
        a=float(definition["A"]), b=float(definition["B"]), c=float(definition["C"]),  # frozen strings: never exp()
        w_syn=float(definition["wSynMv"]), snap_eps=float(definition["snapEpsMv"]),
        sign_by_code=tuple(int(definition["signPolicy"][name]) for name in NT_NAMES),
        definition=definition,
    )


def apply_overrides(definition: dict, overrides: dict) -> dict:
    """A copy of ``definition`` with dotted-key overrides applied. An unknown key is an error."""
    result = json.loads(json.dumps(definition))
    for dotted, value in overrides.items():
        *path, leaf = dotted.split(".")
        node = result
        for key in path:
            if not isinstance(node.get(key), dict):
                raise ModelError(f"override {dotted}: no such section")
            node = node[key]
        if leaf not in node:
            raise ModelError(f"override {dotted}: no such parameter")
        node[leaf] = value
    return result


def variant_names(contracts_dir: Path = CONTRACTS_DIR) -> set[str]:
    return set(json.loads((contracts_dir / "model" / "variants.json").read_text(encoding="utf-8")))


def load_model(variant: str = "base", model_id: str = "lif-shiu-v1", contracts_dir: Path = CONTRACTS_DIR) -> Model:
    definition = json.loads((contracts_dir / "model" / f"{model_id}.json").read_text(encoding="utf-8"))
    variants = json.loads((contracts_dir / "model" / "variants.json").read_text(encoding="utf-8"))
    if variant not in variants:
        raise ModelError(f"unknown variant {variant}")
    return model_from_definition(apply_overrides(definition, variants[variant]), variant)
