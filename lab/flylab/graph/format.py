"""The ``.fskg`` file: the graph's arrays, little-endian, section after section (contracts/GRAPH.md).

Sole owner of the byte layout. ``read_graph`` hands back the same ``Graph`` the fixtures build in memory, as views
onto the file's bytes: nothing is copied, and nothing is trusted. A file that is cut short, padded wrongly, carries
trailing bytes or breaks one of the graph's orderings is refused by name, and so is a manifest that says
``synthetic: true`` outside a test.
"""

from __future__ import annotations

import hashlib
import json
import struct
from pathlib import Path

import numpy as np

from flylab.graph.graph import Graph, GraphError

MAGIC = b"FSKGRAPH"
VERSION = 1
HEADER = struct.Struct("<8sIIII")  # magic, version, N, E, minSynapses: 24 bytes, a multiple of 8
SECTIONS = (("body_id", "<u8", "n"), ("nt", "u1", "n"), ("flags", "u1", "n"), ("out_offset", "<u4", "n+1"), ("target", "<u4", "e"), ("syn_count", "<u2", "e"))


def _padded(data: bytes) -> bytes:
    return data + b"\0" * (-len(data) % 8)


def manifest_path(path: Path) -> Path:
    return path.with_name(path.stem + ".manifest.json")


def graph_bytes(graph: Graph) -> bytes:
    """The file's bytes for a graph. The same graph always gives the same bytes."""
    parts = [HEADER.pack(MAGIC, VERSION, graph.n, graph.e, graph.min_synapses)]
    for name, dtype, _ in SECTIONS:
        parts.append(_padded(np.ascontiguousarray(getattr(graph, name), dtype=dtype).tobytes()))
    return b"".join(parts)


def write_graph(path: Path, graph: Graph, manifest: dict) -> str:
    """Write the file and its manifest beside it. Returns the file's SHA-256, which the manifest records."""
    data = graph_bytes(graph)
    sha = hashlib.sha256(data).hexdigest()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".part")
    temporary.write_bytes(data)
    temporary.replace(path)
    full = {**manifest, "graph": {"file": path.name, "sha256": sha, "N": graph.n, "E": graph.e, "minSynapses": graph.min_synapses}}
    manifest_path(path).write_text(json.dumps(full, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return sha


def parse_graph(data: bytes | memoryview, sha256: str = "") -> Graph:
    """A ``Graph`` over ``data``, zero copy. Raises ``GraphError`` for anything that is not exactly a version 1 file."""
    view = memoryview(data)
    if len(view) < HEADER.size:
        raise GraphError("truncated: the file is shorter than its header")
    magic, version, n, e, min_synapses = HEADER.unpack_from(view, 0)
    if magic != MAGIC:
        raise GraphError("not a graph file")
    if version != VERSION:
        raise GraphError(f"graph file version {version} is not supported")
    at, arrays = HEADER.size, {}
    for name, dtype, length in SECTIONS:
        count = {"n": n, "n+1": n + 1, "e": e}[length]
        size = count * np.dtype(dtype).itemsize
        if at + size > len(view):
            raise GraphError(f"truncated: section {name} runs past the end of the file")
        arrays[name] = np.frombuffer(view, dtype=dtype, count=count, offset=at)
        end = at + size
        at = end + (-end % 8)
        if at > len(view) or any(view[end:at]):
            raise GraphError(f"misaligned: section {name} is not zero padded to an 8-byte boundary")
    if at != len(view):
        raise GraphError("trailing bytes after the last section")
    return Graph(**arrays, min_synapses=int(min_synapses), sha256=sha256)


def read_graph(path: Path, allow_synthetic: bool = False) -> Graph:
    """Load a graph file and check it against its manifest. The arrays are views onto a read-only memory map."""
    manifest_file = manifest_path(path)
    if not manifest_file.exists():
        raise GraphError(f"{path.name} has no manifest beside it")
    manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    if manifest.get("synthetic") is not False and not allow_synthetic:
        raise GraphError(f"{path.name} is marked synthetic; only tests may load it")
    sha = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(8 * 1024 * 1024), b""):
            sha.update(block)
    if manifest.get("graph", {}).get("sha256") != sha.hexdigest():
        raise GraphError(f"{path.name} does not match the hash in its manifest")
    return parse_graph(np.memmap(path, dtype=np.uint8, mode="r"), sha.hexdigest())
