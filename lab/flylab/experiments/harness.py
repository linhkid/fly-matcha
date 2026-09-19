"""The runner (CONTRACTS.md, "Experiments"). It refuses to be gamed.

- The pre-registration must be committed, and unchanged since, before a confirmation seed runs.
- `consumed.json` is written beside it first: the prereg's hash and the seeds about to be consumed. A different hash later is refused.
  A verdict with no ledger is refused: deleting the ledger does not reset an experiment.
- Pilot seeds run freely and never count. Held-out seeds are touched only by the decoder check and the rival rule.
- A criterion that passes at a single value of the swept parameter is rejected: no plateau.
- No timestamps anywhere: running a finished experiment again gives the same `verdict.json`, byte for byte.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import subprocess
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

from flylab import REPO_ROOT
from flylab.experiments import controls, criteria, worlds
from flylab.model import oracle
from flylab.model.spec import CONTRACTS_DIR, apply_overrides, model_from_definition, variant_names

EXPERIMENTS_DIR = REPO_ROOT / "lab" / "experiments"
PREREG_KEYS = {"id", "question", "world", "modelId", "attempts", "sweep", "shipped", "conditions", "controls", "seeds", "durationSteps",
               "measures", "decoder", "criteria", "plateau", "gates", "notes"}
EVERYWHERE, SHIPPED = "everySweepPoint", "shipped"


class HarnessError(ValueError):
    """The experiment may not run, or its pre-registration is malformed. The message says why."""


# --------------------------------------------------------------------------- the pre-registration

def load_prereg(path: Path) -> dict:
    prereg = json.loads(path.read_text(encoding="utf-8"))
    extra, missing = sorted(set(prereg) - PREREG_KEYS), sorted({"id", "question", "world", "modelId", "sweep", "shipped", "conditions", "seeds", "durationSteps", "measures", "criteria", "plateau"} - set(prereg))
    if extra or missing:
        raise HarnessError(f"prereg: unknown keys {extra}, missing keys {missing}")
    if prereg["id"] != path.parent.name:
        raise HarnessError(f"prereg id {prereg['id']} does not match its folder {path.parent.name}")
    params = [s["param"] for s in prereg["sweep"]]
    if set(prereg["shipped"]) != set(params) or any(prereg["shipped"][s["param"]] not in s["values"] for s in prereg["sweep"]):
        raise HarnessError("prereg: `shipped` must give one swept value for every swept parameter")
    if prereg["plateau"]["param"] not in params:
        raise HarnessError("prereg: the plateau runs along a parameter that is not swept")
    seeds = prereg["seeds"]
    every = seeds["pilot"] + seeds["confirm"] + seeds.get("holdout", [])
    if len(set(every)) != len(every):
        raise HarnessError("prereg: a seed appears twice; pilot, confirmation and held-out seeds must be disjoint")
    known = {c["id"] for c in prereg["conditions"]}
    ids = set()
    for criterion in prereg["criteria"]:
        if criterion["kind"] not in criteria.KINDS:
            raise HarnessError(f"criterion {criterion.get('id')}: kind {criterion['kind']} is not in the fixed list {criteria.KINDS}")
        if criterion["id"] in ids:
            raise HarnessError(f"criterion {criterion['id']} appears twice")
        ids.add(criterion["id"])
        if criterion.get("at", EVERYWHERE) not in (EVERYWHERE, SHIPPED):
            raise HarnessError(f"criterion {criterion['id']}: `at` must be {EVERYWHERE} or {SHIPPED}")
        if criterion["kind"] in ("fraction_active", "decoder_accuracy") and criterion.get("at") != SHIPPED:
            raise HarnessError(f"criterion {criterion['id']}: a {criterion['kind']} criterion is evaluated at the shipped model only")
        for condition in _conditions_of(criterion, known):
            if condition not in known:
                raise HarnessError(f"criterion {criterion['id']} names condition {condition}, which the prereg does not define")
    return prereg


def _conditions_of(criterion: dict, every: set[str]) -> list[str]:
    if criterion["kind"] == "fraction_active":
        return sorted(every)
    named = [criterion.get("condition"), criterion.get("conditionA"), criterion.get("conditionB"), *criterion.get("conditions", []),
             *(check["condition"] for check in criterion.get("checks", []))]
    return [c for c in named if c]


def prereg_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def is_committed(path: Path) -> bool:
    """Tracked by git, and the same as in HEAD."""
    def git(*args: str) -> int:
        return subprocess.run(["git", *args], cwd=path.parent, capture_output=True).returncode
    return git("ls-files", "--error-unmatch", path.name) == 0 and git("diff", "--quiet", "HEAD", "--", path.name) == 0


def git_rev(path: Path) -> str:
    done = subprocess.run(["git", "log", "-1", "--format=%H", "--", path.name], cwd=path.parent, capture_output=True, text=True)
    return done.stdout.strip()


# --------------------------------------------------------------------------- one trial, in a worker

_WORLD: worlds.World | None = None
_SHUFFLED: tuple[int, object] | None = None


def _world(name: str) -> worlds.World:
    global _WORLD
    if _WORLD is None or _WORLD.name != name:
        _WORLD = worlds.load(name)
    return _WORLD


def run_job(job: dict) -> dict:
    """One trial, from a description that holds everything that decides its outcome. Deterministic."""
    global _SHUFFLED
    world = _world(job["world"])
    graph = world.graph
    if job["shuffleSeed"] is not None:
        if _SHUFFLED is None or _SHUFFLED[0] != job["shuffleSeed"]:
            _SHUFFLED = (job["shuffleSeed"], controls.shuffle(world.graph, job["shuffleSeed"]))
        graph = _SHUFFLED[1]
    groups = dict(world.groups)
    if job["population"] is not None:
        like = world.groups[job["population"]["like"]]
        drawn = controls.random_population(world.pools[job["population"]["like"]], len(like.indices), like.indices, job["population"]["seed"])
        groups["control.population"] = oracle.members(drawn)
    definition = json.loads((CONTRACTS_DIR / "model" / f"{job['modelId']}.json").read_text(encoding="utf-8"))
    model = model_from_definition(apply_overrides(definition, job["overrides"]), "base")
    spec = {"modelId": model.id, "variant": "base", "graphSha256": graph.sha256, "codecSha256": world.codec_sha256 or "", "seed": job["seed"],
            "durationSteps": job["durationSteps"], "drives": job["drives"], "activated": [], "silenced": []}
    _, sim = oracle.prepare(graph, model, spec, groups, variant_names())
    steps, neurons = sim.step(job["durationSteps"])
    values = {}
    for measure in job["measures"]:
        inside = (steps >= measure["window"][0]) & (steps < measure["window"][1]) & np.isin(neurons, groups[measure["group"]].indices)
        values[measure["id"]] = int(inside.sum())
    return {"values": values, "fractionActive": float(len(np.unique(neurons)) / graph.n), "spikes": int(len(steps))}


def _key(job: dict, world_stamp: str) -> str:
    return hashlib.sha256((world_stamp + json.dumps(job, sort_keys=True)).encode()).hexdigest()


class Trials:
    """Runs jobs, in parallel, and keeps each result under `runs/`, so a long experiment survives being stopped and a rerun costs nothing."""

    def __init__(self, folder: Path, world_stamp: str, workers: int, log=print) -> None:
        self.folder, self.stamp, self.workers, self.log = folder / "runs", world_stamp, workers, log
        self.folder.mkdir(parents=True, exist_ok=True)

    def run(self, jobs: list[dict]) -> list[dict]:
        keys = [_key(job, self.stamp) for job in jobs]
        results: dict[str, dict] = {}
        todo = []
        for key, job in zip(keys, jobs):
            cached = self.folder / f"{key}.json"
            if cached.exists():
                results[key] = json.loads(cached.read_text())
            elif key not in {k for k, _ in todo}:
                todo.append((key, job))
        if todo:
            self.log(f"  {len(todo)} trials to run, {len(jobs) - len(todo)} already done")
            if self.workers <= 1:
                outcomes = map(run_job, (job for _, job in todo))
                for n, ((key, _), outcome) in enumerate(zip(todo, outcomes), 1):
                    self._keep(key, outcome, results, n, len(todo))
            else:
                with ProcessPoolExecutor(max_workers=self.workers) as pool:
                    for n, ((key, _), outcome) in enumerate(zip(todo, pool.map(run_job, (job for _, job in todo), chunksize=1)), 1):
                        self._keep(key, outcome, results, n, len(todo))
        return [results[key] for key in keys]

    def _keep(self, key: str, outcome: dict, results: dict, n: int, total: int) -> None:
        (self.folder / f"{key}.json").write_text(json.dumps(outcome, sort_keys=True))
        results[key] = outcome
        if n % 25 == 0 or n == total:
            self.log(f"    {n} of {total}")


# --------------------------------------------------------------------------- the experiment

def _drives(world: worlds.World, condition: dict, steps: int) -> list[dict]:
    drives = []
    for drive in condition["drives"]:
        if "channel" in drive:                                   # through the codec: a level of zero drives nothing
            channel = next(c for c in world.codec["channels"] if c["id"] == drive["channel"])
            if drive["level"]:
                drives.append({"group": channel["group"], "side": drive.get("side", "both"), "thr16": channel["levels"][drive["level"]]["thr16"], "onStep": 0, "offStep": steps})
        else:
            drives.append({"group": drive["group"], "side": drive.get("side", "both"), "thr16": drive["thr16"], "onStep": 0, "offStep": steps})
    return drives


def _points(prereg: dict) -> list[dict]:
    names = [s["param"] for s in prereg["sweep"]]
    return [dict(zip(names, combo)) for combo in itertools.product(*(s["values"] for s in prereg["sweep"]))]


class Experiment:
    def __init__(self, path: Path, workers: int = 1, log=print) -> None:
        self.path, self.folder, self.log = path, path.parent, log
        self.prereg = load_prereg(path)
        self.world = worlds.load(self.prereg["world"])
        stamp = f"{self.world.graph.sha256}|{self.world.lock_sha256}|{self.world.codec_sha256}|"
        self.trials = Trials(self.folder, stamp, workers, log)
        self.conditions = {c["id"]: c for c in self.prereg["conditions"]}
        self.controls = {c["id"]: c for c in self.prereg.get("controls", [])}

    def _job(self, point: dict, condition: str, seed: int, shuffle_seed=None, population=None) -> dict:
        p = self.prereg
        drives = _drives(self.world, self.conditions[condition], p["durationSteps"])
        if population is not None:                                # the control population is driven in place of the group it is sized like
            drives = [{**d, "group": "control.population"} if d["group"] == population["like"] else d for d in drives]
        return {"world": p["world"], "modelId": p["modelId"], "overrides": point, "drives": drives, "seed": seed, "durationSteps": p["durationSteps"],
                "measures": p["measures"], "shuffleSeed": shuffle_seed, "population": population}

    def measure(self, point: dict, conditions: list[str], seeds: list[int]) -> tuple[dict, dict]:
        """`values[measure][condition][seed]` and `fractions[condition][seed]` for real trials at one sweep point."""
        jobs = [(c, s, self._job(point, c, s)) for c in conditions for s in seeds]
        outcomes = self.trials.run([job for _, _, job in jobs])
        values: dict = {m["id"]: {c: {} for c in conditions} for m in self.prereg["measures"]}
        fractions: dict = {c: {} for c in conditions}
        for (c, s, _), outcome in zip(jobs, outcomes):
            fractions[c][s] = outcome["fractionActive"]
            for m, v in outcome["values"].items():
                values[m][c][s] = v
        return values, fractions

    def control_values(self, point: dict, criterion: dict, shipped: bool) -> list[float]:
        """One number per control draw: the measure under that control, averaged over the seeds the prereg gives it."""
        control = self.controls[criterion["control"]]
        n = control["n"] if shipped else control.get("nOffShipped", control["n"])
        confirm = self.prereg["seeds"]["confirm"]
        jobs, owners = [], []
        for k in range(n):
            seeds = [confirm[k % len(confirm)]] if control["kind"] == "shuffle" else confirm[:control.get("seedsPerDraw", len(confirm))]
            for seed in seeds:
                if control["kind"] == "shuffle":
                    jobs.append(self._job(point, criterion["condition"], seed, shuffle_seed=control["firstSeed"] + k))
                else:
                    jobs.append(self._job(point, criterion["condition"], seed, population={"like": control["like"], "seed": control["firstSeed"] + k}))
                owners.append(k)
        outcomes = self.trials.run(jobs)
        totals: dict[int, list[float]] = {}
        for k, outcome in zip(owners, outcomes):
            totals.setdefault(k, []).append(outcome["values"][criterion["measure"]])
        return [sum(v) / len(v) for _, v in sorted(totals.items())]

    # ----- pilot: free, never counts
    def pilot(self) -> dict:
        point = self.prereg["shipped"]
        values, fractions = self.measure(point, sorted(self.conditions), self.prereg["seeds"]["pilot"])
        return {"point": point, "values": values, "fractions": fractions}

    # ----- confirmation
    def evaluate(self, criterion: dict, point: dict, shipped: bool, values: dict, fractions: dict, thresholds: dict | None) -> tuple[bool, dict]:
        kind, confirm = criterion["kind"], self.prereg["seeds"]["confirm"]
        of = values.get(criterion.get("measure"), {})
        if kind == "threshold":
            return criteria.threshold(criterion, of, confirm)
        if kind == "paired_drop":
            return criteria.paired_drop(criterion, of, confirm)
        if kind == "monotone":
            return criteria.monotone(criterion, of, confirm)
        if kind == "ratio_vs_control":
            return criteria.ratio_vs_control(criterion, of, confirm, self.control_values(point, criterion, shipped))
        if kind == "control_fraction":
            return criteria.control_fraction(criterion, of, confirm, self.control_values(point, criterion, shipped))
        if kind == "fraction_active":
            return criteria.fraction_active(criterion, fractions)
        return criteria.decoder_accuracy(criterion, of, self.prereg["seeds"]["holdout"], thresholds)

    def confirm(self, committed=is_committed) -> dict:
        p, sha = self.prereg, prereg_sha256(self.path)
        ledger_path, verdict_path = self.folder / "consumed.json", self.folder / "verdict.json"
        if not committed(self.path):
            raise HarnessError(f"{self.path.name} is not committed, or has changed since it was. Criteria are frozen in git before a confirmation seed runs: commit it first.")
        if ledger_path.exists():
            ledger = json.loads(ledger_path.read_text())
            if ledger["preregSha256"] != sha:
                raise HarnessError("the pre-registration has changed since its confirmation seeds were consumed. A changed experiment is a new experiment: give it a new id and fresh seeds.")
        elif verdict_path.exists():
            raise HarnessError("there is a verdict but no ledger of consumed seeds. Deleting consumed.json does not reset an experiment.")
        else:
            ledger_path.write_text(json.dumps({"preregSha256": sha, "seeds": {"confirm": p["seeds"]["confirm"], "holdout": p["seeds"].get("holdout", [])}}, indent=1, sort_keys=True) + "\n")

        everywhere = [c for c in p["criteria"] if c.get("at", EVERYWHERE) == EVERYWHERE]
        at_shipped = [c for c in p["criteria"] if c.get("at") == SHIPPED]
        swept_conditions = sorted({cond for c in everywhere for cond in _conditions_of(c, set(self.conditions))})
        by_point = []
        for point in _points(p):
            shipped = point == p["shipped"]
            self.log(f"sweep point {point}{'  (shipped)' if shipped else ''}")
            values, fractions = self.measure(point, sorted(self.conditions) if shipped else swept_conditions, p["seeds"]["confirm"])
            outcomes = {c["id"]: self.evaluate(c, point, shipped, values, fractions, None) for c in everywhere}
            by_point.append({"point": point, "shipped": shipped, "values": values, "fractions": fractions, "outcomes": outcomes})

        shipped_run = next(run for run in by_point if run["shipped"])
        thresholds = None
        if p.get("decoder"):
            thresholds = criteria.decoder_thresholds(p["decoder"], shipped_run["values"][p["decoder"]["measure"]], p["seeds"]["confirm"])
        holdout_values: dict = {}
        if any(c["kind"] == "decoder_accuracy" for c in at_shipped):   # the only thing in a verdict that may touch a held-out seed
            needed = sorted({check["condition"] for c in at_shipped if c["kind"] == "decoder_accuracy" for check in c["checks"]})
            holdout_values, _ = self.measure(p["shipped"], needed, p["seeds"]["holdout"])
        results = []
        plateau = self._plateau(by_point, [c["id"] for c in everywhere])
        for c in everywhere:
            on_plateau = plateau["perCriterion"][c["id"]]["plateau"]
            passed_shipped = shipped_run["outcomes"][c["id"]][0]
            results.append({"id": c["id"], "kind": c["kind"], "observed": shipped_run["outcomes"][c["id"]][1], "passAtShipped": passed_shipped,
                            "pass": bool(passed_shipped and on_plateau), "rejected": None if on_plateau or not passed_shipped else "no plateau",
                            "passingValues": plateau["perCriterion"][c["id"]]["passing"]})
        for c in at_shipped:
            source = holdout_values if c["kind"] == "decoder_accuracy" else shipped_run["values"]
            passed, observed = self.evaluate(c, p["shipped"], True, source, shipped_run["fractions"], thresholds)
            results.append({"id": c["id"], "kind": c["kind"], "observed": observed, "passAtShipped": passed, "pass": bool(passed), "rejected": None, "passingValues": None})
        everything = all(r["pass"] for r in results) and plateau["joint"]["plateau"]
        verdict = {
            "id": p["id"], "question": p["question"], "attempts": [*p.get("attempts", []), p["id"]],
            "prereg": {"sha256": sha, "gitRev": git_rev(self.path)},
            "inputs": {"graphSha256": self.world.graph.sha256, "lockSha256": self.world.lock_sha256, "modelId": p["modelId"], "codecSha256": self.world.codec_sha256,
                       "sweep": p["sweep"], "shipped": p["shipped"], "seeds": p["seeds"]},
            "criteria": results,
            "plateau": {"param": p["plateau"]["param"], "values": plateau["values"], "passing": plateau["joint"]["passing"], "holds": plateau["joint"]["plateau"]},
            "decoder": thresholds,
            "verdict": "pass" if everything else "fail",
            "gates": p.get("gates", []) if everything else [],
            "notes": p.get("notes", ""),
        }
        verdict_path.write_text(json.dumps(verdict, indent=1, sort_keys=True) + "\n")
        return {"verdict": verdict, "byPoint": by_point, "holdout": holdout_values}

    def _plateau(self, by_point: list[dict], ids: list[str]) -> dict:
        """Along one swept parameter: at which of its values does a criterion pass for ALL values of every other swept parameter?"""
        p = self.prereg
        param, need = p["plateau"]["param"], p["plateau"]["minAdjacent"]
        values = next(s["values"] for s in p["sweep"] if s["param"] == param)

        def adjacent(passing: list) -> bool:        # enough neighbouring values pass, and the shipped value is one of them
            flags = [v in passing for v in values]
            runs = [(i, j) for i in range(len(values)) for j in range(i, len(values)) if all(flags[i:j + 1]) and j - i + 1 >= need]
            at = values.index(p["shipped"][param])
            return any(i <= at <= j for i, j in runs)

        def passing_for(check) -> list:
            return [v for v in values if all(check(run) for run in by_point if run["point"][param] == v)]

        per = {cid: passing_for(lambda run, cid=cid: run["outcomes"][cid][0]) for cid in ids}
        joint = passing_for(lambda run: all(run["outcomes"][cid][0] for cid in ids))
        return {"values": values, "perCriterion": {cid: {"passing": ok, "plateau": adjacent(ok)} for cid, ok in per.items()},
                "joint": {"passing": joint, "plateau": adjacent(joint) if ids else True}}
