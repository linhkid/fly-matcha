"""The gate: a mechanic may be switched on only if the experiment it rests on has passed (rule 1)."""

from __future__ import annotations

import json
from pathlib import Path

from flylab import REPO_ROOT

MECHANICS = REPO_ROOT / "contracts" / "mechanics.json"
EXPERIMENTS = REPO_ROOT / "lab" / "experiments"


def unlicensed(mechanics_path: Path = MECHANICS, experiments_dir: Path = EXPERIMENTS) -> list[str]:
    """Every enabled mechanic whose experiment has no `pass` verdict, with the reason."""
    problems = []
    for mechanic in json.loads(mechanics_path.read_text(encoding="utf-8")):
        if set(mechanic) != {"id", "requires", "enabled"}:
            problems.append(f"{mechanic.get('id', '?')}: a mechanic is exactly id, requires, enabled")
            continue
        if not mechanic["enabled"]:
            continue
        verdict_path = experiments_dir / mechanic["requires"] / "verdict.json"
        if not verdict_path.exists():
            problems.append(f"{mechanic['id']} is enabled, but {mechanic['requires']} has no verdict")
            continue
        verdict = json.loads(verdict_path.read_text(encoding="utf-8"))
        if verdict["verdict"] != "pass":
            problems.append(f"{mechanic['id']} is enabled, but {mechanic['requires']} ended in {verdict['verdict']}")
        elif mechanic["id"] not in verdict["gates"]:
            problems.append(f"{mechanic['id']} is enabled, but {mechanic['requires']} does not gate it")
    return problems


def enabled(mechanic_id: str, mechanics_path: Path = MECHANICS) -> bool:
    return any(m["id"] == mechanic_id and m["enabled"] for m in json.loads(mechanics_path.read_text(encoding="utf-8")))
