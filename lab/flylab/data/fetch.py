"""Fetch MaleCNS source files with provenance.

Sole owner of raw data and of ``data/raw/sources.json``. Nothing is fetched
without ``consent=True``: downloads need the user's yes in the session that runs
them (spec rule 8). ``plan`` only reads response headers, so it is safe to call
at any time.
"""

from __future__ import annotations

import base64
import glob
import hashlib
import json
import ssl
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass
from http.client import IncompleteRead
from pathlib import Path
from urllib.error import HTTPError, URLError
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


def _head(url: str, attempts: int = 5, pause: float = 2.0) -> tuple[int, str, str]:
    """A file's declared size, md5 and generation. A dropped connection is asked again; a server's refusal is not."""
    for attempt in range(attempts):
        try:
            with urlopen(Request(url, method="HEAD"), timeout=60) as response:
                return _remote_facts(url, response.headers)
        except HTTPError:
            raise
        except (TimeoutError, ConnectionError, URLError):
            if attempt == attempts - 1:
                raise
            time.sleep(pause)
    raise AssertionError("unreachable")


def plan(stage: str) -> list[SourceRequest]:
    """What ``run`` would fetch, read from response headers only."""
    requests = []
    for local, remote in STAGES[stage]:
        url = f"{BUCKET}/{remote}"
        requests.append(SourceRequest(local, url, *_head(url)))
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


Progress = Callable[[str, int, int], None]
ATTEMPTS = 12
TRANSIENT = frozenset({408, 429, 500, 502, 503, 504})   # the statuses Google Cloud Storage documents as worth asking again


def _partial(path: Path, request: SourceRequest) -> Path:
    """The partial file is named for the object it is the start of, so no run continues another object's bytes."""
    tag = hashlib.sha256(f"{request.generation}:{request.md5}".encode()).hexdigest()[:16]
    return path.with_name(f"{path.name}.{tag}.part")


def _download(request: SourceRequest, path: Path, progress: Progress | None = None, attempts: int = ATTEMPTS, pause: float = 2.0) -> str:
    """Stream to ``<name>.part``, verify, then rename. Nothing unverified ever carries the final name.

    A stalled or dropped connection keeps the partial file, and the next attempt, or the next run, asks the
    server for the rest. The partial file is named for the generation and md5 it was planned under, so a later
    run that plans a different object starts again instead of appending to another object's bytes; within a run
    the generation is pinned with x-goog-if-generation-match. A partial file is thrown away only when it cannot
    be the start of the right file: a whole re-read of the source ended short, the object changed, or the
    finished file fails its checksum. Running out of attempts keeps it.
    """
    temporary = _partial(path, request)
    for stale in path.parent.glob(glob.escape(path.name) + ".*.part"):   # the start of some other object: useless now
        if stale != temporary:
            stale.unlink()
    for attempt in range(attempts):
        have = temporary.stat().st_size if temporary.exists() else 0
        if have > request.bytes:
            temporary.unlink()
            have = 0
        restarted = False
        before = have
        if have < request.bytes:
            headers = {"Range": f"bytes={have}-"} if have else {}
            if request.generation and request.url.startswith("http"):
                headers["x-goog-if-generation-match"] = request.generation
            try:
                with urlopen(Request(request.url, headers=headers), timeout=60) as response:
                    if have and getattr(response, "status", None) != 206:   # the range was ignored: this is the whole file again
                        have, restarted = 0, True
                    with temporary.open("ab" if have else "wb") as output:
                        try:
                            while block := response.read(BLOCK):
                                output.write(block)
                                have += len(block)
                                if progress:
                                    progress(request.file, have, request.bytes)
                        except IncompleteRead as cut:
                            output.write(cut.partial)
                            have += len(cut.partial)
            except HTTPError as error:
                if error.code == 412:                                        # another generation: the partial file is of another object
                    temporary.unlink(missing_ok=True)
                    raise CorruptDownload(f"{request.file}: the object changed on the server since it was planned") from error
                if error.code not in TRANSIENT or attempt == attempts - 1:   # a refusal, or the last try: the partial file stays
                    raise
                error.close()
                time.sleep(pause)
                continue
            except (TimeoutError, ConnectionError, URLError, ssl.SSLError) as error:
                if attempt == attempts - 1:
                    raise
                if progress:
                    progress(request.file, temporary.stat().st_size if temporary.exists() else 0, request.bytes)
                time.sleep(pause)
                continue
        if have < request.bytes:
            if restarted or (have <= before and not request.url.startswith("http")):   # read whole and still short: the source itself is short
                temporary.unlink(missing_ok=True)
                raise CorruptDownload(f"{request.file}: the source ended at {have:,} bytes, expected {request.bytes:,}")
            if have <= before:                                                # a connection that closed before any byte is a dropped one
                time.sleep(pause)
            continue
        try:
            sha = verify_file(temporary, request.bytes, request.md5)
        except CorruptDownload:
            temporary.unlink(missing_ok=True)
            raise
        temporary.replace(path)
        return sha
    raise CorruptDownload(f"{request.file}: gave up after {attempts} attempts; what arrived is kept, and the next run continues from it")


def run(stage: str, consent: bool, directory: Path, requests: list[SourceRequest] | None = None, progress: Progress | None = None) -> list[SourceRecord]:
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
            sha = _download(request, path, progress)
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
