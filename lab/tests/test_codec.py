"""The codec: the tea menu resolves to the five levels and nothing else."""

import json

import pytest

from flylab import CONTRACTS_DIR
from flylab.codec import build


CODEC = build.build_codec()


def test_the_committed_codec_and_its_fixture_regenerate_byte_for_byte(tmp_path):
    assert build.write_codec(tmp_path / "c.json").read_bytes() == build.CODEC_PATH.read_bytes()
    assert build.write_fixture(tmp_path).read_bytes() == (CONTRACTS_DIR / "fixtures" / "codec" / "taste-codec-lookups.json").read_bytes()


def test_levels_are_the_same_five_for_both_channels_and_thresholds_are_integers():
    for channel in CODEC["channels"]:
        assert [level["hz"] for level in channel["levels"]] == [0, 25, 50, 100, 200]
        assert [level["thr16"] for level in channel["levels"]] == [0, 163, 327, 655, 1310]


def test_every_tea_and_scoop_count_lands_on_an_existing_level_and_more_scoops_are_never_milder():
    for tea in CODEC["menu"]["teas"]:
        resolved = [build.bitter_level(CODEC, tea["id"], scoops) for scoops in range(CODEC["menu"]["maxScoops"] + 1)]
        assert resolved[0] == 0 and all(0 <= level <= 4 for level in resolved) and resolved == sorted(resolved)


def test_the_menu_reaches_every_bitter_level_so_the_rotation_can_cover_the_grid():
    reached = {build.bitter_level(CODEC, tea["id"], scoops) for tea in CODEC["menu"]["teas"] for scoops in range(4)}
    assert reached == {0, 1, 2, 3, 4}


def test_a_robust_tea_is_never_milder_than_a_smooth_one():
    for scoops in (1, 2, 3):
        assert build.bitter_level(CODEC, "taiwan-culinary", scoops) >= build.bitter_level(CODEC, "ogurayama", scoops) >= build.bitter_level(CODEC, "kannoshiro", scoops)


def test_tier_assignments_say_they_are_staged_and_levels_say_they_are_model():
    assert CODEC["menu"]["tag"] == "staged" and all(channel["tag"] == "model" for channel in CODEC["channels"])


@pytest.mark.parametrize("sip", [("no-such-tea", 1, 0), ("kannoshiro", 4, 0), ("kannoshiro", 1, 5), ("kannoshiro", -1, 0), ("kannoshiro", 1.5, 0)])
def test_a_sip_the_codec_cannot_express_is_refused(sip):
    with pytest.raises(build.CodecError):
        build.sip_levels(CODEC, *sip)


def test_the_decoder_has_no_thresholds_until_an_experiment_provides_them():
    decoder = CODEC["decoders"][0]
    assert decoder["extendAtLeast"] is None and decoder["refuseAtMost"] is None and decoder["evidence"] is None
