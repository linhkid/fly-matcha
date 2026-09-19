"""Fetch MaleCNS source files with provenance.

Sole owner of raw data and of ``data/raw/sources.json``. Nothing is fetched
without ``consent=True``: downloads need the user's yes in the session that runs
them (spec rule 8). ``plan`` only reads response headers, so it is safe to call
at any time.
"""

from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.request import Request, urlopen

DATASET = "MaleCNS v1.0 (Janelia FlyEM, CC-BY 4.0)"
BUCKET = "https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome"

ANNOTATIONS = "body-annotations.feather"
TRANSMITTERS = "body-neurotransmitters.feather"
WEIGHTS = "connectome-weights-traced-only.feather"

# stage -> [(local file name, remote file name)]
STAGES: dict[str, list[tuple[str, str]]] = {
    "A": [
        (ANNOTATIONS, "body-annotations-male-cns-v1.0-minconf-0.5.feather"),
        (TRANSMITTERS, "body-neurotransmitters-male-cns-v1.0.feather"),
    ],
    "B": [(WEIGHTS, "connectome-weights-male-cns-v1.0-minconf-0.5-traced-only.feather")],
}

BLOCK = 8 * 1024 * 1024


class CorruptDownload(ValueError):
    """A file's size or MD5 does not match what the server declared."""


class ConsentRequired(PermissionError):
    """``run`` was called without the user's explicit yes."""


class UnverifiableSource(ValueError):
    """The server did not declare a size and an MD5, so a download could not be checked."""


@dataclass(frozen=True)
class SourceRequest:
    file: str
    url: str
    bytes: int
    md5: str  # base64, as Google Cloud Storage reports it
    generation: str


@dataclass(frozen=True)
class SourceRecord:
    file: str
    url: str
    bytes: int
    md5: str
    sha256: str
    generation: str


def _remote_facts(url: str, headers) -> tuple[int, str, str]:
    hashes = ",".join(headers.get_all("x-goog-hash") or [])
    md5 = next((part.strip()[4:] for part in hashes.split(",") if part.strip().startswith("md5=")), None)
    if headers.get("Content-Length") is None or md5 is None:
        raise UnverifiableSource(f"{url}: the server declared no size or no md5; refusing to fetch what cannot be checked")
    return int(headers["Content-Length"]), md5, headers.get("x-goog-generation", "")


def plan(stage: str) -> list[SourceRequest]:
    """What ``run`` would fetch, read from response headers only."""
    requests = []
    for local, remote in STAGES[stage]:
        url = f"{BUCKET}/{remote}"
        with urlopen(Request(url, method="HEAD"), timeout=60) as response:
            size, md5, generation = _remote_facts(url, response.headers)
        requests.append(SourceRequest(local, url, size, md5, generation))
    return requests


def file_hashes(path: Path) -> tuple[str, str]:
    """(sha256 hex, md5 base64) of a file, streamed."""
    sha, md5 = hashlib.sha256(), hashlib.md5()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(BLOCK), b""):
            sha.update(block)
            md5.update(block)
    return sha.hexdigest(), base64.b64encode(md5.digest()).decode()


def verify_file(path: Path, size: int, md5: str) -> str:
    """Return the file's sha256, or raise CorruptDownload."""
    if not path.exists():
        raise CorruptDownload(f"{path.name}: missing")
    if path.stat().st_size != size:
        raise CorruptDownload(f"{path.name}: {path.stat().st_size:,} bytes, expected {size:,}")
    sha, found = file_hashes(path)
    if found != md5:
        raise CorruptDownload(f"{path.name}: md5 {found}, expected {md5}")
    return sha


def _download(request: SourceRequest, path: Path) -> str:
    """Stream to ``<name>.part``, verify, then rename. Nothing unverified ever carries the final name."""
    temporary = path.with_name(path.name + ".part")
    try:
        with urlopen(request.url, timeout=60) as response, temporary.open("wb") as output:
            while block := response.read(BLOCK):
                output.write(block)
        sha = verify_file(temporary, request.bytes, request.md5)
        temporary.replace(path)
        return sha
    finally:
        temporary.unlink(missing_ok=True)


def run(stage: str, consent: bool, directory: Path, requests: list[SourceRequest] | None = None) -> list[SourceRecord]:
    """Fetch one stage. A file already present and intact is not fetched again.

    ``requests`` defaults to ``plan(stage)``; tests pass their own.
    """
    if not consent:
        raise ConsentRequired("downloads need the user's yes in this session; pass consent=True only then")
    directory.mkdir(parents=True, exist_ok=True)
    records = []
    for request in plan(stage) if requests is None else requests:
        path = directory / request.file
        try:
            sha = verify_file(path, request.bytes, request.md5)
        except CorruptDownload:
            sha = _download(request, path)
        records.append(SourceRecord(request.file, request.url, request.bytes, request.md5, sha, request.generation))
    merge_sources(directory / "sources.json", records)
    return records


def merge_sources(path: Path, records: list[SourceRecord]) -> None:
    """Add or replace records in ``sources.json``, sorted by file, written atomically."""
    known = {entry["file"]: entry for entry in json.loads(path.read_text(encoding="utf-8"))} if path.exists() else {}
    known.update({record.file: asdict(record) for record in records})
    temporary = path.with_name(path.name + ".part")
    temporary.write_text(json.dumps([known[name] for name in sorted(known)], indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def describe(requests: list[SourceRequest]) -> str:
    lines = [f"Source: {BUCKET}/"]
    lines += [f"  {r.file:<42} {r.bytes / 1e6:8.1f} MB   from {r.url.rsplit('/', 1)[1]}" for r in requests]
    lines.append(f"  total {sum(r.bytes for r in requests) / 1e6:.1f} MB")
    return "\n".join(lines)
