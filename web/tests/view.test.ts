import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bitterLevel, CodecError, sipLevels, type Codec } from "../src/codec/codec";
import { audit, join, Registry } from "../src/honesty/honesty";
import { readCloud, type CloudInfo } from "../src/view/cloud";
import { light } from "../src/view/light";
import { Loop, PHASES, PHASE_SECONDS } from "../src/view/loop";
import { quantities, reactionCard } from "../src/view/reaction";
import { sipAt } from "../src/view/rotation";

const root = new URL("../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const codec: Codec = JSON.parse(read("contracts/codec/taste.codec.json").toString());
const info: CloudInfo = JSON.parse(read("data/built/web/brain.cloud.json").toString());

const STILL = { state: "still" } as const;

describe("the codec, read in the browser", () => {
  const fixture = JSON.parse(read("contracts/fixtures/codec/taste-codec-lookups.json").toString());

  it("agrees with the lab on every sip of the fixture", () => {
    expect(fixture.sips.length).toBe(7 * 4 * 5);
    for (const sip of fixture.sips) {
      const { tea, scoops, sweets, ...expected } = sip;
      expect(sipLevels(codec, tea, scoops, sweets)).toEqual(expected);
    }
  });

  it("refuses what the lab refuses", () => {
    for (const sip of fixture.refused) expect(() => sipLevels(codec, sip.tea, sip.scoops, sip.sweets)).toThrow(CodecError);
    expect(() => sipLevels(codec, "kannoshiro", 1.5, 0)).toThrow(CodecError);
  });
});

describe("the dark stage", () => {
  const index = new Map([["10", 0], ["20", 1], ["30", 2]]);
  const recording = { spikeStep: [0, 5, 5, 9, 18, 18], spikeBodyId: ["10", "10", "20", "99", "20", "30"] };

  it("gives no light without a recording, and none for a recording without spikes", () => {
    expect(Array.from(light(3, index, null, 1000, 100))).toEqual([0, 0, 0]);
    expect(Array.from(light(3, index, { spikeStep: [], spikeBodyId: [] }, 1000, 100))).toEqual([0, 0, 0]);
  });

  it("counts a neuron's spikes in the window that ends at the scrub position, and nothing else", () => {
    expect(Array.from(light(3, index, recording, 5, 5))).toEqual([1, 1, 0]);    // (0, 5]: the spike at 0 has left the window
    expect(Array.from(light(3, index, recording, 5, 6))).toEqual([2, 1, 0]);    // (-1, 5]
    expect(Array.from(light(3, index, recording, 18, 10))).toEqual([0, 1, 1]);  // (8, 18]; body 99 has no point and lights nothing
    expect(() => light(3, index, recording, NaN, 10)).toThrow(/no such moment/);   // not a number passes every comparison: it would light the whole recording
    expect(Array.from(light(3, index, recording, 4, 100))).toEqual([1, 0, 0]);  // the future is dark
  });
});

describe("the endless loop", () => {
  it("runs the six phases in order, forever, and counts sips", () => {
    const loop = new Loop();
    const seen: string[] = [];
    for (let i = 0; i < 13; i++) {
      seen.push(loop.state().phase);
      loop.tick(PHASE_SECONDS[loop.state().phase]);
    }
    expect(seen).toEqual([...PHASES, ...PHASES, "select"]);
    expect(loop.state().sipIndex).toBe(2);
  });

  it("crosses several phases in one long tick without losing time", () => {
    const loop = new Loop();
    const state = loop.tick(PHASE_SECONDS.select + PHASE_SECONDS.sift + 1);
    expect(state.phase).toBe("brew");
    expect(state.progress).toBeCloseTo(1 / PHASE_SECONDS.brew);
  });

  it("holds still while paused and continues from the same point", () => {
    const loop = new Loop();
    loop.tick(1);
    loop.pause();
    expect(loop.tick(100)).toEqual({ sipIndex: 0, phase: "select", progress: 1 / PHASE_SECONDS.select, phaseSeconds: PHASE_SECONDS.select, paused: true });
    loop.resume();
    expect(loop.tick(0.5).progress).toBeCloseTo(1.5 / PHASE_SECONDS.select);
    expect(loop.toggle()).toBe(true);
  });
});

describe("a loop whose tasting takes its time", () => {
  it("asks how long each phase of each sip lasts, and reports it", () => {
    const stays = [9, 12.5, 8];
    const loop = new Loop((sipIndex, phase) => (phase === "taste" ? stays[sipIndex] : PHASE_SECONDS[phase]));
    const lengths: number[] = [];
    for (let sip = 0; sip < 3; sip++) {
      for (const phase of PHASES) {
        const state = loop.state();
        expect(state).toMatchObject({ sipIndex: sip, phase });
        if (phase === "taste") lengths.push(state.phaseSeconds);
        loop.tick(state.phaseSeconds);
      }
    }
    expect(lengths).toEqual([9, 12.5, 8]);
    expect(() => new Loop(() => 0).state()).toThrow("must take time");
  });
});

describe("holding one moment", () => {
  it("jumps to a sip, a phase and a point in it, and refuses a moment that does not exist", () => {
    const loop = new Loop();
    loop.seek(11, "taste", 0.5);
    loop.pause();
    expect(loop.tick(3)).toEqual({ sipIndex: 11, phase: "taste", progress: 0.5, phaseSeconds: PHASE_SECONDS.taste, paused: true });
    loop.resume();
    expect(loop.tick(PHASE_SECONDS.taste / 2 + PHASE_SECONDS.clean).phase).toBe("select");
    expect(loop.state().sipIndex).toBe(12);
    for (const bad of [[-1, "taste", 0], [0, "nap", 0], [0, "taste", 1], [0.5, "taste", 0], [0, "taste", Number.NaN]] as const) {
      expect(() => loop.seek(bad[0], bad[1] as never, bad[2])).toThrow("no such moment");
    }
  });
});

describe("the rotation of sips", () => {
  it("visits every cell of the sweet-by-bitter grid once per cycle", () => {
    for (const cycle of [0, 1, 7]) {
      const cells = new Set<string>();
      for (let i = 0; i < 25; i++) {
        const sip = sipAt(codec, cycle * 25 + i);
        cells.add(`${sip.teaId ? bitterLevel(codec, sip.teaId, sip.scoops) : 0}/${sip.sweets}`);
      }
      expect(cells.size).toBe(25);
    }
  });

  it("is the same every time, serves hot water for bitter level 0, and gets round to every tea", () => {
    expect(sipAt(codec, 12)).toEqual(sipAt(codec, 12));
    expect(sipAt(codec, 0)).toEqual({ teaId: null, scoops: 0, sweets: 0 });
    const teas = new Set<string>();
    for (let i = 0; i < 25 * 6; i++) { const sip = sipAt(codec, i); if (sip.teaId) teas.add(sip.teaId); }
    expect(teas.size).toBe(codec.menu.teas.length);
  });
});

describe("honesty", () => {
  it("lets no derived quantity claim better than its worst input", () => {
    expect(join("connectome", "model")).toBe("model");
    expect(join("model", "staged", "connectome")).toBe("staged");
    const reg = new Registry().define({ id: "a", label: "", provenance: "staged", derivedFrom: [], explain: "" });
    expect(() => reg.define({ id: "b", label: "", provenance: "model", derivedFrom: ["a"], explain: "" })).toThrow();
    expect(() => reg.define({ id: "a", label: "", provenance: "staged", derivedFrom: [], explain: "" })).toThrow();
    expect(() => reg.q("nope", 1)).toThrow();
  });

  it("finds a number that reached the page without its tag, or with the wrong one", () => {
    const reg = quantities();
    expect(audit(reg.q("neurons.count", 34), reg)).toEqual([]);
    expect(audit('<span data-q="neurons.count">34</span>', reg)).toEqual(["neurons.count: no provenance"]);
    expect(audit('<span data-q="sip.level" data-prov="connectome">3</span>', reg)).toEqual(["sip.level: shown as connectome, defined as staged"]);
    expect(reg.q("voice.line", '<b>"hi"</b>')).toContain("&lt;b&gt;&quot;hi&quot;&lt;/b&gt;");
  });
});

describe("the reaction card with no recording", () => {
  const reg = quantities();

  it("claims no outcome and no feeling about taste, in any phase, for any sip of a cycle", () => {
    for (let i = 0; i < 25; i++) {
      for (const phase of PHASES) {
        const card = reactionCard(reg, codec, info, { sip: sipAt(codec, i), phase, phaseSeconds: 10, stay: { seconds: 10, why: "never", lastStep: null }, away: null, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL });
        const text = card.lines.map((l) => l.html).join(" ").replace(/title="[^"]*"/g, "");
        expect(text).not.toMatch(/drink|refus|extend|reach|bitter!|yum|delicious|disgust|likes|hates/i);
        expect(card.lines.map((l) => l.title)).toEqual(["Served", "Heard by", "Did", "In his words", "His legs", "The recordings"]);
        expect(card.lines.every((l) => l.tags.length > 0)).toBe(true);
        expect(audit(card.lines.map((l) => l.html).join(""), reg)).toEqual([]);
      }
    }
  });

  it("says why nothing is shown while he tastes, and stays silent in his own voice", () => {
    const card = reactionCard(reg, codec, info, { sip: sipAt(codec, 3), phase: "taste", phaseSeconds: 12, stay: { seconds: 12, why: "never", lastStep: null }, away: null, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL });
    expect(card.lines[2].html.replace(/<[^>]*>/g, "")).toMatch(/^His lips are not on the tea yet\. He stays 12 s, the least he ever does: in this recording MN9 never fires\./);
    expect(card.lines[3].html).toContain("(he says nothing)");
    expect(card.footnote).toBe("His words and his movements are puppetry: we move his legs. His motor neurons firing moves nothing here. The spikes are the model's, from recorded runs of his whole nervous system. No verdict has been licensed yet.");
  });

  it("counts the taste neurons from the dataset: 34 sweet, 38 bitter, 6 of them unlabelled", () => {
    const heard = reactionCard(reg, codec, info, { sip: sipAt(codec, 3), phase: "taste", phaseSeconds: 12, stay: { seconds: 12, why: "never", lastStep: null }, away: null, replayed: null, waiting: false, frozen: false, summary: null, verdict: null, bowl: 0, legs: STILL }).lines[1].html.replace(/<[^>]*>/g, "");
    expect(heard).toMatch(/^Once the tea is on his lips: 34 sweet taste neurons/);
    expect(heard).toMatch(/38 bitter/);
    expect(heard).toMatch(/6 of them, the whole type LB1b, with a transmitter the dataset calls unclear/);
  });
});

describe("the brain cloud file", () => {
  it("refuses a file that is not a cloud, or is cut short", () => {
    expect(() => readCloud(new ArrayBuffer(32))).toThrow("not a brain cloud");
    const real = read("data/built/web/brain.cloud");
    const copy = real.buffer.slice(real.byteOffset, real.byteOffset + real.byteLength - 8) as ArrayBuffer;
    expect(() => readCloud(copy)).toThrow("truncated");
  });

  it("reads the lab's tiny cloud exactly: five points, so the positions end off an eight-byte boundary", () => {
    const tiny = read("contracts/fixtures/cloud/tiny.cloud");
    const expected = JSON.parse(read("contracts/fixtures/cloud/tiny.cloud.expected.json").toString());
    const bytes = tiny.buffer.slice(tiny.byteOffset, tiny.byteOffset + tiny.byteLength) as ArrayBuffer;
    const cloud = readCloud(bytes);
    expect(cloud.n).toBe(5);
    expect(Array.from(cloud.bodyId, String)).toEqual(expected.bodyId);
    expect(Array.from(cloud.xyz)).toEqual(expected.xyz);
    expect(Array.from(cloud.group)).toEqual(expected.group);
    for (const version of [0, 2]) {
      const other = bytes.slice(0);
      new DataView(other).setUint32(8, version, true);
      expect(() => readCloud(other)).toThrow("not supported");
    }
    expect(() => readCloud(bytes.slice(0, bytes.byteLength - 8))).toThrow("truncated");
    const longer = new Uint8Array(bytes.byteLength + 8);
    longer.set(new Uint8Array(bytes));
    expect(() => readCloud(longer.buffer)).toThrow("trailing");
  });

  it.runIf(existsSync(new URL("data/built/web/brain.cloud", root)))("holds one point per neuron with a position, body IDs ascending, groups the companion names", () => {
    const file = read("data/built/web/brain.cloud");
    const cloud = readCloud(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer);
    expect(cloud.n).toBe(info.points);
    for (let i = 1; i < cloud.n; i++) if (cloud.bodyId[i] <= cloud.bodyId[i - 1]) throw new Error(`body IDs not ascending at ${i}`);
    expect(Math.max(...new Set(cloud.group))).toBeLessThan(info.groups.length);
    const counts = new Array(info.groups.length).fill(0);
    cloud.group.forEach((g) => (counts[g] += 1));
    expect(counts).toEqual(info.groups.map((g) => g.points));
  });
});
