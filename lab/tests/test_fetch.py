"""Provenance: a file that does not match what the server declared never carries the final name."""

import base64
import hashlib
import json
from email.message import Message

import pytest

from flylab.data import fetch


def declared(payload: bytes) -> tuple[int, str]:
    return len(payload), base64.b64encode(hashlib.md5(payload).digest()).decode()


def request_for(source, payload: bytes, name="x.feather") -> fetch.SourceRequest:
    size, md5 = declared(payload)
    return fetch.SourceRequest(name, source.as_uri(), size, md5, "g1")


PAYLOAD = b"connectome" * 1000


def test_an_intact_file_verifies_and_reports_its_sha256(tmp_path):
    path = tmp_path / "x.feather"
    path.write_bytes(PAYLOAD)
    assert fetch.verify_file(path, *declared(PAYLOAD)) == hashlib.sha256(PAYLOAD).hexdigest()


def test_a_flipped_byte_is_refused(tmp_path):
    corrupted = bytearray(PAYLOAD)
    corrupted[1234] ^= 0x01
    path = tmp_path / "x.feather"
    path.write_bytes(bytes(corrupted))
    with pytest.raises(fetch.CorruptDownload, match="md5"):
        fetch.verify_file(path, *declared(PAYLOAD))


def test_a_truncated_or_missing_file_is_refused(tmp_path):
    path = tmp_path / "x.feather"
    with pytest.raises(fetch.CorruptDownload, match="missing"):
        fetch.verify_file(path, *declared(PAYLOAD))
    path.write_bytes(PAYLOAD[:-1])
    with pytest.raises(fetch.CorruptDownload, match="bytes"):
        fetch.verify_file(path, *declared(PAYLOAD))


def test_nothing_is_fetched_without_consent(tmp_path):
    with pytest.raises(fetch.ConsentRequired):
        fetch.run("A", consent=False, directory=tmp_path)
    assert list(tmp_path.iterdir()) == []


def test_a_fetch_lands_the_file_records_its_provenance_and_is_a_no_op_the_second_time(tmp_path):
    source, target = tmp_path / "remote.bin", tmp_path / "raw"
    source.write_bytes(PAYLOAD)
    request = request_for(source, PAYLOAD)
    records = fetch.run("A", consent=True, directory=target, requests=[request])
    assert (target / "x.feather").read_bytes() == PAYLOAD
    assert records[0].sha256 == hashlib.sha256(PAYLOAD).hexdigest()
    assert json.loads((target / "sources.json").read_text())[0]["generation"] == "g1"
    source.unlink()  # the second run must not touch the source at all
    assert fetch.run("A", consent=True, directory=target, requests=[request]) == records


def test_a_corrupt_source_leaves_neither_the_file_nor_a_partial(tmp_path):
    source, target = tmp_path / "remote.bin", tmp_path / "raw"
    source.write_bytes(PAYLOAD[:-7])
    with pytest.raises(fetch.CorruptDownload):
        fetch.run("A", consent=True, directory=target, requests=[request_for(source, PAYLOAD)])
    assert [p.name for p in target.iterdir()] == []


def test_a_damaged_local_file_is_fetched_again(tmp_path):
    source, target = tmp_path / "remote.bin", tmp_path / "raw"
    source.write_bytes(PAYLOAD)
    target.mkdir()
    (target / "x.feather").write_bytes(b"damaged")
    fetch.run("A", consent=True, directory=target, requests=[request_for(source, PAYLOAD)])
    assert (target / "x.feather").read_bytes() == PAYLOAD


def test_a_server_that_declares_no_checksum_is_refused_by_name():
    headers = Message()
    headers["Content-Length"] = "10"
    headers["x-goog-hash"] = "crc32c=AAAAAA=="  # what a composite object reports: no md5
    with pytest.raises(fetch.UnverifiableSource):
        fetch._remote_facts("https://example.invalid/x", headers)
    with pytest.raises(fetch.UnverifiableSource):
        fetch._remote_facts("https://example.invalid/x", Message())


def test_sources_json_merges_stages_and_stays_sorted(tmp_path):
    path = tmp_path / "sources.json"
    a, b = (fetch.SourceRecord(f"{n}.feather", "u", 1, "m", "s", "g") for n in "ab")
    fetch.merge_sources(path, [b])
    fetch.merge_sources(path, [a])
    first = path.read_text()
    assert [entry["file"] for entry in json.loads(first)] == ["a.feather", "b.feather"]
    fetch.merge_sources(path, [a])
    assert path.read_text() == first
    assert [p.name for p in tmp_path.iterdir()] == ["sources.json"]


# --- a download that stalls or is cut must not start from zero ---------------------------------------------------

import threading
from http.server import BaseHTTPRequestHandler, HTTPServer


class Flaky(BaseHTTPRequestHandler):
    """Serves PAYLOAD. `plan` is a list of behaviours, one per request: 'cut' stops half way, 'whole' ignores ranges."""

    plan: list[str] = []
    seen: list[dict] = []

    def do_GET(self):
        behaviour = Flaky.plan.pop(0) if Flaky.plan else "range"
        Flaky.seen.append({"range": self.headers.get("Range"), "generation": self.headers.get("x-goog-if-generation-match")})
        if behaviour in ("changed", "unavailable"):
            self.send_response(412 if behaviour == "changed" else 503)
            self.end_headers()
            return
        start = 0
        if behaviour != "whole" and self.headers.get("Range"):
            start = int(self.headers["Range"].split("=")[1].rstrip("-"))
        body = PAYLOAD[start:]
        self.send_response(206 if start else 200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if behaviour != "silent":                       # "silent": the headers arrive and then the connection closes
            self.wfile.write(body[: len(body) // 2] if behaviour == "cut" else body)

    def log_message(self, *args):
        pass


@pytest.fixture
def flaky():
    Flaky.plan, Flaky.seen = [], []
    server = HTTPServer(("127.0.0.1", 0), Flaky)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}/x"
    server.shutdown()


def http_request(url: str) -> fetch.SourceRequest:
    size, md5 = declared(PAYLOAD)
    return fetch.SourceRequest("x.feather", url, size, md5, "g7")


def test_a_cut_connection_is_resumed_from_where_it_stopped_with_the_generation_pinned(tmp_path, flaky):
    Flaky.plan = ["cut", "cut", "range"]
    seen = []
    sha = fetch._download(http_request(flaky), tmp_path / "x.feather", progress=lambda name, have, total: seen.append(have), pause=0)
    assert (tmp_path / "x.feather").read_bytes() == PAYLOAD and sha == hashlib.sha256(PAYLOAD).hexdigest()
    half = len(PAYLOAD) // 2
    assert [r["range"] for r in Flaky.seen] == [None, f"bytes={half}-", f"bytes={half + (len(PAYLOAD) - half) // 2}-"]
    assert {r["generation"] for r in Flaky.seen} == {"g7"}
    assert seen[-1] == len(PAYLOAD) and not fetch._partial(tmp_path / "x.feather", http_request("http://x")).exists()


def test_a_partial_file_from_an_earlier_run_is_continued_not_restarted(tmp_path, flaky):
    fetch._partial(tmp_path / "x.feather", http_request("http://x")).write_bytes(PAYLOAD[:4000])
    fetch._download(http_request(flaky), tmp_path / "x.feather", pause=0)
    assert [r["range"] for r in Flaky.seen] == ["bytes=4000-"]
    assert (tmp_path / "x.feather").read_bytes() == PAYLOAD


def test_a_server_that_ignores_the_range_gives_the_whole_file_again_and_that_is_fine(tmp_path, flaky):
    fetch._partial(tmp_path / "x.feather", http_request("http://x")).write_bytes(PAYLOAD[:4000])
    Flaky.plan = ["whole"]
    fetch._download(http_request(flaky), tmp_path / "x.feather", pause=0)
    assert (tmp_path / "x.feather").read_bytes() == PAYLOAD


def test_a_wrong_partial_file_is_caught_by_the_checksum_and_thrown_away(tmp_path, flaky):
    fetch._partial(tmp_path / "x.feather", http_request("http://x")).write_bytes(b"?" * 4000)
    with pytest.raises(fetch.CorruptDownload, match="md5"):
        fetch._download(http_request(flaky), tmp_path / "x.feather", pause=0)
    assert list(tmp_path.iterdir()) == []


def test_an_object_that_changed_on_the_server_is_refused_and_its_partial_file_dropped(tmp_path, flaky):
    fetch._partial(tmp_path / "x.feather", http_request("http://x")).write_bytes(PAYLOAD[:4000])
    Flaky.plan = ["changed"]
    with pytest.raises(fetch.CorruptDownload, match="changed"):
        fetch._download(http_request(flaky), tmp_path / "x.feather", pause=0)
    assert list(tmp_path.iterdir()) == []


def test_a_server_that_never_answers_keeps_the_partial_file_for_the_next_run(tmp_path):
    fetch._partial(tmp_path / "x.feather", http_request("http://x")).write_bytes(PAYLOAD[:4000])
    size, md5 = declared(PAYLOAD)
    with pytest.raises(OSError):
        fetch._download(fetch.SourceRequest("x.feather", "http://127.0.0.1:9/x", size, md5, "g7"), tmp_path / "x.feather", attempts=2, pause=0)
    assert fetch._partial(tmp_path / "x.feather", http_request("http://x")).read_bytes() == PAYLOAD[:4000]


def test_running_out_of_attempts_keeps_what_arrived_and_the_next_run_continues_from_it(tmp_path, flaky):
    Flaky.plan = ["cut"] * 3
    with pytest.raises(fetch.CorruptDownload, match="gave up"):
        fetch._download(http_request(flaky), tmp_path / "x.feather", attempts=3, pause=0)
    kept = fetch._partial(tmp_path / "x.feather", http_request(flaky)).read_bytes()
    assert kept == PAYLOAD[:len(kept)] and len(kept) == 8750
    fetch._download(http_request(flaky), tmp_path / "x.feather", pause=0)
    assert Flaky.seen[-1]["range"] == "bytes=8750-" and (tmp_path / "x.feather").read_bytes() == PAYLOAD


def test_a_connection_that_closes_before_any_byte_is_a_dropped_one_not_a_short_source(tmp_path, flaky):
    fetch._partial(tmp_path / "x.feather", http_request(flaky)).write_bytes(PAYLOAD[:4000])
    Flaky.plan = ["silent", "range"]
    fetch._download(http_request(flaky), tmp_path / "x.feather", pause=0)
    assert [r["range"] for r in Flaky.seen] == ["bytes=4000-", "bytes=4000-"] and (tmp_path / "x.feather").read_bytes() == PAYLOAD


def test_a_server_that_is_briefly_unavailable_is_asked_again_and_a_refusal_is_not(tmp_path, flaky):
    fetch._partial(tmp_path / "x.feather", http_request(flaky)).write_bytes(PAYLOAD[:4000])
    Flaky.plan = ["unavailable", "range"]
    fetch._download(http_request(flaky), tmp_path / "x.feather", pause=0)
    assert [r["range"] for r in Flaky.seen] == ["bytes=4000-", "bytes=4000-"]
    (tmp_path / "x.feather").unlink()
    Flaky.plan = ["unavailable", "unavailable"]
    with pytest.raises(OSError):
        fetch._download(http_request(flaky), tmp_path / "x.feather", attempts=2, pause=0)


def test_a_partial_file_of_another_object_is_not_continued(tmp_path, flaky):
    size, md5 = declared(PAYLOAD)
    older = fetch.SourceRequest("x.feather", flaky, size, md5, "g6")
    fetch._partial(tmp_path / "x.feather", older).write_bytes(b"?" * 4000)
    fetch._download(http_request(flaky), tmp_path / "x.feather", pause=0)
    assert [r["range"] for r in Flaky.seen] == [None]
    assert (tmp_path / "x.feather").read_bytes() == PAYLOAD and list(tmp_path.glob("*.part")) == []
