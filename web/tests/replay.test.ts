// Replaying his whole brain. Every light on the page comes through here, so this is where rule 2 is held:
// each spike lands where that neuron is, or is counted as undrawable; no spikes, no light; and his brain sets his stay.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Codec } from "../src/codec/codec";
import { InputLayer, type Spikes } from "../src/engine/input";
import type { CloudInfo } from "../src/view/cloud";
import type { LoopState } from "../src/view/loop";
import { touchWindow } from "../src/view/puppet";
import { entryFor, Replay, replayAt, STAY_OVERHEAD, STAY_SECONDS, stayFor, staySecondsFor, type RecordingEntry, type RecordingIndex, type TrialRecording } from "../src/view/replay";

const root = new URL("../../", import.meta.url);
const options = { stepsPerSecond: 200, lightWindowSteps: 60, slowdown: 50 };
const cloudIndex = new Map([["100", 0], ["200", 1], ["300", 2], ["900", 3]]);   // 900 is MN9
const lipIndex = new Map([["1", 0], ["2", 1]]);
const recording: TrialRecording = {
  spec: { seed: 1, durationSteps: 3000 }, spikeHash: "h",
  spikeStep: [0, 0, 4, 18, 18, 30, 30, 61, 90, 90],
  spikeBodyId: ["1", "2", "1", "100", "777", "300", "1", "900", "100", "900"],   // 777 has no position anywhere
};
const replay = (): Replay => new Replay(recording, cloudIndex, lipIndex, new Set(["900"]));
const entry = (last: number | null): RecordingEntry => ({ file: "f", sweet: 1, bitter: 0, seed: 1, specSha256: "", spikeHash: "h", spikes: 0, neurons: 0, neuronsBeyondTaste: 0, readoutSpikes: last === null ? 0 : 1, readoutFirstStep: last, readoutLastStep: last });
const moment = (seconds: number, t: number, more: Partial<LoopState> = {}): LoopState => ({ sipIndex: 0, phase: "taste", progress: t / seconds, phaseSeconds: seconds, paused: false, ...more });

describe("a replay", () => {
  it("gives a place in the light only to neurons that fire and have a position", () => {
    expect(replay().participants).toEqual([0, 2, 3]);   // point 1 never fires; body 777 has no point
    expect(replay().readoutPlaces).toEqual([2]);         // MN9 is the third of them
    expect(new Replay({ ...recording, spikeStep: [0], spikeBodyId: ["1"] }, cloudIndex, lipIndex, new Set(["900"])).readoutPlaces).toEqual([]); // silent in this recording: no place
  });

  it("counts what has happened so far, and the spikes it cannot draw", () => {
    expect(replay().countsAt(-1)).toEqual({ tasteSpikes: 0, otherNeurons: 0, readoutSpikes: 0, undrawable: 0 });
    expect(replay().countsAt(18)).toEqual({ tasteSpikes: 3, otherNeurons: 2, readoutSpikes: 0, undrawable: 1 });
    expect(replay().countsAt(3000)).toEqual({ tasteSpikes: 4, otherNeurons: 4, readoutSpikes: 2, undrawable: 1 });
    const { tasteSpikes, readoutSpikes, undrawable } = replay().countsAt(3000);
    expect(tasteSpikes + undrawable + 5).toBe(recording.spikeStep.length);   // lips + nowhere + the five that land in the cloud
    expect(readoutSpikes).toBe(2);
  });

  it("lights a neuron by its own spikes in the window and nothing else", () => {
    expect(Array.from(replay().glowAt(30, 20).cloud)).toEqual([1, 1, 0]);   // (10, 30]: point 0 at 18, point 2 at 30
    expect(Array.from(replay().glowAt(30, 20).lips)).toEqual([1, 0]);
    expect(Array.from(replay().glowAt(90, 30).cloud)).toEqual([1, 0, 2]);   // (60, 90]: MN9 at 61 and at 90
    expect(Array.from(replay().glowAt(2000, 60).cloud)).toEqual([0, 0, 0]); // long after the last spike: dark
  });

  it("refuses a recording whose spikes are out of order", () => {
    expect(() => new Replay({ ...recording, spikeStep: [5, 4], spikeBodyId: ["1", "2"] }, cloudIndex, lipIndex, new Set())).toThrow("step order");
  });
});

describe("what is replayed at a moment of the ceremony", () => {
  const [from, to] = touchWindow(12);

  it("is nothing outside tasting, before his lips touch the tea, and while the recording has not arrived", () => {
    for (const [state, held] of [[moment(12, 6, { phase: "pour" }), replay()], [moment(12, from - 0.05), replay()], [moment(12, from + 1), null]] as const) {
      const out = replayAt(state, held, 2, true, options);
      expect(out.replayed).toBeNull();
      expect(out.cloud).toBeNull();
      expect(Array.from(out.lips)).toEqual([0, 0]);
    }
  });

  it("runs with the ceremony's clock, and only while his lips are on the tea", () => {
    const at = replayAt(moment(12, from + 0.1575), replay(), 2, true, options);  // 31 and a half steps in
    expect(at.replayed).toEqual({ seed: 1, steps: 31, slowdown: 50, touching: true, pilot: true, tasteSpikes: 4, otherNeurons: 3, readoutSpikes: 0, undrawable: 1 });
    expect(Array.from(at.cloud!)).toEqual([1, 1, 0]);
    const held = replayAt(moment(12, from + 0.1575, { paused: true }), replay(), 2, true, options);
    expect(held.replayed).toEqual({ ...at.replayed!, touching: false });
    expect(held.cloud).toBeNull();
    expect(Array.from(held.lips)).toEqual([0, 0]);
    const after = replayAt(moment(12, to + 1), replay(), 2, true, options);
    expect(after.replayed!.touching).toBe(false);
    expect(after.cloud).toBeNull();
    expect(after.replayed!.steps).toBe(Math.floor((to - from) * 200));           // it stopped where his lips left the tea
  });

  it("never runs past the end of the recording", () => {
    const long = touchWindow(20);
    const short: TrialRecording = { ...recording, spec: { seed: 1, durationSteps: 100 } };
    const out = replayAt(moment(20, long[1]), new Replay(short, cloudIndex, lipIndex, new Set(["900"])), 2, true, options);
    expect(out.replayed!.steps).toBe(99);
  });
});

describe("how long he stays with the cup", () => {
  it("is the shortest when MN9 never fires, the longest when it fires to the end, and his brain's in between", () => {
    expect(staySecondsFor(entry(null), 200)).toBe(STAY_SECONDS.least);
    expect(staySecondsFor(entry(40), 200)).toBe(STAY_SECONDS.least);               // fell silent early: still never rushed
    expect(staySecondsFor(entry(2990), 200)).toBe(STAY_SECONDS.most);
    expect(staySecondsFor(entry(1000), 200)).toBeCloseTo(1000 / 200 + STAY_SECONDS.breath + STAY_OVERHEAD, 9);
    expect(staySecondsFor(entry(1400), 200)).toBeGreaterThan(staySecondsFor(entry(1000), 200));
  });

  it("says why a stay is as long as it is", () => {
    expect(stayFor(entry(null), 200)).toEqual({ seconds: 8, why: "never", lastStep: null });
    expect(stayFor(entry(40), 200)).toEqual({ seconds: 8, why: "early", lastStep: 40 });
    expect(stayFor(entry(1000), 200).why).toBe("silent");
    expect(stayFor(entry(2990), 200)).toEqual({ seconds: 20, why: "longest", lastStep: 2990 });
  });

  it("leaves his lips on the tea until MN9's last spike and a breath longer", () => {
    const stay = staySecondsFor(entry(1000), 200);
    const [from, to] = touchWindow(stay);
    expect(to - from).toBeCloseTo(1000 / 200 + STAY_SECONDS.breath, 2);
    expect(STAY_OVERHEAD).toBeGreaterThan(5);
    expect(STAY_OVERHEAD).toBeLessThan(6);
  });
});

const recordingsDir = new URL("data/built/web/recordings/", root);
describe.runIf(existsSync(new URL("index.json", recordingsDir)))("the committed recordings", () => {
  const index: RecordingIndex = JSON.parse(readFileSync(new URL("index.json", recordingsDir), "utf8"));
  const codec: Codec = JSON.parse(readFileSync(new URL("contracts/codec/taste.codec.json", root), "utf8"));
  const info: CloudInfo = JSON.parse(readFileSync(new URL("data/built/web/brain.cloud.json", root), "utf8"));
  const load = (sweet: number, bitter: number): TrialRecording => JSON.parse(readFileSync(new URL(entryFor(index, sweet, bitter).file, recordingsDir), "utf8"));

  it("cover the whole grid, are marked as a pilot, and the sip with nothing in it is dark", () => {
    expect(index.pilot).toBe(true);
    // the rates on the card come from the bundled codec: they are the recordings' rates only if it is the same codec
    expect(createHash("sha256").update(readFileSync(new URL("contracts/codec/taste.codec.json", root))).digest("hex")).toBe(index.codecSha256);
    expect(index.dtMs).toBe(0.1);
    expect((STAY_SECONDS.most - STAY_OVERHEAD) * (1000 / index.dtMs / 50)).toBeLessThan(index.durationSteps);   // the longest stay never outruns a recording
    for (let sweet = 0; sweet < 5; sweet++) for (let bitter = 0; bitter < 5; bitter++) expect(entryFor(index, sweet, bitter).file).toBe(`s${sweet}-b${bitter}-seed1.json`);
    expect(() => entryFor(index, 5, 0)).toThrow("no recording");
    expect(load(0, 0).spikeStep).toEqual([]);
    const total = index.recordings.reduce((sum, r) => sum + readFileSync(new URL(r.file, recordingsDir)).byteLength, 0);
    expect(total).toBeLessThan(30e6);   // the slice's size limit for the bundle
  });

  it("hold every spike the browser's engine says the tea forces, for the same seed: one rule, two implementations", () => {
    const thr16 = (channel: string, level: number): number => codec.channels.find((c) => c.id === channel)!.levels[level].thr16;
    for (const [sweet, bitter] of [[4, 0], [2, 3]]) {
      const recorded = load(sweet, bitter);
      const forced: Spikes = { spikeStep: [], spikeBodyId: [] };
      new InputLayer(recorded.spec.seed, info.mouthparts.map((m) => ({ bodyId: m.bodyId, thr16: m.group === "grn.sweet" ? thr16("sweet", sweet) : thr16("bitter", bitter) })))
        .run(0, recorded.spec.durationSteps, forced);
      const taste = new Set(info.mouthparts.map((m) => m.bodyId));
      const held = new Set<string>();
      recorded.spikeStep.forEach((step, i) => { if (taste.has(recorded.spikeBodyId[i])) held.add(`${step}/${recorded.spikeBodyId[i]}`); });
      expect(forced.spikeStep.length).toBeGreaterThan(100);
      for (let i = 0; i < forced.spikeStep.length; i++) expect(held.has(`${forced.spikeStep[i]}/${forced.spikeBodyId[i]}`)).toBe(true);
      expect(held.size).toBeGreaterThanOrEqual(forced.spikeStep.length);   // his wiring may add spikes to a taste neuron; it never takes a forced one away
    }
  });

  it("let his brain set his stay: longest where MN9 keeps firing, shortest where bitter silences it", () => {
    const stay = (sweet: number, bitter: number): number => staySecondsFor(entryFor(index, sweet, bitter), 200);
    expect(stay(4, 0)).toBeGreaterThan(stay(0, 4));
    expect(stay(0, 4)).toBe(STAY_SECONDS.least);
    expect(stay(4, 4)).toBe(STAY_SECONDS.least);
    expect(stay(0, 0)).toBe(STAY_SECONDS.least);
  });
});
