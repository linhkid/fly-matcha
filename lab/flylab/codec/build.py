"""The one writer of ``contracts/codec/taste.codec.json``, and the Python reading of it.

Slices add to the codec through here: V1 the levels and the tea menu, slice 05
the decoder thresholds, slice 07 the envelope. Both interpreters, this one and
``web/src/codec``, are lookups held to ``contracts/fixtures/codec``.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from flylab import CONTRACTS_DIR

CODEC_PATH = CONTRACTS_DIR / "codec" / "taste.codec.json"
LEVEL_HZ = (0, 25, 50, 100, 200)            # the same five levels everywhere (CONTRACTS.md, "Codec")
MAX_SCOOPS = 3
TIERS = {"smooth": (1, 2, 3), "balanced": (2, 3, 4), "robust": (3, 4, 4)}   # bitter level for 1, 2, 3 scoops

# The user's list of 2026-09-19 (specs/matcha-fly/assets/content/tea-menu.md). Tiers are this project's guess.
TEAS = (
    ("kannoshiro", "Ippodo Tea", "Kannoshiro", "smooth", "Vibrant, smooth, high-grade ceremonial."),
    ("hoshiju", "Hoshino Seichaen", "Hoshiju", "smooth", "From Yame; intense nuttiness and savoury depth."),
    ("isuzu", "Marukyu Koyamaen", "Isuzu", "balanced", "Popular and high quality; for drinking and for cooking."),
    ("aoarashi", "Marukyu Koyamaen", "Aoarashi", "balanced", "A favourite among travellers."),
    ("ogurayama", "Yamamasa Koyamaen", "Ogurayama", "balanced", "Well-balanced everyday blend; subtle umami, dark chocolate or nutty notes."),
    ("nakamura-tokichi", "Nakamura Tokichi", "house matcha", "balanced", "A long-established Kyoto producer; rich aroma, stone-ground."),
    ("taiwan-culinary", "A culinary grade from Taiwan", "unnamed", "robust", "Harvested later in the year; more robust and slightly bitter; for lattes and baking."),
)


def thr16(rate_hz: float, dt_ms: float) -> int:
    """The integer an engine compares a lane with. No float takes part after this."""
    return math.floor(rate_hz * dt_ms * 65.536)


def build_codec(dt_ms: float = 0.1) -> dict:
    def levels(unit: str) -> list[dict]:
        return [{"label": "none" if i == 0 else f"{i} {unit}{'' if i == 1 else 's'}", "hz": hz, "thr16": thr16(hz, dt_ms)}
                for i, hz in enumerate(LEVEL_HZ)]

    return {
        "id": "taste/1",
        "channels": [
            {"id": "sweet", "group": "grn.sweet", "tag": "model", "levels": levels("piece")},
            {"id": "bitter", "group": "grn.bitter", "tag": "model", "levels": levels("level")},
        ],
        "menu": {
            "tag": "staged",
            "note": "Which tier a tea belongs to was guessed from tasting notes. A fly tastes only the bitterness: two teas of one tier are the same tea to him.",
            "maxScoops": MAX_SCOOPS,
            "tiers": {name: list(by_scoops) for name, by_scoops in TIERS.items()},
            "teas": [{"id": i, "maker": maker, "blend": blend, "tier": tier, "notes": notes} for i, maker, blend, tier, notes in TEAS],
        },
        "decoders": [{"id": "proboscis", "group": "mn9", "stat": "spikes_sum", "window": [2000, 10000],
                      "extendAtLeast": None, "refuseAtMost": None, "evidence": None, "tag": "model"}],
        "envelope": {"sides": ["both", "left", "right"], "opsOnOneSidedSips": False, "lesionable": [], "activatable": [],
                     "maxConcurrentOps": 1, "seeds": [], "variants": ["base"]},
    }


def dump(value: dict) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def write_codec(path: Path = CODEC_PATH) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dump(build_codec()), encoding="utf-8")
    return path


def load_codec(path: Path = CODEC_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


# --------------------------------------------------------------------------- reading it


class CodecError(ValueError):
    """A sip the codec cannot express."""


def bitter_level(codec: dict, tea_id: str, scoops: int) -> int:
    menu = codec["menu"]
    tea = next((t for t in menu["teas"] if t["id"] == tea_id), None)
    if tea is None or not (isinstance(scoops, int) and 0 <= scoops <= menu["maxScoops"]):
        raise CodecError(f"no such sip: {tea_id}, {scoops} scoops")
    return 0 if scoops == 0 else menu["tiers"][tea["tier"]][scoops - 1]


def sip_levels(codec: dict, tea_id: str, scoops: int, sweets: int) -> dict:
    """The two levels a sip resolves to, with the thresholds an engine needs."""
    sweet_levels = next(c for c in codec["channels"] if c["id"] == "sweet")["levels"]
    bitter_levels = next(c for c in codec["channels"] if c["id"] == "bitter")["levels"]
    if not (isinstance(sweets, int) and 0 <= sweets < len(sweet_levels)):
        raise CodecError(f"no such sweet level: {sweets}")
    bitter = bitter_level(codec, tea_id, scoops)
    return {"sweet": sweets, "bitter": bitter, "sweetThr16": sweet_levels[sweets]["thr16"], "bitterThr16": bitter_levels[bitter]["thr16"]}


def codec_fixture(codec: dict) -> dict:
    """Every answer the two interpreters must agree on."""
    teas = [t["id"] for t in codec["menu"]["teas"]]
    return {"fixture": "taste-codec-lookups",
            "about": "Every tea and scoop count with the bitter level it resolves to, and every sweet level, with thresholds.",
            "sips": [{"tea": tea, "scoops": scoops, "sweets": sweets, **sip_levels(codec, tea, scoops, sweets)}
                     for tea in teas for scoops in range(codec["menu"]["maxScoops"] + 1) for sweets in range(len(LEVEL_HZ))],
            "refused": [{"tea": "no-such-tea", "scoops": 1, "sweets": 0}, {"tea": teas[0], "scoops": 4, "sweets": 0},
                        {"tea": teas[0], "scoops": 1, "sweets": 5}, {"tea": teas[0], "scoops": -1, "sweets": 0}]}


def write_fixture(directory: Path = CONTRACTS_DIR / "fixtures" / "codec") -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "taste-codec-lookups.json"
    path.write_text(json.dumps(codec_fixture(load_codec()), indent=1, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
    return path
