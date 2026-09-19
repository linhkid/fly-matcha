"""Export the brain cloud: one point per typed neuron that has a cell body position (slice V1).

The file holds facts only: body IDs, positions from the annotation table, and
which named group of the circuit lock a neuron belongs to. Taste neurons have no
cell body inside the imaged volume, so they are not in the cloud; they are listed
beside it and drawn on the fly's mouthparts.
"""

from __future__ import annotations

import json
import struct
from pathlib import Path

import numpy as np
import pandas as pd

from flylab import CIRCUITS_DIR, RAW_DIR, REPO_ROOT
from flylab.census import binding
from flylab.data.fetch import ANNOTATIONS, DATASET, TRANSMITTERS

WEB_DIR = REPO_ROOT / "data" / "built" / "web"
MAGIC, VERSION = b"FSKCLOUD", 1
# A neuron in several groups is coloured by the first that holds it.
CLOUD_GROUPS = ("mn9", "relay.shiu2022", "mn.proboscis.other", "dn.adn", "dn.dng12", "mb.mbon", "mb.pam", "mb.ppl1", "mb.kc")
MOUTHPART_GROUPS = ("grn.sweet", "grn.bitter")


def _padded(data: bytes) -> bytes:
    return data + b"\0" * (-len(data) % 8)


def build_cloud(frame: pd.DataFrame, lock: dict) -> tuple[bytes, dict]:
    """``frame`` is the census universe (``binding.prepare``). Returns the file's bytes and its JSON companion."""
    placed = frame[frame["somaLocation"].notna()].sort_values("bodyId")
    body_ids = placed["bodyId"].to_numpy(dtype=np.uint64)
    voxels = np.stack(placed["somaLocation"].to_numpy()).astype(np.float64)
    low, high = voxels.min(axis=0), voxels.max(axis=0)
    xyz = ((voxels - (low + high) / 2) / (high - low).max()).astype("<f4")     # centred, one uniform scale, nothing else

    members = {g["id"]: np.array([int(b) for b in g["bodyIds"]], dtype=np.uint64) for g in lock["groups"]}
    group = np.zeros(len(body_ids), dtype=np.uint8)
    for code in range(len(CLOUD_GROUPS), 0, -1):                              # earlier groups overwrite later ones
        group[np.isin(body_ids, members[CLOUD_GROUPS[code - 1]])] = code

    sides = frame.set_index("bodyId")["side"]
    nts = frame.set_index("bodyId")["nt"]
    mouthparts = [{"bodyId": str(b), "group": name, "side": str(sides[int(b)]), "speaks": str(nts[int(b)]) != "unknown"}
                  for name in MOUTHPART_GROUPS for b in sorted(members[name].tolist())]

    data = MAGIC + struct.pack("<II", VERSION, len(body_ids)) + _padded(body_ids.astype("<u8").tobytes()) \
        + _padded(xyz.tobytes()) + _padded(group.tobytes())
    names = ["none", *CLOUD_GROUPS]
    companion = {
        "version": VERSION, "dataset": DATASET, "annotationsSha256": lock["annotationsSha256"],
        "typedNeurons": int(len(frame)), "points": int(len(body_ids)),
        "groups": [{"code": i, "id": name, "points": int((group == i).sum())} for i, name in enumerate(names)],
        "voxelBounds": {"low": low.tolist(), "high": high.tolist()},
        "mouthparts": mouthparts,
        "note": "Positions are cell body locations from the annotation table. Neurons without one, which includes every taste neuron, are not in the cloud.",
    }
    return data, companion


def export_cloud(raw_dir: Path = RAW_DIR, circuits_dir: Path = CIRCUITS_DIR, out_dir: Path = WEB_DIR) -> tuple[Path, Path]:
    lock = json.loads((circuits_dir / "taste.lock.json").read_text(encoding="utf-8"))
    frame = binding.prepare(pd.read_feather(raw_dir / ANNOTATIONS), pd.read_feather(raw_dir / TRANSMITTERS))
    data, companion = build_cloud(frame, lock)
    out_dir.mkdir(parents=True, exist_ok=True)
    cloud_path, json_path = out_dir / "brain.cloud", out_dir / "brain.cloud.json"
    cloud_path.write_bytes(data)
    json_path.write_text(json.dumps(companion, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return cloud_path, json_path
