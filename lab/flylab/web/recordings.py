"""Whole-brain recordings of every sip on the grid, for the living view to replay (slice V2).

Each file is a ``TrialRecording`` exactly as ``contracts/TRIAL.md`` defines it, written by ``run_trial``: nothing new
is invented here. These are PILOT recordings. One seed, no control, base model: what was measured, not a verdict.
Whether he "drinks" is slice 05's to license, and nothing about the model may be adjusted because of how these look.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

from flylab import CIRCUITS_DIR, REPO_ROOT
from flylab.census import connectivity
from flylab.codec.build import CODEC_PATH, load_codec, sip_spec
from flylab.graph.format import read_graph
from flylab.graph.graph import Graph
from flylab.model import oracle
from flylab.model.spec import load_model, variant_names

OUT_DIR = REPO_ROOT / "data" / "built" / "web" / "recordings"
GRAPH_PATH = REPO_ROOT / "data" / "built" / "full" / "malecns.fskg"
DURATION_STEPS = 3000   # 300 ms of his time: at the view's fifty-fold slowdown, fifteen seconds on the wall
SEED = 1
READOUT = "mn9"


def summarise(recording: dict, readout: set[str], taste: set[str]) -> dict:
    """What the index says about a recording, so the page can plan a bowl before it has fetched the spikes."""
    bodies, steps = recording["spikeBodyId"], recording["spikeStep"]
    fired = [step for step, body in zip(steps, bodies) if body in readout]
    return {
        "spikes": len(steps), "neurons": len(set(bodies)), "neuronsBeyondTaste": len(set(bodies) - taste),
        "readoutSpikes": len(fired), "readoutFirstStep": fired[0] if fired else None, "readoutLastStep": fired[-1] if fired else None,
    }


def record_grid(graph: Graph, lock: dict, lock_sha: str, codec: dict, codec_sha: str, out_dir: Path = OUT_DIR, seed: int = SEED, steps: int = DURATION_STEPS, log=print) -> Path:
    model, variants = load_model(), variant_names()
    groups = connectivity.resolve(lock, graph)
    by_id = {group["id"]: set(group["bodyIds"]) for group in lock["groups"]}
    readout, taste = by_id[READOUT], by_id["grn.sweet"] | by_id["grn.bitter"]
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("*.json"):
        stale.unlink()
    levels = range(len(next(c for c in codec["channels"] if c["id"] == "sweet")["levels"]))
    entries = []
    for bitter in levels:
        for sweet in levels:
            spec = sip_spec(model.id, graph.sha256, codec, codec_sha, sweet, bitter, seed, steps)
            recording = oracle.run_trial(graph, model, spec, groups, variants)
            name = f"s{sweet}-b{bitter}-seed{seed}.json"
            (out_dir / name).write_text(json.dumps(recording, separators=(",", ":")) + "\n", encoding="utf-8")
            entries.append({"file": name, "sweet": sweet, "bitter": bitter, "seed": seed, "specSha256": recording["specSha256"],
                            "spikeHash": recording["spikeHash"], **summarise(recording, readout, taste)})
            log(f"  sweet {sweet} bitter {bitter}: {entries[-1]['spikes']:>6,} spikes, {entries[-1]['neurons']:>5,} neurons, MN9 {entries[-1]['readoutSpikes']}")
    index = {
        "pilot": True,
        "note": "Pilot recordings from the whole-brain run: one seed, no control, base model. The taste law has not been tested yet. What was measured, not a verdict.",
        "modelId": model.id, "variant": "base", "graphSha256": graph.sha256, "codecSha256": codec_sha, "lockSha256": lock_sha,
        "durationSteps": steps, "dtMs": 0.1, "readout": {"group": READOUT, "bodyIds": sorted(readout, key=int)},
        "recordings": entries,
    }
    path = out_dir / "index.json"
    path.write_text(json.dumps(index, indent=1) + "\n", encoding="utf-8")
    return path


def export_recordings(out_dir: Path = OUT_DIR, log=print) -> Path:
    lock_bytes = (CIRCUITS_DIR / "taste.lock.json").read_bytes()
    codec_sha = hashlib.sha256(CODEC_PATH.read_bytes()).hexdigest()
    return record_grid(read_graph(GRAPH_PATH), json.loads(lock_bytes), hashlib.sha256(lock_bytes).hexdigest(), load_codec(), codec_sha, out_dir, log=log)
