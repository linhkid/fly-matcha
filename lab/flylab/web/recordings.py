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
from flylab.codec.build import CODEC_PATH, decode, load_codec, load_decoder, sip_spec
from flylab.graph.format import read_graph
from flylab.graph.graph import Graph
from flylab.model import oracle
from flylab.model.spec import load_model, variant_names

OUT_DIR = REPO_ROOT / "data" / "built" / "web" / "recordings"
GRAPH_PATH = REPO_ROOT / "data" / "built" / "full" / "malecns.fskg"
PILOT_STEPS = 3000      # 300 ms of his time: all that a stay of twenty seconds can show at the view's fifty-fold slowdown


def duration_steps(decoder: dict | None) -> int:
    """A pilot recording is as long as the page can show. With a licensed decoder it is the trial the decoder was licensed on, whose window it needs."""
    return decoder["durationSteps"] if decoder else PILOT_STEPS
SEED = 1
READOUT = "mn9"


def summarise(recording: dict, readout: set[str], taste: set[str], decoder: dict | None = None) -> dict:
    """What the index says about a recording, so the page can plan a bowl before it has fetched the spikes.

    With a licensed decoder it also holds the count in the decoder's window and the outcome that count decodes to.
    """
    bodies, steps = recording["spikeBodyId"], recording["spikeStep"]
    fired = [step for step, body in zip(steps, bodies) if body in readout]
    summary = {
        "spikes": len(steps), "neurons": len(set(bodies)), "neuronsBeyondTaste": len(set(bodies) - taste),
        "readoutSpikes": len(fired), "readoutFirstStep": fired[0] if fired else None, "readoutLastStep": fired[-1] if fired else None,
    }
    if decoder:
        count = sum(decoder["window"][0] <= step < decoder["window"][1] for step in fired)
        summary |= {"windowCount": count, "outcome": decode(count, decoder)}
    return summary


def _record(job: tuple) -> tuple[str, dict]:
    """One sip's trial, in a worker. The world is loaded once per worker."""
    from flylab.experiments import harness

    name, spec = job
    world = harness._world("full")
    return name, oracle.run_trial(world.graph, load_model(), spec, world.groups, variant_names())


def record_grid(graph: Graph, lock: dict, lock_sha: str, codec: dict, codec_sha: str, out_dir: Path = OUT_DIR, seed: int = SEED,
                decoder: dict | None = None, workers: int = 1, log=print) -> Path:
    from concurrent.futures import ProcessPoolExecutor

    steps = duration_steps(decoder)
    model = load_model()
    by_id = {group["id"]: set(group["bodyIds"]) for group in lock["groups"]}
    readout, taste = by_id[READOUT], by_id["grn.sweet"] | by_id["grn.bitter"]
    if decoder and decoder["group"] != READOUT:
        raise ValueError("the decoder was licensed on another readout than these recordings")
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("*.json"):
        stale.unlink()
    levels = range(len(next(c for c in codec["channels"] if c["id"] == "sweet")["levels"]))
    cells = [(sweet, bitter) for bitter in levels for sweet in levels]
    jobs = [(f"s{sweet}-b{bitter}-seed{seed}.json", sip_spec(model.id, graph.sha256, codec, codec_sha, sweet, bitter, seed, steps)) for sweet, bitter in cells]
    if workers > 1:
        with ProcessPoolExecutor(max_workers=workers) as pool:
            done = dict(pool.map(_record, jobs, chunksize=1))
    else:
        groups = connectivity.resolve(lock, graph)
        done = {name: oracle.run_trial(graph, model, spec, groups, variant_names()) for name, spec in jobs}
    entries = []
    for (sweet, bitter), (name, _) in zip(cells, jobs):
        recording = done[name]
        (out_dir / name).write_text(json.dumps(recording, separators=(",", ":")) + "\n", encoding="utf-8")
        entries.append({"file": name, "sweet": sweet, "bitter": bitter, "seed": seed, "specSha256": recording["specSha256"],
                        "spikeHash": recording["spikeHash"], **summarise(recording, readout, taste, decoder)})
        log(f"  sweet {sweet} bitter {bitter}: {entries[-1]['spikes']:>7,} spikes, {entries[-1]['neurons']:>5,} neurons, MN9 {entries[-1]['readoutSpikes']:>3}" + (f"  -> {entries[-1]['outcome']}" if decoder else ""))
    index = {
        "pilot": decoder is None,
        "note": ("Recordings from the whole-brain run, one seed. The outcome of each is decoded from MN9 by thresholds that experiment " + decoder["evidence"]["experiment"] + " fixed and licensed."
                 if decoder else "Pilot recordings from the whole-brain run: one seed, no control, base model. The taste law has not been tested yet. What was measured, not a verdict."),
        "modelId": model.id, "variant": "base", "graphSha256": graph.sha256, "codecSha256": codec_sha, "lockSha256": lock_sha,
        "durationSteps": steps, "dtMs": 0.1, "readout": {"group": READOUT, "bodyIds": sorted(readout, key=int)},
        "decoder": decoder,
        "recordings": entries,
    }
    path = out_dir / "index.json"
    path.write_text(json.dumps(index, indent=1) + "\n", encoding="utf-8")
    return path


def export_recordings(out_dir: Path = OUT_DIR, workers: int = 8, log=print) -> Path:
    lock_bytes = (CIRCUITS_DIR / "taste.lock.json").read_bytes()
    codec_sha = hashlib.sha256(CODEC_PATH.read_bytes()).hexdigest()
    return record_grid(read_graph(GRAPH_PATH), json.loads(lock_bytes), hashlib.sha256(lock_bytes).hexdigest(), load_codec(), codec_sha, out_dir,
                       decoder=load_decoder(), workers=workers, log=log)
