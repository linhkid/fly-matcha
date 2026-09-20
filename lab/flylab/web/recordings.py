"""Whole-brain recordings of every sip on the grid, and of his legs moving, for the living view to replay (slices V2, V3).

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
from flylab.codec.build import CODEC_PATH, LEGS_CODEC_PATH, decode, load_codec, load_decoder, movement_spec, sip_spec
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


def summarise_movement(recording: dict, readout: set[str], driven: set[str], other_motor: set[str]) -> dict:
    """What the index says about a movement's recording: how much fired, how much of it was leg motor neurons, and how much other motor neurons."""
    bodies = recording["spikeBodyId"]
    fired = [body for body in bodies if body in readout]
    others = [body for body in bodies if body in other_motor]
    return {"spikes": len(bodies), "neurons": len(set(bodies)), "neuronsBeyondSensors": len(set(bodies) - driven),
            "readoutSpikes": len(fired), "readoutNeurons": len(set(fired)), "otherMotorSpikes": len(others), "otherMotorNeurons": len(set(others))}


def motor_neurons(annotations) -> set[str]:
    """Every typed neuron the dataset calls a motor neuron, of the cord or of the brain: legs, wings, halteres, neck, abdomen, mouthparts."""
    rows = annotations[annotations["type"].notna() & annotations["superclass"].astype(str).isin(["vnc_motor", "cb_motor"])]
    return {str(int(body)) for body in rows["bodyId"]}


def record_movements(graph: Graph, circuit: dict, lock: dict, lock_sha: str, codec: dict, codec_sha: str, all_motor: set[str], out_dir: Path = OUT_DIR, seed: int = SEED, log=print) -> dict:
    """His whole nervous system while the knee sensors of his moving legs are driven (slice V3). PILOT recordings, as the sips are.

    The readout is every leg motor neuron of the legs census, pool by pool: nothing drives them, so a spike of one is his wiring's answer.
    The motor neurons that are not of his legs are listed too, because they also fire, and a page that counted only his legs' would make the answer look tidier than it is.
    """
    model = load_model()
    groups = connectivity.resolve(lock, graph)
    by_id = {group["id"]: group["bodyIds"] for group in lock["groups"]}
    roles = {role["id"]: role for role in circuit["roles"]}
    pools = [{"id": name, "leg": name.split(".")[1], "label": (roles[name]["select"].get("type") or ["no muscle named"])[0].removesuffix(" MN"), "bodyIds": sorted(bodies, key=int)}
             for name, bodies in by_id.items() if name.startswith("mn.")]
    readout = {body for pool in pools for body in pool["bodyIds"]}
    other_motor = {body for body in all_motor - readout if int(body) in set(int(b) for b in graph.body_id)}
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("move-*.json"):
        stale.unlink()
    entries = []
    for movement in codec["movements"]:
        spec = movement_spec(model.id, graph.sha256, codec, codec_sha, movement["id"], seed, PILOT_STEPS)
        recording = oracle.run_trial(graph, model, spec, groups, variant_names())
        name = f"move-{movement['id']}-seed{seed}.json"
        (out_dir / name).write_text(json.dumps(recording, separators=(",", ":")) + "\n", encoding="utf-8")
        sensors = {sensor["id"]: sorted((body for pair in movement["pairs"] for body in by_id[sensor["groups"][pair]]), key=int) for sensor in codec["sensors"]}
        driven = {body for bodies in sensors.values() for body in bodies}
        entries.append({"id": movement["id"], "file": name, "pairs": movement["pairs"], "seed": seed, "specSha256": recording["specSha256"], "spikeHash": recording["spikeHash"],
                        "sensors": sensors, **summarise_movement(recording, readout, driven, other_motor)})
        log(f"  {movement['id']:<6} {len(driven):>4} sensors driven: {entries[-1]['spikes']:>7,} spikes, {entries[-1]['neuronsBeyondSensors']:>5,} neurons beyond them, "
            f"{entries[-1]['readoutNeurons']:>3} leg motor neurons fired {entries[-1]['readoutSpikes']} times, {entries[-1]['otherMotorNeurons']} other motor neurons {entries[-1]['otherMotorSpikes']} times")
    return {"pilot": True,
            "note": "Pilot recordings from the whole-brain run: one seed, no control, base model. What his wiring does when the knee sensors of his moving legs are driven. What was measured, not a claim about walking.",
            "codecSha256": codec_sha, "lockSha256": lock_sha, "durationSteps": PILOT_STEPS, "pools": pools, "otherMotorBodyIds": sorted(other_motor, key=int), "recordings": entries}


def record_grid(graph: Graph, lock: dict, lock_sha: str, codec: dict, codec_sha: str, out_dir: Path = OUT_DIR, seed: int = SEED,
                decoder: dict | None = None, workers: int = 1, log=print, movements: dict | None = None) -> Path:
    from concurrent.futures import ProcessPoolExecutor

    steps = duration_steps(decoder)
    model = load_model()
    by_id = {group["id"]: set(group["bodyIds"]) for group in lock["groups"]}
    readout, taste = by_id[READOUT], by_id["grn.sweet"] | by_id["grn.bitter"]
    if decoder and decoder["group"] != READOUT:
        raise ValueError("the decoder was licensed on another readout than these recordings")
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("*.json"):
        if not stale.name.startswith("move-"):   # those are record_movements' to clear
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
        "movements": movements,
    }
    path = out_dir / "index.json"
    path.write_text(json.dumps(index, indent=1) + "\n", encoding="utf-8")
    return path


def export_recordings(out_dir: Path = OUT_DIR, workers: int = 8, log=print) -> Path:
    graph = read_graph(GRAPH_PATH)
    import pandas as pd

    from flylab import RAW_DIR
    from flylab.data.fetch import ANNOTATIONS

    legs_lock = (CIRCUITS_DIR / "legs.lock.json").read_bytes()
    all_motor = motor_neurons(pd.read_feather(RAW_DIR / ANNOTATIONS, columns=["bodyId", "type", "superclass"]))
    movements = record_movements(graph, json.loads((CIRCUITS_DIR / "legs.circuit.json").read_text(encoding="utf-8")), json.loads(legs_lock), hashlib.sha256(legs_lock).hexdigest(),
                                 load_codec(LEGS_CODEC_PATH), hashlib.sha256(LEGS_CODEC_PATH.read_bytes()).hexdigest(), all_motor, out_dir, log=log)
    lock_bytes = (CIRCUITS_DIR / "taste.lock.json").read_bytes()
    codec_sha = hashlib.sha256(CODEC_PATH.read_bytes()).hexdigest()
    return record_grid(graph, json.loads(lock_bytes), hashlib.sha256(lock_bytes).hexdigest(), load_codec(), codec_sha, out_dir,
                       decoder=load_decoder(), workers=workers, log=log, movements=movements)
