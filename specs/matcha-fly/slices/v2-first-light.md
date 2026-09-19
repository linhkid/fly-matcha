# V2 · First light

**Question:** what does the whole brain do in the second after a sip, and can a person see it?

Needs V1 and slice 03. This is the moment the project stops being documents and tests.

**Built 2026-09-19.** Three things differ from the text below, and choices under "Slice V2" says why: a recording is 300 ms of his time, not a second, because that is what a stay of up to twenty seconds can show at fifty-fold slowdown; the scrubber is left for the slice that gives the player tools; and the neurons that fire in a recording are drawn as a layer of their own over the painted cloud, with MN9 larger, because rewriting 138,556 colours a frame is not needed to light a few thousand.

## Contract

Delivers real spikes in the living view: whole-brain recordings of every sip on the grid, replayed in slow motion in the endless loop. Pilot recordings, labelled as such, because the taste law has not been tested yet.

Does not deliver a verdict on any sip. Whether he "drinks" is slice 05's to license. Until then the view shows what was measured, the spikes of the two MN9 neurons, as a count and as light, and draws no conclusion from it.

## Seam

```
lab/flylab/web/recordings.py   record_grid(graph, lock, model, seeds) -> data/built/web/recordings/<sip>-<seed>.json + index.json
web/src/view/replay.ts         Replay(recording, cloud): position each spike on the cloud or on the mouthparts; count the rest
```

Each file is a `TrialRecording` as `contracts/TRIAL.md` defines it, written by `run_trial`. Nothing new is invented. The rates behind the five levels are the provisional ones of CONTRACTS.md's codec section: 0, 25, 50, 100 and 200 Hz. One seed per sip to begin with: 25 recordings.

A spike of a neuron with no position and no place on the mouthparts cannot be drawn. The view counts them and says so: "412 spikes came from neurons with no position to draw", through `<Q>`.

## What the human sees

The loop now tastes. He is offered the sip; the taste neurons on his lips flicker at the rate the sip sets; eighteen steps later light enters the brain, spreads through the relays, and reaches, or fails to reach, the two MN9 points, which are drawn larger. The second is replayed at one fiftieth of real speed, with the speed on screen and a scrubber when paused. A line under the scene: "pilot recording from the whole-brain run, seed 1. The taste law has not been tested yet."

## How long he stays with the cup

The user asked, while V1 was built, that tasting be deliberate and that "the time he spends on tasting/drinking can vary", because he should enjoy it. V1 staged that time from a list that ignores the tea, and said so. From this slice the tea stops being ignored:

- He keeps his lips on the tea while the replay of the sip's recording runs, and the replay runs to the last MN9 spike of the recording plus a short tail, within 8 to 20 seconds of wall time. A sip that keeps MN9 firing to the end of the trial keeps him at the cup longest; a sip that never reaches MN9 gets the shortest stay.
- The seconds are a staged mapping of a model quantity, so by the join rule they are tagged `staged`, and the MN9 numbers they come from stand beside them as `model`, `recorded`. `linger.seconds` gains `derivedFrom` in the registry. `LINGER_SECONDS` in `web/src/view/loop.ts` is deleted, not kept as a fallback.
- The cup still does not drain and the proboscis still does not move. Drinking is a verdict and slice 05 licenses it. From 05 on the proboscis is out, and the cup drains, only while MN9 fires in the replay.
- A pause during a replay holds the scrub position. He still takes his break and reads; the scrubber belongs to the player.
- The dots on his lips and the magnified lips in the panel are lit from the same `light()` output as the cloud. V1 wired `applyLipLight()` with zeros; the panel has no light path yet.

## Verification

- Every recording's `spikeHash` is reproduced by rerunning its spec in the lab.
- The light at a scrub position equals the spike counts in the stated window, for three hand-checked positions of one recording. Zero spikes, zero light.
- The count of undrawable spikes plus the drawn ones equals the recording's length.
- Size: the recordings bundle stays under 30 MB, or fewer seeds ship.
- A pilot trial is timed here and the number is written into slice 05's file, because slice 05's budget depends on it.
- The stay: for three recordings with hand-counted MN9 spikes, the seconds he stays are the ones the mapping gives; a recording with no MN9 spike gives the shortest stay; the cup level is 1 at every moment of every taste phase.
- **Visual variable: can a newcomer see the order in which things fired?** Crop: the scene during the taste phase, three frames. Then `screenshot-critique`, and `compare-screenshots` against V1's accepted shot, to judge whether light made the scene clearer or muddier.
- **Human checkpoint, non-blocking.**

## Honesty

This slice shows recordings before any experiment has passed, which rule 1 would forbid for a mechanic. It is allowed because nothing here claims an outcome: no "he drinks", no score, no puzzle. The moment slice 05 passes, the loop gains its verdicts; if slice 05 fails, the view stays as it is, with the failure explained beside it. Nothing about the model may be adjusted because of how this looks.

## Delegated

Glow colours, decay trail, point sizes, how the mouthparts strip is drawn, which seeds.

## Must stay green

`make check`. V1's dark-stage test.

## Feedback that would change this slice

Too much light to read: show only the taste circuit's groups by default, the rest on a toggle. The user wants to choose the sip already: that is slice 09's paused compose mode, which can move earlier because recordings of all 25 sips exist from here on.
