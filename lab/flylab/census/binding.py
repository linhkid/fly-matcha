"""The census: bind a circuit's roles to body IDs, or say plainly why not.

Sole owner, with the circuit files, of circuit definitions and of the lock
(specs/matcha-fly/CONTRACTS.md, "Circuit file and lock"). Pure functions over
data frames; all file access lives in ``cli``.

Identity comes from annotations and papers only. Nothing here looks at what a
population does in a simulation: binding by effect would make later experiments
true by construction.
"""

from __future__ import annotations

import difflib
import json
import re
from dataclasses import dataclass, field

import pandas as pd

LOCK_VERSION = 2  # 2: every group carries one side letter per body, and connectivity may add hubs and hop depths
TRANSMITTER_NAMES = ("acetylcholine", "gaba", "glutamate", "histamine", "dopamine", "octopamine", "serotonin")
CROSSWALK_COLUMNS = ("flywireType", "hemibrainType", "mancType", "synonyms")
EVIDENCE_KINDS = ("annotation", "paper", "crosswalk", "connectivity")
ROLE_EVIDENCE_KINDS = ("annotation", "paper", "crosswalk")  # what a circuit file may claim; the fourth kind is counted, not claimed
INDEPENDENT_EVIDENCE = ("annotation", "paper")
EXPECTATION_BASES = ("paper", "anchor", "observed")

ROLE_KEYS = {"id", "role", "select", "expect", "required", "evidence", "explain", "flag", "caveat"}
SELECT_KEYS = {"type", "typeRegex", "where", "whereNull", "contains", "side", "bodyIds"}
EXPECT_KEYS = {"count", "countRange", "perSide", "nt", "basis"}
EVIDENCE_KEYS = {"claim", "source", "kind"}
SIDES = ("any", "L", "R")

TYPE_NOT_FOUND = "TYPE_NOT_FOUND"
COUNT_OUT_OF_RANGE = "COUNT_OUT_OF_RANGE"
NT_MISMATCH = "NT_MISMATCH"
SIDE_IMBALANCE = "SIDE_IMBALANCE"
BODYID_ABSENT = "BODYID_ABSENT"
OVERLAP = "OVERLAP"


class CircuitError(ValueError):
    """The circuit file itself is malformed. Raised before any binding."""


@dataclass(frozen=True)
class Failure:
    group: str
    code: str
    found: object
    nearest: list[str] = field(default_factory=list)
    required: bool = False


@dataclass(frozen=True)
class Bound:
    """One role resolved against the annotations."""

    id: str
    body_ids: list[int]
    sides: str  # one letter per body, in the order of body_ids: L, R, or U for unknown
    per_side: dict[str, int]
    nt_histogram: dict[str, int]
    nt_confidence: float | None  # median per-neuron confidence of the transmitter prediction
    types: list[str]
    matched_by: str


@dataclass(frozen=True)
class CensusResult:
    bound: dict[str, Bound]
    failures: list[Failure]
    frame: pd.DataFrame  # the prepared universe the roles were bound against

    @property
    def required_failures(self) -> list[Failure]:
        return [f for f in self.failures if f.required]


# --------------------------------------------------------------------------- inputs


def prepare(annotations: pd.DataFrame, transmitters: pd.DataFrame) -> pd.DataFrame:
    """The census universe: one row per *typed* body, with a resolved ``side`` and ``nt``.

    Untyped bodies are left out because the graph leaves them out; a lock must not
    name a body the graph will not hold. Transmitter labels outside the seven the
    model knows ("unclear", or no prediction at all) become ``unknown``.
    """
    frame = annotations[annotations["type"].notna()].copy()
    side = frame["rootSide"].where(frame["rootSide"].isin(["L", "R"]), "unknown")
    frame["side"] = frame["somaSide"].where(frame["somaSide"].isin(["L", "R"]), side)
    predictions = transmitters.drop_duplicates("body").set_index("body")
    label = frame["bodyId"].map(predictions["consensus_nt"]).str.lower()
    frame["nt"] = label.where(label.isin(TRANSMITTER_NAMES), "unknown")
    frame["ntConfidence"] = frame["bodyId"].map(predictions["predicted_nt_confidence"])
    return frame


def validate_circuit(circuit: dict, columns: set[str] | None = None) -> None:
    """Refuse a malformed circuit file. A typo must never widen a binding or switch off a check."""

    def unknown(where: str, given: dict, allowed: set[str]) -> None:
        extra = sorted(set(given) - allowed)
        if extra:
            raise CircuitError(f"{where}: unknown key(s) {extra}; allowed {sorted(allowed)}")

    for key in ("circuit", "version", "roles"):
        if key not in circuit:
            raise CircuitError(f"circuit file lacks '{key}'")
    seen: set[str] = set()
    for role in circuit["roles"]:
        name = role.get("id", "?")
        unknown(f"role {name}", role, ROLE_KEYS)
        for key in ("id", "role", "select", "required", "evidence", "explain"):
            if key not in role:
                raise CircuitError(f"role {name} lacks '{key}'")
        if name in seen:
            raise CircuitError(f"duplicate role id {name}")
        if name.startswith("hub."):
            raise CircuitError(f"role {name}: ids starting with 'hub.' belong to bind_connectivity, which counts synapses; a circuit file cannot declare one")
        seen.add(name)

        select = role["select"]
        unknown(f"role {name} select", select, SELECT_KEYS)
        if not any(select.get(k) for k in SELECT_KEYS - {"side"}):
            raise CircuitError(f"role {name} selects nothing")
        if select.get("bodyIds") and len([k for k in SELECT_KEYS if select.get(k)]) > 1:
            raise CircuitError(f"role {name}: explicit bodyIds cannot be combined with other selectors")
        if select.get("side", "any") not in SIDES:
            raise CircuitError(f"role {name}: side must be one of {SIDES}")
        if select.get("typeRegex"):
            try:
                re.compile(select["typeRegex"])
            except re.error as error:
                raise CircuitError(f"role {name}: bad typeRegex: {error}") from error
        named = [*(select.get("where") or {}), *(select.get("whereNull") or []), *(select.get("contains") or {})]
        if columns is not None and set(named) - columns:
            raise CircuitError(f"role {name}: no such annotation column(s) {sorted(set(named) - columns)}")

        expect = role.get("expect") or {}
        unknown(f"role {name} expect", expect, EXPECT_KEYS)
        if "count" in expect and "countRange" in expect:
            raise CircuitError(f"role {name}: give count or countRange, not both")
        if "count" in expect and not (isinstance(expect["count"], int) and expect["count"] >= 1):
            raise CircuitError(f"role {name}: count must be a positive integer")
        span = expect.get("countRange")
        if span is not None and not (isinstance(span, list) and len(span) == 2 and 1 <= span[0] <= span[1]):
            raise CircuitError(f"role {name}: countRange must be [low, high] with 1 <= low <= high")
        if ("count" in expect or "countRange" in expect) and expect.get("basis") not in EXPECTATION_BASES:
            raise CircuitError(f"role {name}: a count needs a basis, one of {EXPECTATION_BASES}")
        if "nt" in expect and expect["nt"] not in TRANSMITTER_NAMES:
            raise CircuitError(f"role {name}: unknown transmitter {expect['nt']}")

        evidence = role["evidence"]
        unknown(f"role {name} evidence", evidence, EVIDENCE_KEYS)
        if evidence.get("kind") not in ROLE_EVIDENCE_KINDS:
            raise CircuitError(f"role {name}: evidence.kind must be one of {ROLE_EVIDENCE_KINDS}; 'connectivity' is written by bind_connectivity and by nothing else")
        if not evidence.get("source") or not evidence.get("claim"):
            raise CircuitError(f"role {name}: evidence needs a claim and a source")


# --------------------------------------------------------------------------- binding


def census(circuit: dict, annotations: pd.DataFrame, transmitters: pd.DataFrame) -> CensusResult:
    frame = prepare(annotations, transmitters)
    validate_circuit(circuit, columns=set(frame.columns))
    all_types = sorted(frame["type"].unique())

    selected: dict[str, pd.DataFrame] = {}
    problems: dict[str, list[Failure]] = {}
    for role in circuit["roles"]:
        rows, found = _select(role, frame, all_types)
        selected[role["id"]] = rows
        problems[role["id"]] = found + _check_expectations(role, rows)
    for group, failure in _overlaps(circuit, selected):
        problems[group].append(failure)

    bound: dict[str, Bound] = {}
    failures: list[Failure] = []
    for role in circuit["roles"]:
        if problems[role["id"]]:
            failures += problems[role["id"]]
        else:
            bound[role["id"]] = _bind(role, selected[role["id"]])
    return CensusResult(bound, failures, frame)


def _failure(role: dict, code: str, found: object, suggestions: list[str] | None = None) -> Failure:
    return Failure(role["id"], code, found, suggestions or [], bool(role["required"]))


def _select(role: dict, frame: pd.DataFrame, all_types: list[str]) -> tuple[pd.DataFrame, list[Failure]]:
    select = role["select"]
    problems: list[Failure] = []
    if select.get("bodyIds"):
        wanted = [int(b) for b in select["bodyIds"]]
        rows = frame[frame["bodyId"].isin(wanted)]
        absent = sorted(set(wanted) - set(rows["bodyId"]))
        if absent:
            problems.append(_failure(role, BODYID_ABSENT, [str(b) for b in absent]))
        return rows, problems

    names_given = bool(select.get("type") or select.get("typeRegex"))
    mask = pd.Series(not names_given, index=frame.index)
    for name in select.get("type") or []:
        hit = frame["type"] == name
        if not hit.any():
            problems.append(_failure(role, TYPE_NOT_FOUND, name, nearest(name, frame, all_types)))
        mask |= hit
    if select.get("typeRegex"):
        hit = frame["type"].str.match(select["typeRegex"])
        if not hit.any():
            problems.append(_failure(role, TYPE_NOT_FOUND, select["typeRegex"]))
        mask |= hit
    for column, allowed in (select.get("where") or {}).items():
        mask &= frame[column].isin(allowed)
    for column in select.get("whereNull") or []:
        mask &= frame[column].isna()
    for column, text in (select.get("contains") or {}).items():
        mask &= frame[column].fillna("").str.contains(text, regex=False)
    if select.get("side", "any") != "any":
        mask &= frame["side"] == select["side"]
    rows = frame[mask]
    if rows.empty and not problems:
        problems.append(_failure(role, TYPE_NOT_FOUND, describe_select(select)))
    return rows, problems


def _check_expectations(role: dict, rows: pd.DataFrame) -> list[Failure]:
    expect = role.get("expect") or {}
    if rows.empty:
        return []
    problems = []
    low, high = expect.get("countRange") or (expect.get("count"), expect.get("count"))
    if low is not None and not low <= len(rows) <= high:
        problems.append(_failure(role, COUNT_OUT_OF_RANGE, {"count": len(rows), "expected": [low, high]}))
    sides = rows["side"].value_counts().to_dict()
    per_side = expect.get("perSide")
    if per_side is not None and (sides.get("L", 0) != per_side or sides.get("R", 0) != per_side):
        problems.append(_failure(role, SIDE_IMBALANCE, {"L": sides.get("L", 0), "R": sides.get("R", 0), "expected": per_side}))
    wanted_nt = expect.get("nt")
    if wanted_nt and (rows["nt"] == wanted_nt).sum() * 2 < len(rows):
        problems.append(_failure(role, NT_MISMATCH, {"histogram": rows["nt"].value_counts().to_dict(), "expected": wanted_nt}))
    return problems


def _overlaps(circuit: dict, selected: dict[str, pd.DataFrame]) -> list[tuple[str, Failure]]:
    """A body may sit in at most one ``grn.*`` group. Every party to an overlap fails, whatever the file order."""
    taste = [role for role in circuit["roles"] if role["id"].startswith("grn.")]
    bodies = {role["id"]: set(selected[role["id"]]["bodyId"]) for role in taste}
    found = []
    for role in taste:
        shared = {other: bodies[role["id"]] & bodies[other] for other in bodies if other != role["id"]}
        shared = {other: ids for other, ids in shared.items() if ids}
        if shared:
            contested = sorted({str(i) for ids in shared.values() for i in ids})
            found.append((role["id"], _failure(role, OVERLAP, {"alsoIn": sorted(shared), "bodyIds": contested[:10], "contested": len(contested)})))
    return found


def _bind(role: dict, rows: pd.DataFrame) -> Bound:
    sides = rows["side"].value_counts().to_dict()
    confidence = rows["ntConfidence"].median()
    ordered = rows.sort_values("bodyId")
    return Bound(
        id=role["id"],
        body_ids=[int(b) for b in ordered["bodyId"]],
        sides=side_letters(ordered["side"]),
        per_side={k: int(sides.get(k, 0)) for k in ("L", "R", "unknown")},
        nt_histogram={k: int(v) for k, v in sorted(rows["nt"].value_counts().to_dict().items())},
        nt_confidence=None if pd.isna(confidence) else round(float(confidence), 3),
        types=sorted(rows["type"].unique()),
        matched_by=describe_select(role["select"]),
    )


def side_letters(sides: pd.Series) -> str:
    """The census's sides as the letters a trial uses: L, R, and U for a body whose side the dataset does not give."""
    return "".join(side if side in ("L", "R") else "U" for side in sides)


def describe_select(select: dict) -> str:
    parts = []
    if select.get("bodyIds"):
        parts.append(f"{len(select['bodyIds'])} explicit body IDs")
    if select.get("type"):
        parts.append("type in " + ", ".join(select["type"]))
    if select.get("typeRegex"):
        parts.append(f"type matches {select['typeRegex']}")
    for column, allowed in (select.get("where") or {}).items():
        parts.append(f"{column} in {', '.join(map(str, allowed))}")
    for column in select.get("whereNull") or []:
        parts.append(f"{column} is empty")
    for column, text in (select.get("contains") or {}).items():
        parts.append(f"{column} contains '{text}'")
    if select.get("side", "any") != "any":
        parts.append(f"side {select['side']}")
    return "; ".join(parts)


def nearest(name: str, frame: pd.DataFrame, all_types: list[str], limit: int = 6) -> list[str]:
    """Types a missing name might have meant: its subtypes, its cross-matches, its look-alikes."""
    found = [t for t in all_types if t.startswith(name) and t != name]
    found += [f"{row['type']} (via {row['column']}: {row['value']})" for row in crosswalk(name, frame)]
    found += difflib.get_close_matches(name, all_types, n=limit, cutoff=0.75)
    return list(dict.fromkeys(found))[:limit]


def crosswalk(name: str, frame: pd.DataFrame) -> list[dict]:
    """Where a literature name appears in the dataset's own cross-match columns."""
    pattern = r"(?<![A-Za-z0-9])" + re.escape(name) + r"(?![A-Za-z0-9])"
    rows = []
    for column in CROSSWALK_COLUMNS:
        hits = frame[frame[column].fillna("").str.contains(pattern, regex=True)]
        for (type_name, value), group in hits.groupby(["type", column]):
            rows.append({"type": type_name, "column": column, "value": value, "neurons": int(len(group))})
    return sorted(rows, key=lambda r: (r["type"], r["column"], r["value"]))


# --------------------------------------------------------------------------- the lock


def build_lock(circuit: dict, result: CensusResult, annotations_sha256: str, transmitters_sha256: str) -> dict:
    """The lock for a census with no required failure. ``types`` describe whole types, bound or not."""
    if result.required_failures:
        raise ValueError("no lock for a census with a failed required role")
    kinds = {role["id"]: role["evidence"]["kind"] for role in circuit["roles"]}
    groups = [
        {"id": b.id, "bodyIds": [str(i) for i in b.body_ids], "sides": b.sides, "perSide": b.per_side,
         "ntHistogram": b.nt_histogram, "evidenceKind": kinds[b.id]}
        for b in result.bound.values()
    ]
    named = sorted({t for b in result.bound.values() for t in b.types})
    typed = result.frame[result.frame["type"].isin(named)]
    types = [
        {"type": name, "nNeurons": int(len(rows)), "nt": _majority(rows["nt"]), "hopDepth": None}  # slice 03 fills hopDepth
        for name, rows in typed.groupby("type")
    ]
    return {
        "version": LOCK_VERSION,
        "circuit": circuit["circuit"],
        "annotationsSha256": annotations_sha256,
        "transmittersSha256": transmitters_sha256,
        "graphSha256": None,
        "groups": groups,
        "types": types,
    }


def _majority(values: pd.Series) -> str:
    counts = values.value_counts()
    return sorted(counts[counts == counts.max()].index)[0]  # ties break by name, ascending


def dump_lock(lock: dict) -> str:
    """Byte-stable serialisation."""
    return json.dumps(lock, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


# --------------------------------------------------------------------------- report inputs and the gate


def inventory(circuit: dict, frame: pd.DataFrame) -> list[dict]:
    """Every neuron matching the circuit's inventory filter, counted by subclass, type, receptor and nerve."""
    spec = circuit.get("inventory")
    if not spec:
        return []
    mask = pd.Series(True, index=frame.index)
    for column, allowed in spec["where"].items():
        mask &= frame[column].isin(allowed)
    keys = ["subclass", "type", "receptorType", "entryNerve"]
    grouped = frame[mask].groupby(keys, dropna=False).size().reset_index(name="neurons")
    grouped = grouped.astype(object).where(grouped.notna(), None)
    return grouped.sort_values(keys, key=lambda s: s.astype(str)).to_dict("records")


def check_anchors(circuit: dict, frame: pd.DataFrame) -> list[dict]:
    """Counts someone saw elsewhere, compared with this file. A mismatch needs an explanation."""
    counts = frame["type"].value_counts()
    rows = []
    for anchor in circuit.get("anchors", []):
        found = int(counts.get(anchor["type"], 0))
        rows.append({**anchor, "found": found, "matches": found == anchor["expected"]})
    return rows


def resolve_aliases(circuit: dict, frame: pd.DataFrame) -> list[dict]:
    """Literature names against the MaleCNS types that carry them, or none."""
    types = set(frame["type"].unique())
    return [
        {**alias, "isType": alias["name"] in types, "matches": crosswalk(alias["name"], frame)}
        for alias in circuit.get("aliases", [])
    ]


def gate(circuit: dict, result: CensusResult, anchors: list[dict]) -> dict:
    """Whether later slices may build on this census.

    Every required role is bound, on evidence that does not rest on a name or a
    cross-match alone, and every anchor is matched or explained.
    """
    reasons = [f"required role {f.group} failed: {f.code}" for f in result.required_failures]
    for role in circuit["roles"]:
        if role["required"] and role["id"] in result.bound and role["evidence"]["kind"] not in INDEPENDENT_EVIDENCE:
            reasons.append(f"required role {role['id']} is bound only by {role['evidence']['kind']} evidence")
    for anchor in anchors:
        if not anchor["matches"] and not anchor.get("explanation"):
            reasons.append(f"anchor {anchor['type']}: expected {anchor['expected']}, found {anchor['found']}, unexplained")
    return {"pass": not reasons, "reasons": reasons}
