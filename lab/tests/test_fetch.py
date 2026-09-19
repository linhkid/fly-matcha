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
